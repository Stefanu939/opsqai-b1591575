// Caller's own resolved module access, used to filter the sidebar so users
// only see modules they may open. Server functions enforce the same rules,
// so hiding nav is a convenience, never the security boundary.
import { useQuery } from "@tanstack/react-query";

import { getMyModuleAccess } from "@/lib/module-access.functions";
import type { ModuleKey } from "@/lib/license-modules";

export interface MyModuleAccess {
  role: string;
  superadmin: boolean;
  modules: ModuleKey[];
}

export function useMyModuleAccess() {
  const query = useQuery<MyModuleAccess>({
    queryKey: ["my-module-access"],
    queryFn: async () => (await getMyModuleAccess()) as MyModuleAccess,
    staleTime: 5 * 60 * 1000,
  });

  const data = query.data;
  /** While loading (or on error) we do not restrict — the server still does. */
  const canSeeModule = (module: ModuleKey | null) => {
    if (module === null) return true;
    if (!data) return true;
    if (data.superadmin) return true;
    return data.modules.includes(module);
  };

  return { access: data, isLoading: query.isLoading, canSeeModule };
}
