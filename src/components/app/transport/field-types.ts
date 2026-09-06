// Shared form/table descriptors for the Transport registers.

export type FieldKind =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "textarea"
  | "select";

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  placeholder?: string;
  /** Half-width in the two-column form grid (default) or full width. */
  full?: boolean;
}

export interface ColumnDef<T> {
  key: string;
  label: string;
  render?: (row: T) => React.ReactNode;
}
