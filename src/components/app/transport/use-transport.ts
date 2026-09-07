// Query/mutation helpers shared by the Transport workspace sections.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  deleteTransportRecord,
  exportCouplingSheet,
  exportTransportPdf,
  getTransportAudit,
  getTransportMap,
  getTransportOverview,
  getTransportRegisters,
  getTransportSettings,
  listCmrNotes,
  saveTransportRecord,
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
    mutationFn: (input: {
      register: RegisterName;
      id?: string;
      values: Record<string, unknown>;
    }) => save({ data: input }),
    onSuccess: () => refresh(),
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteRecord = useMutation({
    mutationFn: (input: { register: RegisterName; id: string }) =>
      remove({ data: input }),
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
