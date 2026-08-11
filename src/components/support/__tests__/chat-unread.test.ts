// Chat bubble unread logic (Phase 6). The badge total must exclude only the
// conversation that is open and visible, and cap its label at 9+.

import { describe, it, expect } from "vitest";

type Conv = { id: string; unread_count: number };

/** Same reduction the ChatGlider launcher uses. */
export function unreadTotal(convs: Conv[], suppressed: string | null) {
  return convs.reduce((n, c) => n + (c.id === suppressed ? 0 : (c.unread_count ?? 0)), 0);
}

export function badgeLabel(total: number) {
  return total > 9 ? "9+" : String(total);
}

const convs: Conv[] = [
  { id: "a", unread_count: 2 },
  { id: "b", unread_count: 3 },
  { id: "c", unread_count: 0 },
];

describe("chat bubble unread total", () => {
  it("sums unread across conversations when the panel is closed", () => {
    expect(unreadTotal(convs, null)).toBe(5);
  });

  it("suppresses only the conversation currently open", () => {
    expect(unreadTotal(convs, "a")).toBe(3);
    expect(unreadTotal(convs, "b")).toBe(2);
  });

  it("keeps other threads visible while one thread is open", () => {
    expect(unreadTotal(convs, "c")).toBe(5);
  });

  it("caps the badge label at 9+", () => {
    expect(badgeLabel(0)).toBe("0");
    expect(badgeLabel(9)).toBe("9");
    expect(badgeLabel(10)).toBe("9+");
    expect(badgeLabel(147)).toBe("9+");
  });
});
