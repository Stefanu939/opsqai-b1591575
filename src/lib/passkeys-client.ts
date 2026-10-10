// Browser side of fingerprint sign-in. Remembers locally that this device has
// a passkey so the sign-in screen can show the fingerprint button.
import { startAuthentication, startRegistration, browserSupportsWebAuthn } from "@simplewebauthn/browser";
import {
  finishPasskeyLogin,
  finishPasskeyRegistration,
  startPasskeyLogin,
  startPasskeyRegistration,
} from "@/lib/passkeys.functions";

const FLAG = "opsqai.passkey.enrolled";
const DECLINED = "opsqai.passkey.declined";

export async function passkeysAvailable(): Promise<boolean> {
  if (typeof window === "undefined" || !browserSupportsWebAuthn()) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}
export const deviceHasPasskey = () => localStorage.getItem(FLAG) === "1";
export const passkeyDeclined = () => localStorage.getItem(DECLINED) === "1";
export const declinePasskey = () => localStorage.setItem(DECLINED, "1");

export async function enrollPasskey(): Promise<void> {
  const { challengeId, options } = await startPasskeyRegistration();
  const response = await startRegistration({ optionsJSON: options });
  await finishPasskeyRegistration({ data: { challengeId, response, label: navigator.userAgent } });
  localStorage.setItem(FLAG, "1");
  localStorage.removeItem(DECLINED);
}

export async function signInWithPasskey(): Promise<void> {
  const { challengeId, options } = await startPasskeyLogin();
  const response = await startAuthentication({ optionsJSON: options });
  const { tokenHash } = await finishPasskeyLogin({ data: { challengeId, response: response as never } });
  const { supabase } = await import("@/integrations/supabase/client");
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) throw error;
  localStorage.setItem(FLAG, "1");
}
