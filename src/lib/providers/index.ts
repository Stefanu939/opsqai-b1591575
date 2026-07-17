// Public barrel for platform-agnostic provider primitives.
//
// IMPORTANT: This file only exports interfaces, the registry, and null
// providers. Concrete implementations live under `./selfhost/` and
// `./cloud/` and are ONLY imported by their respective bootstrap
// modules. Feature code must depend on the interfaces here, never on a
// specific implementation.

export * from "./interfaces";
export * from "./registry";
export {
  NullCipher,
  NoopBackupService,
  NoopTelemetrySink,
} from "./null-providers";
