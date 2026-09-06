// CMR consignment notes: country-aware templates, editable records,
// numbering on issue, PDF and CSV export.
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Ban, Download, FileText, Stamp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  cancelCmrNote,
  issueCmrNote,
  renderCmrPdfBase64,
  saveCmrNote,
} from "@/lib/transport.functions";
import { countryPack } from "@/lib/transport/country-packs";
import { cmrFields } from "./registers";
import { RegisterTable } from "./register-table";
import { downloadBase64 } from "./download";
import { useCmrNotes, useCsvExport, useTransportRefresh } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";
import type { CmrRecord } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

export function CmrSection({ t }: { t: Ui }) {
  const query = useCmrNotes();
  const refresh = useTransportRefresh();
  const exportCsv = useCsvExport();
  const save = useServerFn(saveCmrNote);
  const issue = useServerFn(issueCmrNote);
  const cancel = useServerFn(cancelCmrNote);
  const pdf = useServerFn(renderCmrPdfBase64);
  const [busy, setBusy] = useState<string | null>(null);

  const data = query.data;
  const pack = useMemo(() => countryPack(data?.settings.country), [data?.settings.country]);
  const canEdit = data?.grants.includes("cmr") ?? false;

  const options = useMemo(
    () => ({
      vehicles: (data?.vehicles ?? []).map((v) => ({ value: v.id, label: v.plate })),
      drivers: (data?.drivers ?? []).map((d) => ({ value: d.id, label: d.full_name })),
      carriers: (data?.carriers ?? []).map((c) => ({ value: c.id, label: c.name })),
    }),
    [data?.vehicles, data?.drivers, data?.carriers],
  );

  const fields = useMemo(
    () => cmrFields(t, options.vehicles, options.drivers, options.carriers),
    [t, options],
  );

  const guard = (p: Promise<unknown>) =>
    p.then(() => refresh()).catch((e: Error) => toast.error(e.message));

  const download = (row: CmrRecord) => {
    setBusy(row.id);
    void pdf({ data: { id: row.id } })
      .then((res) => downloadBase64(res.filename, res.base64))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(null));
  };

  const statusLabel = (status: CmrRecord["status"]) =>
    status === "issued" ? t.issued : status === "cancelled" ? t.cancelled : t.draft;

  return (
    <RegisterTable<CmrRecord>
      icon={FileText}
      title={`${t.cmr} — ${pack.label}`}
      description={t.cmrBody}
      rows={data?.records ?? []}
      columns={[
        { key: "number", label: t.number, render: (r) => r.number ?? "—" },
        {
          key: "status",
          label: t.status,
          render: (r) => (
            <Badge variant={r.status === "cancelled" ? "destructive" : "outline"}>
              {statusLabel(r.status)}
            </Badge>
          ),
        },
        { key: "sender_name", label: t.sender, render: (r) => r.sender_name ?? "—" },
        { key: "consignee_name", label: t.consignee, render: (r) => r.consignee_name ?? "—" },
        {
          key: "place_of_delivery",
          label: t.delivery,
          render: (r) => r.place_of_delivery ?? "—",
        },
      ]}
      fields={fields}
      canCreate={canEdit}
      canEdit={canEdit}
      canDelete={canEdit}
      emptyTitle={t.none}
      emptyBody={t.cmrBody}
      labels={{
        add: t.newCmr,
        edit: t.edit,
        save: t.save,
        cancel: t.cancel,
        remove: t.remove,
        export: t.export,
        actions: t.actions,
      }}
      onSave={(values, id) =>
        save({ data: id ? { id, values } : { values } }).then(() => refresh())
      }
      onExport={() => void exportCsv("cmr")}
      rowActions={(row) => (
        <>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy === row.id}
            onClick={() => download(row)}
          >
            <Download className="mr-1 size-3.5" />
            {t.downloadPdf}
          </Button>
          {canEdit && row.status === "draft" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void guard(issue({ data: { id: row.id } }))}
            >
              <Stamp className="mr-1 size-3.5" />
              {t.issue}
            </Button>
          ) : null}
          {canEdit && row.status !== "cancelled" ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void guard(cancel({ data: { id: row.id } }))}
            >
              <Ban className="mr-1 size-3.5" />
              {t.cancelCmr}
            </Button>
          ) : null}
        </>
      )}
    />
  );
}
