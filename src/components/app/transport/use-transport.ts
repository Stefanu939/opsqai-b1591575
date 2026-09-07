// Query/mutation helpers shared by the Transport workspace sections.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  deleteTransportRecord,
  closeTransportRiskAction,
  exportCouplingSheet,
  exportFleetStatusPdf,
  exportTransportPdf,
  getTransportAudit,
  getTransportMap,
  getTransportOverview,
  getTransportRegisters,
  getTransportSettings,
  listCmrNotes,
  saveTransportRecord,
  saveTransportRiskAction,
  sendTransportDigestNow,
} from "@/lib/transport.functions";
import { downloadBase64 } from "./download";
import type { RegisterName } from "./registers";

export function useTransportOverview(periodDays = 30) {
  const fn = useServerFn(getTransportOverview);
  return useQuery({
    queryKey: ["transport", "overview", periodDays],
    queryFn: () => fn({ data: { periodDays } }),
    retry: false,
  });
}

export function useTransportRegisters() {
  const fn = useServerFn(getTransportRegisters);
  return useQuery({
    queryKey: ["transport", "registers"],
    queryFn: () => fn(),
    retry: false,
  });
}

export function useTransportAudit(checkId?: string | null) {
  const fn = useServerFn(getTransportAudit);
  return useQuery({
    queryKey: ["transport", "audit", checkId ?? null],
    queryFn: () => fn({ data: { checkId: checkId ?? null } }),
    retry: false,
  });
}

export function useTransportMapData() {
  const fn = useServerFn(getTransportMap);
  return useQuery({
    queryKey: ["transport", "map"],
    queryFn: () => fn(),
    retry: false,
  });
}

export function useTransportSettings() {
  const fn = useServerFn(getTransportSettings);
  return useQuery({
    queryKey: ["transport", "settings"],
    queryFn: () => fn(),
    retry: false,
  });
}

export function useCmrNotes() {
  const fn = useServerFn(listCmrNotes);
  return useQuery({
    queryKey: ["transport", "cmr"],
    queryFn: () => fn(),
    retry: false,
  });
}

/** Invalidate everything the Transport workspace shows. */
export function useTransportRefresh() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["transport"] });
}

export function useRecordMutations() {
  const save = useServerFn(saveTransportRecord);
  const remove = useServerFn(deleteTransportRecord);
  const refresh = useTransportRefresh();

  const saveRecord = useMutation({
    mutationFn: (input: { register: RegisterName; id?: string; values: Record<string, unknown> }) =>
      save({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRecord = useMutation({
    mutationFn: (input: { register: RegisterName; id: string }) => remove({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  return { saveRecord, deleteRecord };
}

export function usePdfExport() {
  const fn = useServerFn(exportTransportPdf);
  return async (
    dataset:
      | "vehicles"
      | "trailers"
      | "couplings"
      | "drivers"
      | "carriers"
      | "documents"
      | "incidents"
      | "requests"
      | "cmr"
      | "alerts"
      | "fuel"
      | "duty",
    title?: string,
  ) => {
    try {
      const res = await fn({ data: { dataset, title } });
      if (!res.count) {
        toast.info("Nothing to export yet.");
        return;
      }
      downloadBase64(res.filename, res.base64);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };
}

/** PDF export of the saved truck + trailer + driver sets. */
export function useCouplingExport() {
  const fn = useServerFn(exportCouplingSheet);
  return async (input: {
    from?: string;
    to?: string;
    labels: {
      title: string;
      date: string;
      vehicle: string;
      trailer: string;
      driver: string;
      route: string;
      status: string;
      notes: string;
      generated: string;
    };
    emptyMessage: string;
  }) => {
    try {
      const res = await fn({ data: input });
      if (!res.count) {
        toast.info(input.emptyMessage);
        return;
      }
      downloadBase64(res.filename, res.base64, res.mime);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };
}

/** Owner + due date assignments for the risk lanes. */
export function useRiskActionMutations() {
  const save = useServerFn(saveTransportRiskAction);
  const close = useServerFn(closeTransportRiskAction);
  const refresh = useTransportRefresh();

  const assign = useMutation({
    mutationFn: (input: {
      id?: string | null;
      riskKey: string;
      subject?: string | null;
      ownerName?: string | null;
      dueOn?: string | null;
      note?: string | null;
    }) => save({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const markDone = useMutation({
    mutationFn: (id: string) => close({ data: { id } }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  return { assign, markDone };
}

/** One-page fleet status PDF for the weekly meeting. */
export function useFleetStatusExport() {
  const fn = useServerFn(exportFleetStatusPdf);
  return async (input: {
    title: string;
    subtitle: string;
    footer: string;
    kpis: { label: string; value: string }[];
    lanes: {
      title: string;
      tone: "critical" | "plan";
      items: { label: string; value: string }[];
    }[];
  }) => {
    try {
      const res = await fn({ data: input });
      downloadBase64(res.filename, res.base64);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  };
}

/** Send the morning briefing immediately (settings right required). */
export function useSendDigest() {
  const fn = useServerFn(sendTransportDigestNow);
  return async (
    input: {
      title: string;
      now: { label: string; count: number }[];
      plan: { label: string; count: number }[];
    },
    labels: { sent: string; nothing: string; failed: string },
  ) => {
    try {
      const res = await fn({ data: input });
      if (res.reason === "nothing") toast.info(labels.nothing);
      else if (res.sent) toast.success(labels.sent);
      else toast.error(labels.failed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : labels.failed);
    }
  };
}
