// Self-Hosted ICompanyRepository.
//
// Single-tenant install: the "system" company is synthetic and derived
// from OPSQAI_INSTALL_ID at bootstrap. No public.companies table exists
// on Self-Hosted v1.

import type { CompanyRecord, ICompanyRepository } from "@/lib/providers/interfaces";

export interface PgCompanyRepositoryDeps {
  tenantCompanyId: string;
  tenantName?: string;
  bootedAt: string;
}

export function createPgCompanyRepository(deps: PgCompanyRepositoryDeps): ICompanyRepository {
  const record: CompanyRecord = {
    id: deps.tenantCompanyId,
    name: deps.tenantName ?? "OPSQAI",
    isSystem: true,
    active: true,
    createdAt: deps.bootedAt,
  };

  return {
    async findById(id) {
      return id === record.id ? record : null;
    },
    async findSystemCompany() {
      return record;
    },
    async findFirstActive() {
      return record;
    },
    async list() {
      return [record];
    },
  };
}
