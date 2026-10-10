// Browser Credential Management API: lets the phone/laptop password manager
// fill the sign-in after a fingerprint / face check. No credentials stored by us.
type PwCred = { id: string; password?: string };

export function savedCredentialsSupported(): boolean {
  return typeof window !== "undefined" && "PasswordCredential" in window && !!navigator.credentials;
}

export async function getSavedCredential(): Promise<{ email: string; password: string } | null> {
  if (!savedCredentialsSupported()) return null;
  try {
    const c = (await navigator.credentials.get({
      password: true,
      mediation: "required",
    } as CredentialRequestOptions)) as PwCred | null;
    if (!c?.password) return null;
    return { email: c.id, password: c.password };
  } catch {
    return null;
  }
}

export async function storeCredential(email: string, password: string): Promise<void> {
  if (!savedCredentialsSupported()) return;
  try {
    const Ctor = (window as unknown as { PasswordCredential: new (d: { id: string; password: string }) => Credential })
      .PasswordCredential;
    await navigator.credentials.store(new Ctor({ id: email, password }));
  } catch {
    /* user declined or unsupported */
  }
}
