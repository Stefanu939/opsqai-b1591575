// OPSQAI Transport — coupling board (Self-Hosted only).
//
// Drag a truck, a trailer and a driver into a set. Each set is one saved row in
// the local coupling register for the selected day, and the whole table can be
// exported to PDF.
import { useMemo, useState } from "react";
import { FileText, Link2Off, Plus, Search, Trash2, Truck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/ui/empty-state";
import { RegisterTable } from "./register-table";
import { couplingFields } from "./registers";
import { useCouplingExport, useRecordMutations } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";
import type { Coupling, Driver, Trailer, TransportGrantKey, Vehicle } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;
type DragKind = "vehicle" | "trailer" | "driver";

const today = () => new Date().toISOString().slice(0, 10);

function shiftDay(day: string, days: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

interface Props {
  t: Ui;
  lang: "en" | "de" | "ro";
  data: {
    vehicles: Vehicle[];
    trailers: Trailer[];
    drivers: Driver[];
    couplings: Coupling[];
    grants: TransportGrantKey[];
  };
}

export function CouplingBoard({ t, lang, data }: Props) {
  const { saveRecord, deleteRecord } = useRecordMutations();
  const exportSheet = useCouplingExport();
  const [day, setDay] = useState(today);
  const [term, setTerm] = useState("");
  const [from, setFrom] = useState(() => shiftDay(today(), -30));
  const [to, setTo] = useState(() => shiftDay(today(), 30));

  const canCreate = data.grants.includes("create");
  const canEdit = data.grants.includes("edit");
  const canDelete = data.grants.includes("delete");
  const canExport = data.grants.includes("export");

  const daySets = useMemo(
    () =>
      data.couplings
        .filter((c) => c.coupling_date === day && c.status !== "cancelled")
        .sort((a, b) => (a.vehicle_plate ?? "").localeCompare(b.vehicle_plate ?? "")),
    [data.couplings, day],
  );

  const used = useMemo(() => {
    const v = new Set<string>();
    const tr = new Set<string>();
    const dr = new Set<string>();
    for (const c of daySets) {
      if (c.vehicle_id) v.add(c.vehicle_id);
      if (c.trailer_id) tr.add(c.trailer_id);
      if (c.driver_id) dr.add(c.driver_id);
    }
    return { vehicle: v, trailer: tr, driver: dr };
  }, [daySets]);

  const match = (text: string) =>
    !term.trim() || text.toLowerCase().includes(term.trim().toLowerCase());

  const trucks = data.vehicles.filter((v) => match(`${v.plate} ${v.make ?? ""} ${v.model ?? ""}`));
  const trailers = data.trailers.filter((v) => match(`${v.plate} ${v.kind}`));
  const drivers = data.drivers.filter((d) => match(`${d.full_name} ${d.phone ?? ""}`));

  const assign = (setId: string | null, kind: DragKind, id: string) => {
    const key = kind === "vehicle" ? "vehicle_id" : kind === "trailer" ? "trailer_id" : "driver_id";
    if (setId) {
      void saveRecord.mutateAsync({ register: "couplings", id: setId, values: { [key]: id } });
      return;
    }
    void saveRecord.mutateAsync({
      register: "couplings",
      values: { coupling_date: day, status: "planned", [key]: id },
    });
  };

  const clearSlot = (setId: string, kind: DragKind) => {
    const key = kind === "vehicle" ? "vehicle_id" : kind === "trailer" ? "trailer_id" : "driver_id";
    void saveRecord.mutateAsync({ register: "couplings", id: setId, values: { [key]: null } });
  };

  const labels = {
    title: t.setsSheet,
    date: t.date,
    vehicle: t.vehicle,
    trailer: t.trailer,
    driver: t.driver,
    route: t.route,
    status: t.status,
    notes: t.notes,
    generated: `${t.generatedOn}: ${new Date().toISOString().slice(0, 16).replace("T", " ")}`,
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle>{t.couplingBoard}</CardTitle>
              <CardDescription>{t.couplingBoardBody}</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">{t.day}</Label>
                <Input
                  type="date"
                  value={day}
                  onChange={(e) => setDay(e.target.value || today())}
                  className="h-9 w-40"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">{t.searchAssets}</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    placeholder={t.searchAssets}
                    className="h-9 w-56 pl-8"
                  />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.4fr]">
          <Column
            title={t.vehicles}
            icon={Truck}
            items={trucks.map((v) => ({
              id: v.id,
              label: v.plate,
              sub: [v.make, v.model].filter(Boolean).join(" ") || v.kind,
              busy: used.vehicle.has(v.id),
              inactive: v.status === "inactive" || v.status === "blocked",
            }))}
            kind="vehicle"
            t={t}
            draggable={canCreate || canEdit}
          />
          <Column
            title={t.trailers}
            icon={Truck}
            items={trailers.map((v) => ({
              id: v.id,
              label: v.plate,
              sub: v.kind,
              busy: used.trailer.has(v.id),
              inactive: v.status === "inactive" || v.status === "blocked",
            }))}
            kind="trailer"
            t={t}
            draggable={canCreate || canEdit}
          />
          <Column
            title={t.drivers}
            icon={UsersRound}
            items={drivers.map((d) => ({
              id: d.id,
              label: d.full_name,
              sub: d.phone ?? d.licence_number ?? "",
              busy: used.driver.has(d.id),
              inactive: d.status === "inactive" || d.status === "blocked",
            }))}
            kind="driver"
            t={t}
            draggable={canCreate || canEdit}
          />

          <div className="grid content-start gap-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t.sets} · {daySets.length}
            </div>
            {daySets.map((c) => (
              <SetCard
                key={c.id}
                t={t}
                set={c}
                canEdit={canEdit}
                canDelete={canDelete}
                onDrop={(kind, id) => assign(c.id, kind, id)}
                onClear={(kind) => clearSlot(c.id, kind)}
                onDelete={() =>
                  void deleteRecord.mutateAsync({ register: "couplings", id: c.id })
                }
              />
            ))}
            {canCreate ? (
              <DropZone
                className="rounded-lg border border-dashed border-border/70 p-4 text-center text-xs text-muted-foreground"
                onDrop={(kind, id) => assign(null, kind, id)}
              >
                <Plus className="mx-auto mb-1 h-4 w-4" />
                {t.emptySet}
              </DropZone>
            ) : null}
            {!daySets.length && !canCreate ? (
              <EmptyState title={t.none} description={t.couplingBoardBody} />
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <CardTitle>{t.sets}</CardTitle>
              <CardDescription>{t.setsBody}</CardDescription>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">{t.fromDate}</Label>
                <Input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              <div className="grid gap-1">
                <Label className="text-xs text-muted-foreground">{t.toDate}</Label>
                <Input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-9 w-40"
                />
              </div>
              {canExport ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void exportSheet({
                      from,
                      to,
                      labels,
                      emptyMessage: t.nothingToExport,
                    })
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {t.exportPdf}
                </Button>
              ) : null}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <RegisterTable<Coupling>
            icon={Truck}
            title={t.sets}
            description={t.setsBody}
            rows={data.couplings.filter(
              (c) => c.coupling_date >= from && c.coupling_date <= to,
            )}
            canEdit={canEdit}
            canCreate={canCreate}
            canDelete={canDelete}
            emptyTitle={t.none}
            emptyBody={t.setsBody}
            labels={{
              add: t.newSet,
              edit: t.edit,
              save: t.save,
              cancel: t.cancel,
              remove: t.remove,
              export: t.export,
              actions: t.actions,
            }}
            columns={[
              { key: "coupling_date", label: t.date },
              { key: "vehicle_plate", label: t.vehicle, render: (r) => r.vehicle_plate ?? "—" },
              { key: "trailer_plate", label: t.trailer, render: (r) => r.trailer_plate ?? "—" },
              { key: "driver_name", label: t.driver, render: (r) => r.driver_name ?? "—" },
              { key: "route", label: t.route, render: (r) => r.route ?? "—" },
              {
                key: "status",
                label: t.status,
                render: (r) => <Badge variant="outline">{r.status}</Badge>,
              },
            ]}
            fields={couplingFields(
              t,
              data.vehicles.map((v) => ({ value: v.id, label: v.plate })),
              data.trailers.map((v) => ({ value: v.id, label: v.plate })),
              data.drivers.map((d) => ({ value: d.id, label: d.full_name })),
              lang,
            )}
            onSave={(values, id) => saveRecord.mutateAsync({ register: "couplings", id, values })}
            onDelete={(id) => deleteRecord.mutateAsync({ register: "couplings", id })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function DropZone({
  children,
  className,
  onDrop,
}: {
  children: React.ReactNode;
  className?: string;
  onDrop: (kind: DragKind, id: string) => void;
}) {
  const [over, setOver] = useState(false);
  return (
    <div
      className={`${className ?? ""} ${over ? "ring-2 ring-primary/60" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const raw = e.dataTransfer.getData("text/plain");
        const [kind, id] = raw.split(":");
        if (!id) return;
        if (kind === "vehicle" || kind === "trailer" || kind === "driver") onDrop(kind, id);
      }}
    >
      {children}
    </div>
  );
}

function Column({
  title,
  icon: Icon,
  items,
  kind,
  t,
  draggable,
}: {
  title: string;
  icon: typeof Truck;
  items: Array<{ id: string; label: string; sub: string; busy: boolean; inactive: boolean }>;
  kind: DragKind;
  t: Ui;
  draggable: boolean;
}) {
  return (
    <div className="grid content-start gap-2">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title} · {items.length}
      </div>
      <div className="grid max-h-[26rem] gap-2 overflow-y-auto pr-1">
        {items.map((item) => (
          <div
            key={item.id}
            draggable={draggable}
            onDragStart={(e) => e.dataTransfer.setData("text/plain", `${kind}:${item.id}`)}
            className={`rounded-lg border bg-card px-3 py-2 text-sm ${
              draggable ? "cursor-grab active:cursor-grabbing" : ""
            } ${item.inactive ? "opacity-50" : ""}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{item.label}</span>
              {item.busy ? (
                <Badge variant="secondary" className="text-[10px]">
                  {t.inUse}
                </Badge>
              ) : null}
            </div>
            {item.sub ? (
              <div className="truncate text-xs text-muted-foreground">{item.sub}</div>
            ) : null}
          </div>
        ))}
        {!items.length ? (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
            {t.none}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SetCard({
  t,
  set,
  canEdit,
  canDelete,
  onDrop,
  onClear,
  onDelete,
}: {
  t: Ui;
  set: Coupling;
  canEdit: boolean;
  canDelete: boolean;
  onDrop: (kind: DragKind, id: string) => void;
  onClear: (kind: DragKind) => void;
  onDelete: () => void;
}) {
  const slot = (kind: DragKind, label: string, value: string | null) => (
    <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-2 py-1.5 text-sm">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate">{value ?? "—"}</div>
      </div>
      {value && canEdit ? (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          aria-label={t.removeFromSet}
          onClick={() => onClear(kind)}
        >
          <Link2Off className="h-3.5 w-3.5" />
        </Button>
      ) : null}
    </div>
  );

  return (
    <DropZone
      className="rounded-lg border bg-muted/30 p-3"
      onDrop={(kind, id) => canEdit && onDrop(kind, id)}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <Badge variant="outline">{set.coupling_date}</Badge>
        <div className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[10px]">
            {set.status}
          </Badge>
          {canDelete ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              aria-label={t.remove}
              onClick={onDelete}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        {slot("vehicle", t.vehicle, set.vehicle_plate)}
        {slot("trailer", t.trailer, set.trailer_plate)}
        {slot("driver", t.driver, set.driver_name)}
      </div>
      {set.route ? (
        <div className="mt-2 truncate text-xs text-muted-foreground">{set.route}</div>
      ) : null}
    </DropZone>
  );
}
