## Problem

`opsqai-windows/services/bootstrap/migrate.mjs` presupune că baza `opsqai` există. `OpsqaiDatabase` face doar `initdb` (cluster + rol `opsqai` + DB de sistem `postgres`), nu creează niciodată DB-ul aplicației. La primul boot:

```
FATAL: database "opsqai" does not exist
```

## Fix

Adaugă în `migrate.mjs`, înainte de bucla de migrații, un pas idempotent și race-safe care garantează existența DB-ului `opsqai`. Race-safety prin **re-check după CREATE**. Stil consistent cu restul modulului (`fail()`, fără throw). Validare explicită a `PGDATABASE`, mesaje de eroare care includ mereu host/port, logging de producție minimal.

### Locul modificării

`opsqai-windows/services/bootstrap/migrate.mjs`, între construirea `env` și bucla `for (const file of files)`.

### Algoritm

1. Validează `PGDATABASE`.
2. Sanity check pe `postgres`.
3. Check existență target.
4. Lipsește → CREATE DATABASE.
5. CREATE eșuează → re-check:
   - re-check însuși eșuează → `fail()` cu ambele erori (dublă eroare).
   - re-check spune că există → race câștigat de alt bootstrap, continuăm (fără log zgomotos).
   - re-check spune că nu există → `fail()` cu eroarea originală de la CREATE.
6. Log final unic `database "<name>" ready`.

### Implementare

```js
// Embedded PostgreSQL initializes only the cluster and the "postgres"
// database. The application database is created lazily here before
// running migrations. Safe to execute on every bootstrap.

function psqlRun(env, args, opts = {}) {
  return spawnSync(psql, ["-v", "ON_ERROR_STOP=1", ...args], {
    env,
    encoding: "utf8",
    windowsHide: true,
    ...opts,
  });
}

// Pur, fără throw. Erorile sunt raportate prin obiect-rezultat.
function databaseExists(adminEnv, name) {
  const r = psqlRun(adminEnv, [
    "--set", `name=${name}`,
    "-tAc", "SELECT 1 FROM pg_database WHERE datname = :'name'",
  ]);
  return {
    ok: r.status === 0,
    exists: r.stdout.trim() === "1",
    status: r.status,
    stderr: r.stderr || "",
  };
}

function endpointOf(env) {
  return `${env.PGUSER}@${env.PGHOST}:${env.PGPORT}`;
}

function ensureDatabaseExists(env) {
  const target = env.PGDATABASE;

  // (0) Validează configurarea — fără asta CREATE DATABASE "" ar trece
  //     de checks și ar produce un diagnostic complet neutil.
  if (!target) {
    fail("PGDATABASE is not configured", 1);
  }

  const adminEnv = { ...env, PGDATABASE: "postgres" };
  const at = endpointOf(env);

  // (1) Sanity check pe DB-ul de sistem.
  const ping = psqlRun(adminEnv, ["-tAc", "SELECT 1"]);
  if (ping.status !== 0) {
    fail(
      `cannot connect to system database "postgres" as ${at}: ${ping.stderr}`,
      ping.status || 1,
    );
  }

  // (2) Check.
  const first = databaseExists(adminEnv, target);
  if (!first.ok) {
    fail(
      `pg_database lookup for "${target}" failed on ${at} (exit ${first.status}): ${first.stderr || "(no stderr)"}`,
      first.status || 1,
    );
  }
  if (first.exists) {
    console.log(`[migrate] database "${target}" ready`);
    return;
  }

  // (3) CREATE. Identificatori via format('%I') pe server.
  console.log(`[migrate] creating database "${target}"`);
  const create = psqlRun(adminEnv, [
    "--set", `name=${target}`,
    "--set", `owner=${env.PGUSER}`,
    "-c",
    "SELECT format('CREATE DATABASE %I OWNER %I ENCODING ''UTF8'' TEMPLATE template0', :'name', :'owner') \\gexec",
  ]);

  // (4) Race-safe re-check. Menținem SELECT / CREATE / SELECT tocmai
  //     pentru a NU depinde de textul mesajului sau de SQLSTATE.
  if (create.status !== 0) {
    const second = databaseExists(adminEnv, target);

    // Dublă eroare: CREATE a picat ȘI nu putem verifica starea reală.
    if (!second.ok) {
      fail(
        `CREATE DATABASE "${target}" failed on ${at} and existence could not be re-verified. ` +
          `CREATE (exit ${create.status}): ${create.stderr || "(no stderr)"} | ` +
          `re-check (exit ${second.status}): ${second.stderr || "(no stderr)"}`,
        second.status || create.status || 1,
      );
    }

    if (second.exists) {
      // Race câștigat de alt bootstrap. Nu logăm zgomotos în producție —
      // rezultatul final e același: baza e gata.
      console.log(`[migrate] database "${target}" ready`);
      return;
    }

    fail(
      `CREATE DATABASE "${target}" failed while connected to "postgres" as ${at} (exit ${create.status}): ${create.stderr || "(no stderr)"}`,
      create.status || 1,
    );
  }

  console.log(`[migrate] database "${target}" ready`);
}
```

Apel:
```js
const env = { ...process.env, ...databaseEnv(), ON_ERROR_STOP: "1" };
ensureDatabaseExists(env);
console.log(`[migrate] applying ${files.length} migrations from ${migrationsDir}`);
```

### De ce merge pe embedded și pe external

- **Embedded**: `PGUSER=opsqai` e superuser (via `initdb -U opsqai`) → poate `CREATE DATABASE`.
- **External**: dacă DBA-ul a pre-creat DB-ul, ramura `ready` iese silent. Altfel `CREATE DATABASE` reușește dacă rolul are `CREATEDB` — documentat în admin-guide.

### Robustețe

- `PGDATABASE` validat înainte de orice comandă.
- Query-uri parametrizate → fără SQL injection.
- Re-check după CREATE → race-safe, independent de versiune psql / localizare / SQLSTATE.
- `databaseExists()` întoarce obiect-rezultat → consistent cu `fail()`, fără try/catch.
- Trei ramuri de diagnostic distincte după CREATE eșuat: dublă eroare, race, eroare originală.
- Toate mesajele de eroare includ `user@host:port` — trasabilitate uniformă.
- Log de producție minim și consistent cu stilul `postgres ready` / `config ready`.

## Despre readiness `initdb` vs `pg_isready`

În `services/database/index.js`, `initdb` rulează sincron (`spawnSync`) **înainte** de `pg_ctl start -w`. Când `bootstrap/init.js` sondează portul, cluster-ul, rolul `opsqai` și DB-ul `postgres` sunt garantat gata. Gap-ul real e doar DB-ul aplicației, acoperit de fix.

## Fișiere modificate

- `opsqai-windows/services/bootstrap/migrate.mjs` — helpers `psqlRun` / `databaseExists` / `endpointOf`, funcția `ensureDatabaseExists` + apel + comentarii.

## Test manual

Primul boot:
```
[migrate] creating database "opsqai"
[migrate] database "opsqai" ready
[migrate] applying N migrations from ...
[migrate] complete
```
Re-run:
```
[migrate] database "opsqai" ready
[migrate] applying N migrations from ...
[migrate] complete
```

## Neafectate

Cloud / MC / TanStack app, schema DB, RLS, GRANTs, `OpsqaiDatabase` service, `ensure-config.js`, `pg_hba.conf` — toate nemodificate.
