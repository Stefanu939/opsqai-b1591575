// Transport registers: vehicles, drivers, documents, carriers, incidents and
// requests. Every register is optional — an empty register simply stays empty.
import { useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  FileWarning,
  Handshake,
  Inbox,
  Fuel,
  Truck,
  UsersRound,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RegisterTable } from "./register-table";
import {
  carrierFields,
  documentFields,
  driverFields,
  dutyFields,
  fuelFields,
  incidentFields,
  requestFields,
  vehicleFields,
} from "./registers";
import { useCsvExport, useRecordMutations, useTransportRefresh } from "./use-transport";
import { decideTransportIncident, decideTransportRequest } from "@/lib/transport.functions";
import { docTypeLabel } from "@/lib/transport/country-packs";
import type { transportUi } from "@/i18n/pages/transport";
import type {
  Carrier,
  Driver,
  DutyDay,
  FuelEntry,
  Incident,
  TransportDocument,
  TransportRequest,
  TransportGrantKey,
  Vehicle,
} from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

export interface RegistersData {
  vehicles: Vehicle[];
  drivers: Driver[];
  carriers: Carrier[];
  documents: TransportDocument[];
  incidents: Incident[];
  requests: TransportRequest[];
  fuel: FuelEntry[];
  duty: DutyDay[];
  settings: { country: string; language: string };
  grants: TransportGrantKey[];
}

interface Props {
  t: Ui;
  lang: "en" | "de" | "ro";
  data: RegistersData;
}

function labels(t: Ui) {
  return {
    add: t.add,
    edit: t.edit,
    save: t.save,
    cancel: t.cancel,
    remove: t.remove,
    export: t.export,
    actions: t.actions,
  };
}

function statusBadge(status: string) {
  const variant =
    status === "blocked" || status === "critical"
      ? "destructive"
      : status === "attention"
        ? "secondary"
        : "outline";
  return <Badge variant={variant}>{status}</Badge>;
}

export function OperationsSection({ t, lang, data }: Props) {
  const { saveRecord, deleteRecord } = useRecordMutations();
  const exportCsv = useCsvExport();
  const canEdit = data.grants.includes("edit");
  const canCreate = data.grants.includes("create");
  const canDelete = data.grants.includes("delete");
  const canExport = data.grants.includes("export");

  const driverOpts = data.drivers.map((d) => ({ value: d.id, label: d.full_name }));
  const vehicleOpts = data.vehicles.map((v) => ({ value: v.id, label: v.plate }));
  const ownerOpts = [
    ...data.vehicles.map((v) => ({ value: v.id, label: `${t.vehicle}: ${v.plate}` })),
    ...data.drivers.map((d) => ({ value: d.id, label: `${t.driver}: ${d.full_name}` })),
    ...data.carriers.map((c) => ({ value: c.id, label: `${t.carrier}: ${c.name}` })),
  ];

  const ownerLabel = (doc: TransportDocument) => {
    if (doc.owner_kind === "vehicle")
      return data.vehicles.find((v) => v.id === doc.owner_id)?.plate ?? "—";
    if (doc.owner_kind === "driver")
      return data.drivers.find((d) => d.id === doc.owner_id)?.full_name ?? "—";
    return data.carriers.find((c) => c.id === doc.owner_id)?.name ?? "—";
  };

  return (
    <div className="grid gap-4">
      <RegisterTable<Vehicle>
        icon={Truck}
        title={t.vehicleRegister}
        description={t.vehicleRegisterBody}
        rows={data.vehicles}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        emptyTitle={t.none}
        emptyBody={t.vehicleRegisterBody}
        labels={labels(t)}
        onExport={canExport ? () => void exportCsv("vehicles") : undefined}
        columns={[
          { key: "plate", label: t.plate },
          { key: "kind", label: t.kind },
          {
            key: "make",
            label: t.make,
            render: (r) => [r.make, r.model].filter(Boolean).join(" ") || "—",
          },
          { key: "ownership", label: t.ownership },
          { key: "base_location", label: t.baseLocation, render: (r) => r.base_location ?? "—" },
          {
            key: "assigned_driver_id",
            label: t.driver,
            render: (r) =>
              data.drivers.find((d) => d.id === r.assigned_driver_id)?.full_name ?? "—",
          },
          { key: "status", label: t.status, render: (r) => statusBadge(r.status) },
        ]}
        fields={vehicleFields(t, driverOpts)}
        onSave={(values, id) =>
          saveRecord.mutateAsync({ register: "vehicles", id, values })
        }
        onDelete={(id) => deleteRecord.mutateAsync({ register: "vehicles", id })}
      />

      <RegisterTable<Driver>
        icon={UsersRound}
        title={t.driverRegister}
        description={t.driverRegisterBody}
        rows={data.drivers}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        emptyTitle={t.none}
        emptyBody={t.driverRegisterBody}
        labels={labels(t)}
        onExport={canExport ? () => void exportCsv("drivers") : undefined}
        columns={[
          { key: "full_name", label: t.fullName },
          { key: "phone", label: t.phone, render: (r) => r.phone ?? "—" },
          {
            key: "licence_number",
            label: t.licenceNumber,
            render: (r) => r.licence_number ?? "—",
          },
          {
            key: "assigned_vehicle_id",
            label: t.vehicle,
            render: (r) =>
              data.vehicles.find((v) => v.id === r.assigned_vehicle_id)?.plate ?? "—",
          },
          { key: "status", label: t.status, render: (r) => statusBadge(r.status) },
        ]}
        fields={driverFields(t, vehicleOpts)}
        onSave={(values, id) =>
          saveRecord.mutateAsync({ register: "drivers", id, values })
        }
        onDelete={(id) => deleteRecord.mutateAsync({ register: "drivers", id })}
      />

      <RegisterTable<TransportDocument>
        icon={FileWarning}
        title={t.documentRegister}
        description={t.documentRegisterBody}
        rows={data.documents}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        emptyTitle={t.none}
        emptyBody={t.documentRegisterBody}
        labels={labels(t)}
        onExport={canExport ? () => void exportCsv("documents") : undefined}
        columns={[
          { key: "owner", label: t.owner, render: ownerLabel },
          {
            key: "doc_type",
            label: t.docType,
            render: (r) => r.label ?? docTypeLabel(data.settings.country, r.doc_type, lang),
          },
          { key: "reference", label: t.reference, render: (r) => r.reference ?? "—" },
          { key: "issued_on", label: t.issuedOn, render: (r) => r.issued_on ?? "—" },
          { key: "expires_on", label: t.expiresOn, render: (r) => r.expires_on ?? "—" },
        ]}
        fields={documentFields(t, data.settings.country, lang, ownerOpts)}
        onSave={(values, id) =>
          saveRecord.mutateAsync({ register: "documents", id, values })
        }
        onDelete={(id) => deleteRecord.mutateAsync({ register: "documents", id })}
      />

      <RegisterTable<DutyDay>
        icon={UsersRound}
        title={t.dutyRegister}
        description={t.dutyRegisterBody}
        rows={data.duty}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        emptyTitle={t.none}
        emptyBody={t.dutyRegisterBody}
        labels={labels(t)}
        onExport={canExport ? () => void exportCsv("duty") : undefined}
        columns={[
          { key: "duty_date", label: t.date, render: (r) => r.duty_date.slice(0, 10) },
          { key: "driver_name", label: t.driver, render: (r) => r.driver_name ?? "—" },
          { key: "duty_kind", label: t.dutyKind, render: (r) => dutyKindLabel(t, r.duty_kind) },
          { key: "route", label: t.route, render: (r) => r.route ?? "—" },
          { key: "vehicle_plate", label: t.vehicle, render: (r) => r.vehicle_plate ?? "—" },
          {
            key: "shift",
            label: t.shiftStart,
            render: (r) =>
              [r.shift_start?.slice(0, 5), r.shift_end?.slice(0, 5)]
                .filter(Boolean)
                .join(" – ") || "—",
          },
        ]}
        fields={dutyFields(t, driverOpts, vehicleOpts, lang)}
        onSave={(values, id) => saveRecord.mutateAsync({ register: "duty", id, values })}
        onDelete={(id) => deleteRecord.mutateAsync({ register: "duty", id })}
      />

      <RegisterTable<FuelEntry>
        icon={Fuel}
        title={t.fuelRegister}
        description={t.fuelRegisterBody}
        rows={data.fuel}
        canEdit={canEdit}
        canCreate={canCreate}
        canDelete={canDelete}
        emptyTitle={t.noFuel}
        emptyBody={t.fuelRegisterBody}
        labels={labels(t)}
        onExport={canExport ? () => void exportCsv("fuel") : undefined}
        columns={[
          { key: "entry_date", label: t.date, render: (r) => r.entry_date.slice(0, 10) },
          { key: "vehicle_plate", label: t.vehicle, render: (r) => r.vehicle_plate ?? "—" },
          { key: "driver_name", label: t.driver, render: (r) => r.driver_name ?? "—" },
          { key: "route", label: t.route, render: (r) => r.route ?? "—" },
          {
            key: "litres",
            label: t.litres,
            render: (r) => (r.litres == null ? "—" : r.litres.toFixed(2)),
          },
          {
            key: "cost",
            label: t.cost,
            render: (r) =>
              r.cost == null ? "—" : `${r.cost.toFixed(2)} ${r.currency}`,
          },
          {
            key: "distance_km",
            label: t.distanceKm,
            render: (r) => (r.distance_km == null ? "—" : r.distance_km.toFixed(0)),
          },
        ]}
        fields={fuelFields(t, vehicleOpts, driverOpts)}
        onSave={(values, id) => saveRecord.mutateAsync({ register: "fuel", id, values })}
        onDelete={(id) => deleteRecord.mutateAsync({ register: "fuel", id })}
      />
    </div>
  );
}

function dutyKindLabel(t: Ui, kind: DutyDay["duty_kind"]): string {
  if (kind === "work") return t.dutyWork;
  if (kind === "off") return t.dutyOff;
  if (kind === "leave") return t.dutyLeave;
  if (kind === "sick") return t.dutySick;
  if (kind === "training") return t.dutyTraining;
  return t.dutyStandby;
}

export function CarriersSection({ t, data }: Props) {
  const { saveRecord, deleteRecord } = useRecordMutations();
  const exportCsv = useCsvExport();
  return (
    <RegisterTable<Carrier>
      icon={Handshake}
      title={t.carrierRegister}
      description={t.carrierRegisterBody}
      rows={data.carriers}
      canEdit={data.grants.includes("edit")}
      canCreate={data.grants.includes("create")}
      canDelete={data.grants.includes("delete")}
      emptyTitle={t.none}
      emptyBody={t.carrierRegisterBody}
      labels={labels(t)}
      onExport={data.grants.includes("export") ? () => void exportCsv("carriers") : undefined}
      columns={[
        { key: "name", label: t.name },
        { key: "country", label: t.country, render: (r) => r.country ?? "—" },
        { key: "contact_name", label: t.contactName, render: (r) => r.contact_name ?? "—" },
        { key: "contact_phone", label: t.phone, render: (r) => r.contact_phone ?? "—" },
        { key: "rating", label: t.rating, render: (r) => (r.rating ? `${r.rating}/5` : "—") },
        { key: "status", label: t.status, render: (r) => statusBadge(r.status) },
      ]}
      fields={carrierFields(t)}
      onSave={(values, id) => saveRecord.mutateAsync({ register: "carriers", id, values })}
      onDelete={(id) => deleteRecord.mutateAsync({ register: "carriers", id })}
    />
  );
}

export function IncidentsSection({ t, data }: Props) {
  const { saveRecord, deleteRecord } = useRecordMutations();
  const exportCsv = useCsvExport();
  const refresh = useTransportRefresh();
  const decideFn = useServerFn(decideTransportIncident);
  const decide = useMutation({
    mutationFn: (input: { id: string; status: Incident["status"] }) =>
      decideFn({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });
  const canApprove = data.grants.includes("approve");

  const opts = useMemo(
    () => ({
      vehicles: data.vehicles.map((v) => ({ value: v.id, label: v.plate })),
      drivers: data.drivers.map((d) => ({ value: d.id, label: d.full_name })),
      carriers: data.carriers.map((c) => ({ value: c.id, label: c.name })),
    }),
    [data.vehicles, data.drivers, data.carriers],
  );

  return (
    <RegisterTable<Incident>
      icon={AlertTriangle}
      title={t.incidentRegister}
      description={t.incidentRegisterBody}
      rows={data.incidents}
      canEdit={data.grants.includes("edit")}
      canCreate={data.grants.includes("create")}
      canDelete={data.grants.includes("delete")}
      emptyTitle={t.none}
      emptyBody={t.incidentRegisterBody}
      labels={labels(t)}
      onExport={data.grants.includes("export") ? () => void exportCsv("incidents") : undefined}
      columns={[
        { key: "title", label: t.title },
        { key: "category", label: t.category },
        { key: "severity", label: t.severity, render: (r) => statusBadge(r.severity) },
        { key: "status", label: t.status, render: (r) => <Badge variant="outline">{r.status}</Badge> },
        {
          key: "occurred_at",
          label: t.occurredAt,
          render: (r) => (r.occurred_at ? r.occurred_at.slice(0, 16).replace("T", " ") : "—"),
        },
        {
          key: "vehicle_id",
          label: t.vehicle,
          render: (r) => data.vehicles.find((v) => v.id === r.vehicle_id)?.plate ?? "—",
        },
      ]}
      fields={incidentFields(t, opts.vehicles, opts.drivers, opts.carriers)}
      onSave={(values, id) => saveRecord.mutateAsync({ register: "incidents", id, values })}
      onDelete={(id) => deleteRecord.mutateAsync({ register: "incidents", id })}
      rowActions={(row) =>
        canApprove && row.status !== "closed" && row.status !== "cancelled" ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => decide.mutate({ id: row.id, status: "action_agreed" })}
            >
              <Check className="mr-1 size-3.5" />
              {t.actionAgreed}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => decide.mutate({ id: row.id, status: "closed" })}
            >
              {t.close}
            </Button>
          </>
        ) : null
      }
    />
  );
}

export function RequestsSection({ t, data }: Props) {
  const { saveRecord, deleteRecord } = useRecordMutations();
  const exportCsv = useCsvExport();
  const refresh = useTransportRefresh();
  const decideFn = useServerFn(decideTransportRequest);
  const decide = useMutation({
    mutationFn: (input: { id: string; decision: "approved" | "rejected" | "closed" }) =>
      decideFn({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });
  const canApprove = data.grants.includes("approve");

  return (
    <RegisterTable<TransportRequest>
      icon={Inbox}
      title={t.requestRegister}
      description={t.requestRegisterBody}
      rows={data.requests}
      canEdit={data.grants.includes("edit")}
      canCreate={data.grants.includes("create")}
      canDelete={data.grants.includes("delete")}
      emptyTitle={t.none}
      emptyBody={t.requestRegisterBody}
      labels={labels(t)}
      onExport={data.grants.includes("export") ? () => void exportCsv("requests") : undefined}
      columns={[
        { key: "title", label: t.title },
        { key: "kind", label: t.kind },
        { key: "priority", label: t.priority, render: (r) => statusBadge(r.priority) },
        { key: "status", label: t.status, render: (r) => <Badge variant="outline">{r.status}</Badge> },
        { key: "due_on", label: t.dueOn, render: (r) => r.due_on ?? "—" },
        {
          key: "decision_note",
          label: t.decisionNote,
          render: (r) => r.decision_note ?? "—",
        },
      ]}
      fields={requestFields(
        t,
        data.vehicles.map((v) => ({ value: v.id, label: v.plate })),
        data.drivers.map((d) => ({ value: d.id, label: d.full_name })),
        data.carriers.map((c) => ({ value: c.id, label: c.name })),
        data.incidents.map((i) => ({ value: i.id, label: i.title })),
      )}
      onSave={(values, id) => saveRecord.mutateAsync({ register: "requests", id, values })}
      onDelete={(id) => deleteRecord.mutateAsync({ register: "requests", id })}
      rowActions={(row) =>
        canApprove && (row.status === "open" || row.status === "in_review") ? (
          <>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => decide.mutate({ id: row.id, decision: "approved" })}
            >
              <Check className="mr-1 size-3.5" />
              {t.approve}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => decide.mutate({ id: row.id, decision: "rejected" })}
            >
              <X className="mr-1 size-3.5" />
              {t.reject}
            </Button>
          </>
        ) : null
      }
    />
  );
}
