// CMR consignment notes: country-aware templates, editable records, PDF/CSV export.
import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { FileText, Download, Plus, Ban } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  cancelCmr,
  createCmr,
  renderCmrPdfBase64,
  updateCmr,
} from "@/lib/transport.functions";
import { getCountryPack } from "@/lib/transport/country-packs";
import { cmrFields } from "./registers";
import { RegisterTable } from "./register-table";
import { downloadBase64, downloadText } from "./download";
import { useCsvExport, useTransportCmr, useTransportRefresh } from "./use-transport";
import type { transportUi } from "@/i18n/pages/transport";
import type { CmrRecord } from "@/lib/transport/types";

type Ui = ReturnType<typeof transportUi>;

export function CmrSection({ t }: { t: Ui }) {
  const query = useTransportCmr();
  const refresh = useTransportRefresh();
  const exportCsv = useCsvExport();
  const create = useServerFn(createCmr);
  const update = useServerFn(updateCmr);
  const cancel = useServerFn(cancelCmr);
  const pdf = useServerFn(renderCmrPdfBase64);
  const [busy, setBusy] = useState<string | null>(null);

  const country = query.data?.settings.country ?? "generic";
  const pack = useMemo(() => getCountryPack(country), [country]);
  const canEdit = query.data?.grants.includes("cmr") ?? false;
  const records = query.data?.records ?? [];

  const download = (record: CmrRecord) => {
    setBusy(record.id);
    void pdf({ data: { id: record.id } })
      .then((res) => downloadBase64(res.base64, res.filename, "application/pdf"))
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setBusy(null));
  };

  return (
    <div className="grid gap-4">
      <Panel
        icon={FileText}
        title={t.cmr}
        description={`${t.cmrBody} — ${pack.label}`}
        actions={
          <div className="flex gap-2">
            {query.data?.grants.includes("export") ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  void exportCsv("cmr").catch((e: Error) => toast.error(e.message))
                }
              >
                <Download className="mr-1 size-3.5" />
                {t.exportCsv}
              </Button>
            ) : null}
          </div>
        }
      >
        <RegisterTable
          rows={records}
          fields={cmrFields(t, query.data?.options ?? { vehicles: [], drivers: [], carriers: [] })}
          canEdit={canEdit}
          addLabel={
            <>
              <Plus className="mr-1 size-3.5" />
              {t.newCmr}
            </>
          }
          emptyTitle={t.none}
          emptyDescription={t.cmrBody}
          labels={{
            add: t.add,
            edit: t.edit,
            save: t.save,
            cancel: t.cancel,
            delete: t.cancelCmr,
            confirm: t.confirm,
          }}
          onCreate={(values) =>
            create({ data: values }).then(() => {
              refresh();
            })
          }
          onUpdate={(id, values) =>
            update({ data: { id, patch: values } }).then(() => {
              refresh();
            })
          }
          renderRowActions={(row) => (
            <div className="flex items-center gap-1.5">
              <Badge variant={row.status === "cancelled" ? "destructive" : "outline"}>
                {row.status}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy === row.id}
                onClick={() => download(row)}
              >
                <Download className="mr-1 size-3.5" />
                {t.exportPdf}
              </Button>
              {canEdit && row.status !== "cancelled" ? (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    void cancel({ data: { id: row.id } })
                      .then(() => refresh())
                      .catch((e: Error) => toast.error(e.message));
                  }}
                >
                  <Ban className="mr-1 size-3.5" />
                  {t.cancelCmr}
                </Button>
              ) : null}
            </div>
          )}
        />
      </Panel>

      <Panel icon={FileText} title={t.cmrSeries} description={t.cmrSeriesBody}>
        {!query.data?.series.length ? (
          <EmptyState title={t.none} description={t.cmrSeriesBody} />
        ) : (
          <ul className="divide-y divide-border">
            {query.data.series.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 py-2">
                <span className="text-sm font-medium">
                  {s.prefix}
                  {s.year ? `-${s.year}` : ""}
                </span>
                <span className="text-xs text-muted-foreground">
                  {t.nextNumber}: {s.next_number}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const header = ["number", "status", "issued_on", "sender", "consignee"].join(",");
              const body = records
                .map((r) =>
                  [r.number, r.status, r.issued_on ?? "", r.sender_name ?? "", r.consignee_name ?? ""]
                    .map((v) => `"${String(v).replaceAll('"', '""')}"`)
                    .join(","),
                )
                .join("\n");
              downloadText(`${header}\n${body}`, "cmr-local.csv", "text/csv");
            }}
          >
            <Download className="mr-1 size-3.5" />
            {t.exportCsv}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
