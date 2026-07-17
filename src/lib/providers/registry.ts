// Provider registry.
//
// A single boot site (see `src/lib/platform/bootstrap.ts`) binds the
// active provider for each capability. Feature code resolves providers
// through `getProvider(...)`, never by direct import — that is what keeps
// Self-Hosted from pulling any Supabase module into its bundle.

import { Capability } from "@/lib/platform";
import type {
  IAuthProvider,
  IBackupService,
  IBrowserAuthProvider,
  ILicensingProvider,
  INotificationProvider,
  ISecretsCipher,
  IStorageProvider,
  ITelemetrySink,
  IUserRepository,
} from "./interfaces";

interface Registry {
  auth?: IAuthProvider;
  browserAuth?: IBrowserAuthProvider;
  users?: IUserRepository;
  storage?: IStorageProvider;
  notifications?: INotificationProvider;
  licensing?: ILicensingProvider;
  cipher?: ISecretsCipher;
  backup?: IBackupService;
  telemetry?: ITelemetrySink;
}

const registry: Registry = {};

export function registerAuthProvider(p: IAuthProvider): void {
  registry.auth = p;
}
export function registerBrowserAuthProvider(p: IBrowserAuthProvider): void {
  registry.browserAuth = p;
}
export function registerUserRepository(p: IUserRepository): void {
  registry.users = p;
}
export function registerStorageProvider(p: IStorageProvider): void {
  registry.storage = p;
}
export function registerNotificationProvider(p: INotificationProvider): void {
  registry.notifications = p;
}
export function registerLicensingProvider(p: ILicensingProvider): void {
  registry.licensing = p;
}
export function registerSecretsCipher(p: ISecretsCipher): void {
  registry.cipher = p;
}
export function registerBackupService(p: IBackupService): void {
  registry.backup = p;
}
export function registerTelemetrySink(p: ITelemetrySink): void {
  registry.telemetry = p;
}

function required<T>(value: T | undefined, capability: Capability): T {
  if (!value) {
    throw new Error(
      `No provider registered for capability "${capability}". ` +
        `Call the platform bootstrap before invoking feature code.`,
    );
  }
  return value;
}

export const getAuthProvider = (): IAuthProvider =>
  required(registry.auth, Capability.Authentication);
export const getBrowserAuthProvider = (): IBrowserAuthProvider =>
  required(registry.browserAuth, Capability.Authentication);
export const hasBrowserAuthProvider = (): boolean => Boolean(registry.browserAuth);
export const getUserRepository = (): IUserRepository =>
  required(registry.users, Capability.Authentication);
export const getStorageProvider = (): IStorageProvider =>
  required(registry.storage, Capability.Storage);
export const getNotificationProvider = (): INotificationProvider =>
  required(registry.notifications, Capability.SMTP);
export const getLicensingProvider = (): ILicensingProvider =>
  required(registry.licensing, Capability.Licensing);
export const getSecretsCipher = (): ISecretsCipher => {
  if (!registry.cipher) throw new Error("No secrets cipher registered");
  return registry.cipher;
};
export const getBackupService = (): IBackupService => {
  if (!registry.backup) throw new Error("No backup service registered");
  return registry.backup;
};
export const getTelemetrySink = (): ITelemetrySink =>
  required(registry.telemetry, Capability.Telemetry);

/** Test-only reset. */
export function __resetProviderRegistryForTests(): void {
  registry.auth = undefined;
  registry.browserAuth = undefined;
  registry.users = undefined;
  registry.storage = undefined;
  registry.notifications = undefined;
  registry.licensing = undefined;
  registry.cipher = undefined;
  registry.backup = undefined;
  registry.telemetry = undefined;
}
