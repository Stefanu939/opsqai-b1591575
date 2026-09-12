import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ModulePage } from "@/components/app/module-page";
import { Skeleton } from "@/components/ui/skeleton";
import { ValueCalculator } from "@/components/mc/value/value-calculator";
import { useAuth } from "@/lib/auth-context";
import { defaultValueInputs, type ValueInputs } from "@/lib/value-engine";
import {
  deleteValueModel,
  exportValueReportPdf,
  getValueModel,
  saveValueModel,
} from "@/lib/value-engine.functions";

const searchSchema = z.object({
  lead: z.string().optional(),
  company: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/management/value/$id")({
  validateSearch: (s: Record<string, unknown>) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Value calculation — OPSQAI Management Center" },
      {
        name: "description",
        content:
          "Three-level operational value calculation for an OPSQAI customer: current loss, value drivers, expected value, ROI and value report.",
      },
      { property: "og:title", content: "Value calculation — OPSQAI Management Center" },
      {
        property: "og:description",
        content: "Operational value calculation and report for an OPSQAI customer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ValueDetailPage,
});

function ValueDetailPage() {
  const { id } = Route.useParams();
  const search = Route.useSearch();
  const isNew = id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { session, loading } = useAuth();

  const get = useServerFn(getValueModel);
  const save = useServerFn(saveValueModel);
  const remove = useServerFn(deleteValueModel);
  const exportPdf = useServerFn(exportValueReportPdf);

  const [companyName, setCompanyName] = useState(search.company ?? "");
  const [assumptions, setAssumptions] = useState("");
  const [inputs, setInputs] = useState<ValueInputs>(defaultValueInputs());
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["value-model", id],
    queryFn: () => get({ data: { id } }),
    enabled: !isNew && !loading && Boolean(session?.user?.id),
    retry: false,
  });

  useEffect(() => {
    if (!data?.model) return;
    setCompanyName(data.model.company_name);
    setAssumptions(data.model.assumptions ?? "");
    setInputs({ ...defaultValueInputs(), ...(data.model.inputs as ValueInputs) });
  }, [data?.model]);

  const onSave = async () => {
    if (!companyName.trim()) {
      toast.error("Add the customer name first");
      return;
    }
    setSaving(true);
    try {
      const res = await save({
        data: {
          id: isNew ? null : id,
          lead_id: search.lead ?? data?.model.lead_id ?? null,
          company_name: companyName.trim(),
          assumptions: assumptions.trim() || null,
          inputs,
        },
      });
      toast.success("Calculation saved");
      await qc.invalidateQueries({ queryKey: ["value-models"] });
      if (isNew) navigate({ to: "/management/value/$id", params: { id: res.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const onExport = async (lang: "en" | "de" | "ro") => {
    if (!companyName.trim()) {
      toast.error("Add the customer name first");
      return;
    }
    setExporting(true);
    try {
      const res = await exportPdf({
        data: {
          company_name: companyName.trim(),
          assumptions: assumptions.trim() || null,
          lang,
          inputs,
        },
      });
      const bytes = Uint8Array.from(atob(res.base64), (ch) => ch.charCodeAt(0));
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not export the report");
    } finally {
      setExporting(false);
    }
  };

  const onDelete = async () => {
    if (isNew) return;
    try {
      await remove({ data: { id } });
      await qc.invalidateQueries({ queryKey: ["value-models"] });
      toast.success("Calculation deleted");
      navigate({ to: "/management/value" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  };

  if (!isNew && isLoading) {
    return (
      <ModulePage eyebrow="Value Engine" title="Value calculation">
        <Skeleton className="h-96 w-full rounded-xl" />
      </ModulePage>
    );
  }

  return (
    <ModulePage
      eyebrow="Value Engine"
      title={isNew ? "New value calculation" : companyName || "Value calculation"}
      description="Problem to cost to opportunity to expected value. Every figure comes from the numbers entered here."
      breadcrumbs={[
        { label: "Value Engine", to: "/management/value" },
        { label: isNew ? "New" : companyName || "Calculation" },
      ]}
    >
      <ValueCalculator
        companyName={companyName}
        onCompanyNameChange={setCompanyName}
        inputs={inputs}
        onInputsChange={setInputs}
        assumptions={assumptions}
        onAssumptionsChange={setAssumptions}
        onSave={onSave}
        onExport={onExport}
        onDelete={isNew ? undefined : onDelete}
        saving={saving}
        exporting={exporting}
        readOnly={!isNew && data ? !data.canEdit : false}
      />
    </ModulePage>
  );
}
