// Loose UUID validator.
//
// Zod v4's `.uuid()` enforces RFC 9562 version/variant nibbles. Several
// well-known OPSQAI identifiers are deliberately non-RFC sentinel UUIDs
// (e.g. the demo tenant `00000000-0000-0000-0000-0000000d3110`), which the
// strict validator rejects. Postgres `uuid` accepts any 32 hex digits, so we
// validate the same shape here.

import { z } from "zod";

const UUID_SHAPE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const uuidString = () => z.string().regex(UUID_SHAPE, "Invalid UUID");

export function isUuidString(value: string): boolean {
  return UUID_SHAPE.test(value);
}
