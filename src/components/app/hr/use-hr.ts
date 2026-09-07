// OPSQAI HR — client data hooks (Self-Hosted workspace).
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getHrOverview, getHrEmployee, listHrEmployees, listHrTasks } from "@/lib/hr.functions";
import type { HrEmployeeFilters } from "@/lib/hr/types";

export function useHrOverview() {
  const fn = useServerFn(getHrOverview);
  return useQuery({ queryKey: ["hr", "overview"], queryFn: () => fn() });
}

export function useHrEmployees(filters: HrEmployeeFilters) {
  const fn = useServerFn(listHrEmployees);
  return useQuery({
    queryKey: ["hr", "employees", filters],
    queryFn: () => fn({ data: filters }),
  });
}

export function useHrEmployee(id: string | null) {
  const fn = useServerFn(getHrEmployee);
  return useQuery({
    queryKey: ["hr", "employee", id],
    queryFn: () => fn({ data: { id: id! } }),
    enabled: Boolean(id),
  });
}

export function useHrTasks(openOnly = false) {
  const fn = useServerFn(listHrTasks);
  return useQuery({ queryKey: ["hr", "tasks", openOnly], queryFn: () => fn({ data: { openOnly } }) });
}

export function useHrRefresh() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["hr"] });
}
