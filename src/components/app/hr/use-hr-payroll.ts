// OPSQAI HR — client hooks for payroll and document signing.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHrPayroll, listHrDocumentVersions, listHrPendingSignatures } from "@/lib/hr-payroll.functions";

export function useHrPayroll(employeeId: string | null, period: string, enabled = true) {
  const fn = useServerFn(getHrPayroll);
  return useQuery({
    queryKey: ["hr", "payroll", employeeId, period],
    queryFn: () => fn({ data: { employeeId: employeeId!, period } }),
    enabled: Boolean(employeeId) && enabled,
  });
}

export function useHrDocumentVersions(documentId: string | null) {
  const fn = useServerFn(listHrDocumentVersions);
  return useQuery({
    queryKey: ["hr", "doc-versions", documentId],
    queryFn: () => fn({ data: { id: documentId! } }),
    enabled: Boolean(documentId),
  });
}

export function useHrPendingSignatures() {
  const fn = useServerFn(listHrPendingSignatures);
  return useQuery({ queryKey: ["hr", "pending-signatures"], queryFn: () => fn() });
}

export function useHrPayrollRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["hr"] });
}
