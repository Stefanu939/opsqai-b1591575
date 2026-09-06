// Field and column descriptors for every Transport register.
import type { FieldDef } from "./field-types";
import { countryPack } from "@/lib/transport/country-packs";
import type { transportUi } from "@/i18n/pages/transport";

export type RegisterName =
  | "vehicles"
  | "drivers"
  | "carriers"
  | "documents"
  | "incidents"
  | "requests"
  | "zones";

type Ui = ReturnType<typeof transportUi>;
type Opt = { value: string; label: string };

const STATUS = (): Opt[] => [
  { value: "active", label: "Active" },
  { value: "attention", label: "Attention" },
  { value: "blocked", label: "Blocked" },
  { value: "inactive", label: "Inactive" },
];

export function vehicleFields(t: Ui, drivers: Opt[]): FieldDef[] {
  return [
    { key: "plate", label: t.plate, kind: "text", required: true },
    {
      key: "kind",
      label: t.kind,
      kind: "select",
      options: [
        { value: "truck", label: "Truck" },
        { value: "van", label: "Van" },
        { value: "trailer", label: "Trailer" },
        { value: "car", label: "Car" },
      ],
    },
    { key: "make", label: t.make, kind: "text" },
    { key: "model", label: t.model, kind: "text" },
    { key: "vin", label: t.vin, kind: "text" },
    {
      key: "ownership",
      label: t.ownership,
      kind: "select",
      options: [
        { value: "owned", label: "Owned" },
        { value: "leased", label: "Leased" },
        { value: "rented", label: "Rented" },
        { value: "subcontracted", label: "Subcontracted" },
      ],
    },
    { key: "odometer_km", label: t.odometer, kind: "number" },
    { key: "base_location", label: t.baseLocation, kind: "text" },
    { key: "latitude", label: t.latitude, kind: "number" },
    { key: "longitude", label: t.longitude, kind: "number" },
    { key: "assigned_driver_id", label: t.driver, kind: "select", options: drivers },
    { key: "status", label: t.status, kind: "select", options: STATUS() },
    { key: "notes", label: t.notes, kind: "textarea" },
  ];
}

export function driverFields(t: Ui, vehicles: Opt[]): FieldDef[] {
  return [
    { key: "full_name", label: t.fullName, kind: "text", required: true },
    { key: "phone", label: t.phone, kind: "text" },
    { key: "email", label: t.email, kind: "text" },
    { key: "licence_number", label: t.licenceNumber, kind: "text" },
    { key: "licence_categories", label: t.licenceCategories, kind: "text" },
    { key: "base_location", label: t.baseLocation, kind: "text" },
    { key: "latitude", label: t.latitude, kind: "number" },
    { key: "longitude", label: t.longitude, kind: "number" },
    { key: "assigned_vehicle_id", label: t.vehicle, kind: "select", options: vehicles },
    { key: "status", label: t.status, kind: "select", options: STATUS() },
    { key: "notes", label: t.notes, kind: "textarea" },
  ];
}

export function carrierFields(t: Ui): FieldDef[] {
  return [
    { key: "name", label: t.name, kind: "text", required: true },
    { key: "registration_no", label: t.registrationNo, kind: "text" },
    { key: "vat_no", label: t.vatNo, kind: "text" },
    { key: "contact_name", label: t.contactName, kind: "text" },
    { key: "contact_email", label: t.email, kind: "text" },
    { key: "contact_phone", label: t.phone, kind: "text" },
    { key: "address", label: t.address, kind: "text", full: true },
    { key: "country", label: t.country, kind: "text" },
    { key: "latitude", label: t.latitude, kind: "number" },
    { key: "longitude", label: t.longitude, kind: "number" },
    { key: "rating", label: t.rating, kind: "number" },
    { key: "status", label: t.status, kind: "select", options: STATUS() },
    { key: "requirements", label: t.requirements, kind: "textarea" },
    { key: "handling_rules", label: t.handlingRules, kind: "textarea" },
    { key: "notes", label: t.notes, kind: "textarea" },
  ];
}

export function documentFields(
  t: Ui,
  country: string,
  lang: "en" | "de" | "ro",
  owners: Opt[],
): FieldDef[] {
  const pack = countryPack(country);
  return [
    {
      key: "owner_kind",
      label: t.owner,
      kind: "select",
      options: [
        { value: "vehicle", label: t.vehicle },
        { value: "driver", label: t.driver },
        { value: "carrier", label: t.carrier },
      ],
    },
    { key: "owner_id", label: t.name, kind: "select", options: owners },
    {
      key: "doc_type",
      label: t.docType,
      kind: "select",
      options: pack.docTypes.map((d) => ({ value: d.key, label: d.label[lang] })),
    },
    { key: "label", label: t.label, kind: "text" },
    { key: "reference", label: t.reference, kind: "text" },
    { key: "issued_on", label: t.issuedOn, kind: "date" },
    { key: "expires_on", label: t.expiresOn, kind: "date" },
    { key: "notes", label: t.notes, kind: "textarea" },
  ];
}

export function incidentFields(
  t: Ui,
  vehicles: Opt[],
  drivers: Opt[],
  carriers: Opt[],
): FieldDef[] {
  return [
    { key: "title", label: t.title, kind: "text", required: true, full: true },
    {
      key: "category",
      label: t.category,
      kind: "select",
      options: [
        { value: "damage", label: "Damage" },
        { value: "delay", label: "Delay" },
        { value: "breakdown", label: "Breakdown" },
        { value: "dispute", label: "Dispute" },
        { value: "safety", label: "Safety" },
        { value: "compliance", label: "Compliance" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "severity",
      label: t.severity,
      kind: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "medium", label: "Medium" },
        { value: "high", label: "High" },
        { value: "critical", label: "Critical" },
      ],
    },
    { key: "reference", label: t.reference, kind: "text" },
    { key: "occurred_at", label: t.occurredAt, kind: "datetime" },
    { key: "location", label: t.location, kind: "text" },
    { key: "latitude", label: t.latitude, kind: "number" },
    { key: "longitude", label: t.longitude, kind: "number" },
    { key: "vehicle_id", label: t.vehicle, kind: "select", options: vehicles },
    { key: "driver_id", label: t.driver, kind: "select", options: drivers },
    { key: "carrier_id", label: t.carrier, kind: "select", options: carriers },
    { key: "description", label: t.description, kind: "textarea" },
    { key: "action_agreed", label: t.actionAgreed, kind: "textarea" },
  ];
}

export function requestFields(
  t: Ui,
  vehicles: Opt[],
  drivers: Opt[],
  carriers: Opt[],
  incidents: Opt[],
): FieldDef[] {
  return [
    { key: "title", label: t.title, kind: "text", required: true, full: true },
    {
      key: "kind",
      label: t.kind,
      kind: "select",
      options: [
        { value: "vehicle", label: "Vehicle" },
        { value: "repair", label: "Repair" },
        { value: "document", label: "Document" },
        { value: "exception", label: "Exception" },
        { value: "driver", label: "Driver" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "priority",
      label: t.priority,
      kind: "select",
      options: [
        { value: "low", label: "Low" },
        { value: "normal", label: "Normal" },
        { value: "high", label: "High" },
        { value: "urgent", label: "Urgent" },
      ],
    },
    { key: "due_on", label: t.dueOn, kind: "date" },
    { key: "vehicle_id", label: t.vehicle, kind: "select", options: vehicles },
    { key: "driver_id", label: t.driver, kind: "select", options: drivers },
    { key: "carrier_id", label: t.carrier, kind: "select", options: carriers },
    { key: "incident_id", label: t.incidentRegister, kind: "select", options: incidents },
    { key: "description", label: t.description, kind: "textarea" },
  ];
}

export function zoneFields(t: Ui): FieldDef[] {
  return [
    { key: "name", label: t.name, kind: "text", required: true },
    { key: "color", label: "Color", kind: "text", placeholder: "#0ea5e9" },
    { key: "center_lat", label: t.latitude, kind: "number" },
    { key: "center_lng", label: t.longitude, kind: "number" },
    { key: "radius_km", label: "Radius (km)", kind: "number" },
    { key: "description", label: t.description, kind: "textarea" },
  ];
}

/** Editable CMR fields; country templates only change the printed headings. */
export function cmrFields(
  t: Ui,
  vehicles: Opt[],
  drivers: Opt[],
  carriers: Opt[],
): FieldDef[] {
  return [
    { key: "sender_name", label: `${t.sender} — ${t.name}`, kind: "text" },
    { key: "sender_address", label: `${t.sender} — ${t.address}`, kind: "text" },
    { key: "consignee_name", label: `${t.consignee} — ${t.name}`, kind: "text" },
    { key: "consignee_address", label: `${t.consignee} — ${t.address}`, kind: "text" },
    { key: "carrier_id", label: t.carrier, kind: "select", options: carriers },
    { key: "carrier_name", label: `${t.carrier} — ${t.name}`, kind: "text" },
    { key: "carrier_address", label: `${t.carrier} — ${t.address}`, kind: "text" },
    { key: "successive_carrier", label: t.requirements, kind: "text" },
    { key: "vehicle_id", label: t.vehicle, kind: "select", options: vehicles },
    { key: "vehicle_plate", label: t.plate, kind: "text" },
    { key: "trailer_plate", label: `${t.plate} (2)`, kind: "text" },
    { key: "driver_id", label: t.driver, kind: "select", options: drivers },
    { key: "place_of_loading", label: t.location, kind: "text" },
    { key: "loading_on", label: t.issuedOn, kind: "date" },
    { key: "place_of_delivery", label: t.delivery, kind: "text" },
    { key: "delivery_on", label: t.dueOn, kind: "date" },
    { key: "packages", label: t.goods, kind: "text" },
    { key: "gross_weight_kg", label: "kg", kind: "number" },
    { key: "volume_m3", label: "m3", kind: "number" },
    { key: "instructions", label: t.instructions, kind: "textarea" },
    { key: "payment_terms", label: t.reference, kind: "text" },
    { key: "reservations", label: t.reservations, kind: "textarea" },
    { key: "documents_attached", label: t.documents, kind: "textarea" },
    { key: "special_agreements", label: t.requirements, kind: "textarea" },
    { key: "established_in", label: t.location, kind: "text" },
    { key: "signature_sender", label: `${t.signatures} — ${t.sender}`, kind: "text" },
    { key: "signature_carrier", label: `${t.signatures} — ${t.carrier}`, kind: "text" },
    { key: "signature_consignee", label: `${t.signatures} — ${t.consignee}`, kind: "text" },
  ];
}
