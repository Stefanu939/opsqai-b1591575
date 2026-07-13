// Static mapping from seeded auth user UUIDs → display metadata for the
// Atlas Logistics demo tenant. Used across the demo UI so activity rows,
// chat threads and audit entries display consistent, believable names.

export type DemoPersona = {
  id: string;
  name: string;
  initials: string;
  position: string;
  department: string;
  role: "admin" | "manager" | "team_leader" | "employee";
};

export const DEMO_PERSONAS: Record<string, DemoPersona> = {
  "00000000-0000-0000-0000-0000000da001": {
    id: "00000000-0000-0000-0000-0000000da001",
    name: "Anna Weber",
    initials: "AW",
    position: "Warehouse Manager",
    department: "Inbound Operations",
    role: "admin",
  },
  "00000000-0000-0000-0000-0000000da002": {
    id: "00000000-0000-0000-0000-0000000da002",
    name: "Marco Rossi",
    initials: "MR",
    position: "Team Leader — Inbound",
    department: "Inbound Operations",
    role: "team_leader",
  },
  "00000000-0000-0000-0000-0000000da003": {
    id: "00000000-0000-0000-0000-0000000da003",
    name: "Laura Nagy",
    initials: "LN",
    position: "Team Leader — Outbound",
    department: "Outbound Operations",
    role: "team_leader",
  },
  "00000000-0000-0000-0000-0000000da004": {
    id: "00000000-0000-0000-0000-0000000da004",
    name: "Jonas Fischer",
    initials: "JF",
    position: "Safety Officer",
    department: "Safety & Quality",
    role: "manager",
  },
  "00000000-0000-0000-0000-0000000da005": {
    id: "00000000-0000-0000-0000-0000000da005",
    name: "Sofia Ionescu",
    initials: "SI",
    position: "Forklift Operator",
    department: "Fleet & Yard",
    role: "employee",
  },
};

export function personaFor(userId: string | null | undefined): DemoPersona | null {
  if (!userId) return null;
  return DEMO_PERSONAS[userId] ?? null;
}

export const DEMO_PERSONA_LIST: DemoPersona[] = Object.values(DEMO_PERSONAS);
