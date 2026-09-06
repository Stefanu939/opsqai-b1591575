// Transport Operations board: an airy fleet overview — four headline numbers,
// the maintenance queue, who drives today (and who is off) and fuel by route.
// Quick-add buttons open the same register forms used elsewhere.
import { useMemo, useState } from "react";
import { Fuel, Plus, Truck, UsersRound, Wrench } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { StatCard } from "@/components/ui/stat-card";
import type { transportUi } from "@/i18n/pages/transport";
import type { DutyDay, FuelEntry, TransportOverview } from "@/lib/transport/types";
import { RecordDialog } from "./record-dialog";
import {
  driverFields,
  dutyFields,
  fuelFields,
  vehicleFields,
  type RegisterName,
} from "./registers";
import { useRecordMutations } from "./use-transport";

type Ui = ReturnType<typeof transportUi>;

const LEVEL_VARIANT: Record<string, "destructive" | "secondary" | "outline"> = {
  expired: "destructive",
  critical: "destructive",
  warning: "secondary",
  watch: "outline",
};

function today(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function money(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

function dutyLabel(t: Ui, kind: DutyDay["duty_kind"]): string {
  if (kind === "work") return t.dutyWork;
  if (kind === "off") return t.dutyOff;
  if (kind === "leave") return t.dutyLeave;
  if (kind === "sick") return t.dutySick;
  if (kind === "training") return t.dutyTraining;
  return t.dutyStandby;
}

function fuelStats(entries: FuelEntry[], periodDays: number) {
  const cut = new Date();
  cut.setDate(cut.getDate() - periodDays);
  const cutIso = cut.toISOString().slice(0, 10);
  const current = entries.filter((e) => e.entry_date >= cutIso);
  const previous = entries.filter((e) => e.entry_date < cutIso);
  const sum = (rows: FuelEntry[], key: "cost" | "distance_km" | "litres") =>
    rows.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
  const perKm = (rows: FuelEntry[]) => {
    const km = sum(rows, "distance_km");
    return km > 0 ? sum(rows, "cost") / km : null;
  };
  return {
    currency: current[0]?.currency ?? previous[0]?.currency ?? "EUR",
    spend: sum(current, "cost"),
    litres: sum(current, "litres"),
    perKm: perKm(current),
    prevPerKm: perKm(previous),
    current,
  };
}

export function FleetBoard({
  t,
  data,
  lang,
  periodDays,
}: {
  t: Ui;
  data: TransportOverview;
  lang: "en" | "de" | "ro";
  periodDays: number;
}) {
  const { saveRecord } = useRecordMutations();
  const [dialog, setDialog] = useState<RegisterName | null>(null);
  const canCreate = data.grants.includes("create");

  const day = today();
  const vehicleOpts = data.vehicles.map((v) => ({ value: v.id, label: v.plate }));
  const driverOpts = data.drivers.map((d) => ({ value: d.id, label: d.full_name }));

  const inService = data.vehicles.filter((v) => v.status === "active").length;
  const maintenance = data.alerts.filter((a) => a.ownerKind === "vehicle");
  const overdue = maintenance.filter((a) => a.level === "expired").length;

  const dutyToday = useMemo(
    () => data.duty.filter((d) => d.duty_date.slice(0, 10) === day),
    [data.duty, day],
  );
  const working = dutyToday.filter(
    (d) => d.duty_kind === "work" || d.duty_kind === "standby",
  );
  const off = dutyToday.filter(
    (d) => d.duty_kind !== "work" && d.duty_kind !== "standby",
  );
  const planned = new Set(dutyToday.map((d) => d.driver_id));
  const unplanned = data.drivers.filter(
    (d) => d.status === "active" && !planned.has(d.id),
  );

  const fuel = useMemo(() => fuelStats(data.fuel, periodDays), [data.fuel, periodDays]);

  const byRoute = useMemo(() => {
    const map = new Map<string, number>();
    for (const e of fuel.current) {
      const key = e.route?.trim() || e.vehicle_plate || "—";
      map.set(key, (map.get(key) ?? 0) + (Number(e.cost) || 0));
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [fuel.current]);
  const routeMax = byRoute[0]?.[1] ?? 0;

  const perKmHint = (() => {
    if (fuel.perKm == null) return t.noFuel;
    if (fuel.prevPerKm == null) return `${money(fuel.spend, fuel.currency)} · ${periodDays}d`;
    const delta = fuel.perKm - fuel.prevPerKm;
    const sign = delta > 0 ? "+" : "";
    return `${sign}${money(delta, fuel.currency)} ${t.vsPrevious}`;
  })();

  const dialogFields = (name: RegisterName) => {
    if (name === "vehicles") return vehicleFields(t, driverOpts);
    if (name === "drivers") return driverFields(t, vehicleOpts);
    if (name === "fuel") return fuelFields(t, vehicleOpts, driverOpts);
    return dutyFields(t, driverOpts, vehicleOpts, lang);
  };
  const dialogTitle = (name: RegisterName) => {
    if (name === "vehicles") return t.vehicleRegister;
    if (name === "drivers") return t.driverRegister;
    if (name === "fuel") return t.fuelRegister;
    return t.dutyRegister;
  };
  const initialValues = (name: RegisterName) =>
    name === "fuel"
      ? { entry_date: day, currency: "EUR" }
      : name === "duty"
        ? { duty_date: day, duty_kind: "work" }
        : {};

  return (
    <div className="grid gap-4">
      <Panel
        icon={Truck}
        title={t.operationsBoard}
        description={`${inService} ${t.ofVehicles} ${data.vehicles.length} ${t.inService}.`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date().toLocaleDateString(lang, {
                weekday: "long",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            {canCreate ? (
              <>
                <Button size="sm" variant="outline" onClick={() => setDialog("vehicles")}>
                  <Plus className="mr-1.5 size-3.5" />
                  {t.vehicle}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog("drivers")}>
                  <Plus className="mr-1.5 size-3.5" />
                  {t.driver}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setDialog("duty")}>
                  <Plus className="mr-1.5 size-3.5" />
                  {t.dutyKind}
                </Button>
                <Button size="sm" onClick={() => setDialog("fuel")}>
                  <Plus className="mr-1.5 size-3.5" />
                  {t.fuelRegister}
                </Button>
              </>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={Truck}
            label={t.vehiclesInService}
            value={String(data.vehicles.length)}
            hint={`${inService} ${t.inService}`}
          />
          <StatCard
            icon={UsersRound}
            label={t.driversToday}
            value={String(working.length)}
            hint={`${off.length} ${t.offToday}`}
          />
          <StatCard
            icon={Fuel}
            label={t.fuelCostPerKm}
            value={fuel.perKm == null ? "—" : money(fuel.perKm, fuel.currency)}
            hint={perKmHint}
          />
          <StatCard
            icon={Wrench}
            label={t.maintenanceDue}
            value={String(maintenance.length)}
            hint={`${overdue} ${t.overdueCount}`}
          />
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel
          icon={Wrench}
          title={t.maintenanceQueue}
          description={t.expiringBody}
          className="lg:col-span-2"
        >
          {maintenance.length === 0 ? (
            <EmptyState title={t.none} description={t.expiringBody} />
          ) : (
            <ul className="divide-y divide-border">
              {maintenance.slice(0, 12).map((a) => (
                <li
                  key={a.documentId}
                  className="flex flex-wrap items-center justify-between gap-2 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{a.ownerLabel}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.docLabel} · {a.expiresOn}
                    </p>
                  </div>
                  <Badge variant={LEVEL_VARIANT[a.level] ?? "outline"}>
                    {a.level === "expired"
                      ? t.expired
                      : `${a.daysLeft} ${t.daysLeft}`}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="grid gap-4">
          <Panel icon={UsersRound} title={t.driversToday}>
            {dutyToday.length === 0 && unplanned.length === 0 ? (
              <EmptyState title={t.noDutyPlan} description={t.dutyRegisterBody} />
            ) : (
              <ul className="divide-y divide-border">
                {[...working, ...off].map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium">{d.driver_name ?? "—"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[d.route, d.vehicle_plate, d.shift_start?.slice(0, 5)]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                    </div>
                    <span
                      className={
                        d.duty_kind === "work" || d.duty_kind === "standby"
                          ? "text-xs text-[color:var(--success)]"
                          : "text-xs text-muted-foreground"
                      }
                    >
                      {dutyLabel(t, d.duty_kind)}
                    </span>
                  </li>
                ))}
                {unplanned.slice(0, 5).map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span className="truncate">{d.full_name}</span>
                    <span className="text-xs text-muted-foreground">{t.unassigned}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel icon={Fuel} title={t.fuelByRoute}>
            {byRoute.length === 0 ? (
              <EmptyState title={t.noFuel} description={t.fuelRegisterBody} />
            ) : (
              <ul className="space-y-2.5">
                {byRoute.map(([route, cost]) => (
                  <li key={route}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{route}</span>
                      <span className="font-medium tabular-nums">
                        {money(cost, fuel.currency)}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-muted">
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{
                          width: `${routeMax > 0 ? Math.max(6, (cost / routeMax) * 100) : 0}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      {dialog ? (
        <RecordDialog
          open
          onOpenChange={(o) => !o && setDialog(null)}
          title={dialogTitle(dialog)}
          fields={dialogFields(dialog)}
          initial={initialValues(dialog)}
          labels={{ save: t.save, cancel: t.cancel }}
          onSave={(values) =>
            saveRecord.mutateAsync({ register: dialog, values })
          }
        />
      ) : null}
    </div>
  );
}
