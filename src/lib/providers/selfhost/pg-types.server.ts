// Per-pool node-postgres type parsers (Self-Hosted, server only).
//
// The `pg` type-parser registry is process-global, so a module that replaces a
// timestamp parser changes behaviour for every other repository. Passing this
// `types` object when constructing a Pool pins timestamp decoding for that
// pool regardless of global state.

import { types as pgTypes } from "pg";

const DATE_OIDS = new Set([
  1082, // date
  1114, // timestamp
  1184, // timestamptz
]);

type Parser = (value: string) => unknown;

export const pgDateTypes = {
  getTypeParser(oid: number, format?: unknown): Parser {
    if (DATE_OIDS.has(oid)) {
      return (value: string) => (value === null ? null : new Date(value));
    }
    return (pgTypes.getTypeParser as unknown as (o: number, f?: unknown) => Parser)(
      oid,
      format,
    );
  },
};
