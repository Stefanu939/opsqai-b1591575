/**
 * Static catalog of integrations exposed in the admin hub.
 * Adding a new integration = one entry here + optional detail configuration.
 * Keeps the UI single-source-of-truth and prevents "coming soon" pages from
 * accumulating without owners.
 */
import type { ComponentType, SVGProps } from "react";
import {
  ShieldCheck, Building2, Users, MessageSquare, FolderTree, Cloud, KeyRound,
  Webhook, Boxes, FileText, Mail, CalendarDays, Code2,
} from "lucide-react";

export type IntegrationStatusHint = "live" | "beta" | "roadmap";

export type IntegrationCategory =
  | "identity"
  | "microsoft365"
  | "collaboration"
  | "storage"
  | "productivity"
  | "developer";

export type IntegrationDef = {
  provider: string;              // unique key, used as URL slug and DB provider
  name: string;
  vendor: string;                // Microsoft, Google, Slack, etc.
  category: IntegrationCategory;
  summary: string;               // one-liner used on the tile
  description: string;           // detail-page paragraph
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  accent: string;                // tailwind class for the icon tint
  hint: IntegrationStatusHint;
};

export const CATEGORY_LABEL: Record<IntegrationCategory, string> = {
  identity: "Identity & SSO",
  microsoft365: "Microsoft 365",
  collaboration: "Collaboration",
  storage: "Storage",
  productivity: "Productivity",
  developer: "Developer",
};

export const CATEGORY_ORDER: IntegrationCategory[] = [
  "identity", "microsoft365", "collaboration", "storage", "productivity", "developer",
];

export const INTEGRATIONS: IntegrationDef[] = [
  // Identity
  {
    provider: "microsoft-sso",
    name: "Microsoft SSO",
    vendor: "Microsoft Entra ID",
    category: "identity",
    summary: "Sign in with Azure AD / Microsoft 365 accounts.",
    description:
      "Enable single sign-on for your workforce via Microsoft Entra ID (Azure AD). Uses OAuth 2.0 with automatic tenant discovery. Recommended as the first integration for enterprise customers.",
    icon: ShieldCheck,
    accent: "text-sky-500 bg-sky-500/10 border-sky-500/20",
    hint: "live",
  },
  {
    provider: "google-workspace",
    name: "Google Workspace SSO",
    vendor: "Google",
    category: "identity",
    summary: "Sign in with Google Workspace accounts.",
    description:
      "Restrict access to a specific Google Workspace domain and let users sign in with their company Google account. Zero-config once your workspace domain is verified.",
    icon: KeyRound,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
    hint: "live",
  },
  {
    provider: "saml-sso",
    name: "SAML 2.0 SSO",
    vendor: "Okta, OneLogin, Ping, custom IdP",
    category: "identity",
    summary: "Enterprise SAML federation with any IdP.",
    description:
      "Bring your own SAML 2.0 identity provider. Supports Okta, OneLogin, Ping Identity, Azure AD SAML, and any spec-compliant IdP. Certificate-based trust, per-domain routing.",
    icon: Building2,
    accent: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
    hint: "live",
  },
  {
    provider: "scim",
    name: "SCIM Provisioning",
    vendor: "Any SCIM 2.0 IdP",
    category: "identity",
    summary: "Auto-provision & de-provision users from your IdP.",
    description:
      "Standard SCIM 2.0 endpoint so your IdP (Okta, Entra, JumpCloud) can create, update, and disable users automatically. Group-based role mapping.",
    icon: Users,
    accent: "text-violet-500 bg-violet-500/10 border-violet-500/20",
    hint: "roadmap",
  },

  // Microsoft 365
  {
    provider: "sharepoint",
    name: "SharePoint",
    vendor: "Microsoft 365",
    category: "microsoft365",
    summary: "Import documents & sync SharePoint libraries.",
    description:
      "Connect your SharePoint sites and document libraries. Import policies, SOPs, and knowledge base articles directly into OPSQAI with automatic re-indexing on change.",
    icon: FolderTree,
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
    hint: "live",
  },
  {
    provider: "teams",
    name: "Microsoft Teams",
    vendor: "Microsoft 365",
    category: "microsoft365",
    summary: "Notifications, mentions & channel posts.",
    description:
      "Send OPSQAI notifications (approvals, incidents, SOP updates) to Teams channels. Optional bot for @mention Q&A directly inside Teams.",
    icon: MessageSquare,
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
    hint: "live",
  },
  {
    provider: "onedrive",
    name: "OneDrive",
    vendor: "Microsoft 365",
    category: "microsoft365",
    summary: "Personal & shared drive document import.",
    description:
      "Sync selected OneDrive folders as knowledge sources. Handles Word, Excel, PowerPoint and PDF with automatic OCR.",
    icon: Cloud,
    accent: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
    hint: "beta",
  },
  {
    provider: "outlook",
    name: "Outlook",
    vendor: "Microsoft 365",
    category: "microsoft365",
    summary: "Turn emails into requests, log correspondence.",
    description:
      "Forward emails into OPSQAI as tracked requests. Attach threads to incidents and SOPs.",
    icon: Mail,
    accent: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    hint: "roadmap",
  },

  // Collaboration
  {
    provider: "slack",
    name: "Slack",
    vendor: "Slack",
    category: "collaboration",
    summary: "Post notifications & slash-command Q&A.",
    description:
      "Route OPSQAI events to Slack channels and let your team ask the AI directly from Slack using slash commands.",
    icon: MessageSquare,
    accent: "text-pink-500 bg-pink-500/10 border-pink-500/20",
    hint: "live",
  },
  {
    provider: "google-calendar",
    name: "Google Calendar",
    vendor: "Google Workspace",
    category: "collaboration",
    summary: "Sync trainings and compliance deadlines.",
    description:
      "Push Academy trainings, incident reviews, and audit deadlines to team calendars.",
    icon: CalendarDays,
    accent: "text-red-500 bg-red-500/10 border-red-500/20",
    hint: "roadmap",
  },

  // Storage
  {
    provider: "google-drive",
    name: "Google Drive",
    vendor: "Google Workspace",
    category: "storage",
    summary: "Import Docs, Sheets & Slides as knowledge.",
    description:
      "Connect Drive folders as knowledge sources. Native support for Docs, Sheets, Slides and PDFs.",
    icon: Cloud,
    accent: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    hint: "beta",
  },

  // Productivity
  {
    provider: "notion",
    name: "Notion",
    vendor: "Notion Labs",
    category: "productivity",
    summary: "Sync Notion pages & databases into knowledge.",
    description:
      "Import Notion pages and databases as living knowledge sources with automatic sync on change.",
    icon: FileText,
    accent: "text-neutral-400 bg-neutral-400/10 border-neutral-400/20",
    hint: "roadmap",
  },

  // Developer
  {
    provider: "webhooks",
    name: "Outbound Webhooks",
    vendor: "OPSQAI",
    category: "developer",
    summary: "Push events to any HTTPS endpoint (HMAC-signed).",
    description:
      "Subscribe your systems to OPSQAI events (chat.answered, incident.opened, sop.published, user.provisioned) with HMAC-SHA256 signatures and automatic retries.",
    icon: Webhook,
    accent: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    hint: "live",
  },
  {
    provider: "api",
    name: "Public REST API",
    vendor: "OPSQAI",
    category: "developer",
    summary: "OpenAPI 3.1 — build custom integrations.",
    description:
      "Programmatic access to chat, knowledge, users and audit logs. Scoped API keys, per-key rate limits, OpenAPI 3.1 spec.",
    icon: Code2,
    accent: "text-orange-500 bg-orange-500/10 border-orange-500/20",
    hint: "live",
  },
  {
    provider: "custom",
    name: "Custom Integration",
    vendor: "OPSQAI Solutions",
    category: "developer",
    summary: "Need something else? We build it.",
    description:
      "For SAP, Oracle, ServiceNow, legacy ERPs, or bespoke internal systems — our team scopes and delivers custom connectors.",
    icon: Boxes,
    accent: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
    hint: "roadmap",
  },
];

export function findIntegration(provider: string): IntegrationDef | undefined {
  return INTEGRATIONS.find((i) => i.provider === provider);
}
