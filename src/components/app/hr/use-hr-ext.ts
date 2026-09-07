// OPSQAI HR — client hooks for the extended HR workspaces.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getHrAnalytics,
  getHrAssets,
  getHrChecklists,
  getHrDocuments,
  getHrIncidents,
  getHrScreening,
} from "@/lib/hr-ext.functions";

export function useHrDocuments(employeeId?: string) {
  const fn = useServerFn(getHrDocuments);
  return useQuery({
    queryKey: ["hr", "documents", employeeId ?? null],
    queryFn: () => fn({ data: employeeId ? { employeeId } : {} }),
  });
}

export function useHrChecklists() {
  const fn = useServerFn(getHrChecklists);
  return useQuery({ queryKey: ["hr", "checklists"], queryFn: () => fn() });
}

export function useHrAssets() {
  const fn = useServerFn(getHrAssets);
  return useQuery({ queryKey: ["hr", "assets"], queryFn: () => fn() });
}

export function useHrIncidents(employeeId?: string) {
  const fn = useServerFn(getHrIncidents);
  return useQuery({
    queryKey: ["hr", "incidents", employeeId ?? null],
    queryFn: () => fn({ data: employeeId ? { employeeId } : {} }),
  });
}

export function useHrScreening(jobProfileId?: string) {
  const fn = useServerFn(getHrScreening);
  return useQuery({
    queryKey: ["hr", "screening", jobProfileId ?? null],
    queryFn: () => fn({ data: jobProfileId ? { jobProfileId } : {} }),
  });
}

export function useHrAnalytics() {
  const fn = useServerFn(getHrAnalytics);
  return useQuery({ queryKey: ["hr", "analytics"], queryFn: () => fn() });
}

export function useHrExtRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["hr"] });
}
