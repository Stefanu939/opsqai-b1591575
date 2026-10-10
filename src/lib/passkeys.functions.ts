// Fingerprint / face sign-in (WebAuthn passkeys) for Cloud staff & customers.
// Registration requires an existing session; login verifies the assertion
// server-side, then returns a one-time magic-link token the browser exchanges
// for a normal session. Challenges are single-use and expire after 5 minutes.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireAuth } from "@/lib/providers/require-auth";

function rp() {
  const req = getRequest();
  const origin = req?.headers.get("origin") ?? new URL(req!.url).origin;
  const host = new URL(origin).hostname;
  return { origin, rpID: host };
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function takeChallenge(id: string, kind: string) {
  const db = await admin();
  const { data } = await db.from("passkey_challenges").select("*").eq("id", id).eq("kind", kind).maybeSingle();
  await db.from("passkey_challenges").delete().eq("id", id);
  if (!data || new Date(data.expires_at).getTime() < Date.now()) throw new Error("Cererea a expirat. Încercați din nou.");
  return data;
}

export const startPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .handler(async ({ context }) => {
    if (process.env["OPSQAI_MODE"] === "selfhost") throw new Error("Indisponibil");
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const { rpID } = rp();
    const db = await admin();
    const email = String((context.claims as { email?: string })?.email ?? "user");
    const { data: existing } = await db.from("passkey_credentials").select("id, transports").eq("user_id", context.userId);
    const options = await generateRegistrationOptions({
      rpName: "OPSQAI",
      rpID,
      userName: email,
      attestationType: "none",
      excludeCredentials: (existing ?? []).map((c) => ({ id: c.id, transports: c.transports as never })),
      authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
    });
    const { data: ch } = await db
      .from("passkey_challenges")
      .insert({ challenge: options.challenge, user_id: context.userId, kind: "reg" })
      .select("id")
      .single();
    return { challengeId: ch!.id as string, options: JSON.parse(JSON.stringify(options)) };
  });

export const finishPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireAuth])
  .inputValidator((d: { challengeId: string; response: unknown; label?: string }) => d)
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
    const ch = await takeChallenge(data.challengeId, "reg");
    if (ch.user_id !== context.userId) throw new Error("Unauthorized");
    const { origin, rpID } = rp();
    const v = await verifyRegistrationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
    if (!v.verified || !v.registrationInfo) throw new Error("Amprenta nu a putut fi verificată.");
    const { credential } = v.registrationInfo;
    const { isoBase64URL } = await import("@simplewebauthn/server/helpers");
    const db = await admin();
    await db.from("passkey_credentials").upsert({
      id: credential.id,
      user_id: context.userId,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? [],
      device_label: data.label?.slice(0, 80) ?? null,
    });
    return { ok: true };
  });

export const startPasskeyLogin = createServerFn({ method: "POST" }).handler(async () => {
  if (process.env["OPSQAI_MODE"] === "selfhost") throw new Error("Indisponibil");
  const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
  const { rpID } = rp();
  const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
  const db = await admin();
  const { data: ch } = await db
    .from("passkey_challenges")
    .insert({ challenge: options.challenge, kind: "auth" })
    .select("id")
    .single();
  return { challengeId: ch!.id as string, options: JSON.parse(JSON.stringify(options)) };
});

export const finishPasskeyLogin = createServerFn({ method: "POST" })
  .inputValidator((d: { challengeId: string; response: { id: string } & Record<string, unknown> }) => d)
  .handler(async ({ data }) => {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
    const { isoBase64URL } = await import("@simplewebauthn/server/helpers");
    const ch = await takeChallenge(data.challengeId, "auth");
    const db = await admin();
    const { data: cred } = await db.from("passkey_credentials").select("*").eq("id", String(data.response.id)).maybeSingle();
    if (!cred) throw new Error("Amprenta nu este înregistrată pentru niciun cont.");
    const { origin, rpID } = rp();
    const v = await verifyAuthenticationResponse({
      response: data.response as never,
      expectedChallenge: ch.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: cred.id,
        publicKey: isoBase64URL.toBuffer(cred.public_key),
        counter: Number(cred.counter),
        transports: cred.transports as never,
      },
    });
    if (!v.verified) throw new Error("Amprenta nu a putut fi verificată.");
    await db
      .from("passkey_credentials")
      .update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() })
      .eq("id", cred.id);
    const { data: u } = await db.auth.admin.getUserById(cred.user_id);
    const email = u?.user?.email;
    if (!email) throw new Error("Cont indisponibil.");
    const { data: link, error } = await db.auth.admin.generateLink({ type: "magiclink", email });
    if (error || !link?.properties?.hashed_token) throw new Error("Nu am putut crea sesiunea.");
    return { tokenHash: link.properties.hashed_token };
  });
