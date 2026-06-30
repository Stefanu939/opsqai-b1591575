// Shared OPSQAI brand tokens for every email template.
// Inline styles only (email-safe). Body background is always pure white per platform rule.

export const BRAND = {
  productName: "OPSQAI",
  tagline: "Operational Knowledge Intelligence",
  website: "https://opsqai.de",
  logoUrl: "https://opsqai.de/brand/logo-horizontal-light.svg",
  supportEmail: "support@opsqai.de",
  contactEmail: "info@opsqai.de",
  securityEmail: "security@opsqai.de",
  privacyEmail: "policy@opsqai.de",
  // Cohesive with the in-app design system
  colors: {
    primary: "#3a5bb8",
    primaryFg: "#ffffff",
    text: "#0f1729",
    muted: "#55607a",
    border: "#e4e7ec",
    surface: "#f7f8fa",
    accent: "#0e7d6f",
    bodyBg: "#ffffff",
  },
} as const;
