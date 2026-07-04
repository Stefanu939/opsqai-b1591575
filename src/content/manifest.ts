/**
 * Central content manifest. New articles/guides/case-studies are registered
 * here and picked up automatically by listing pages and sitemap.xml.
 *
 * Future-proofing: the sitemap loader reads these arrays, so shipping a new
 * post only requires (1) writing a `.ts` module under the matching folder
 * and (2) importing it into the corresponding array below.
 */

import type { BlogPost } from "./blog/_types";
import type { Guide } from "./guides/_types";
import type { CaseStudy } from "./case-studies/_types";

// ---------- Blog ----------
import { post as pKmDefinition } from "./blog/enterprise-knowledge-management-2026";
import { post as pOperationalKnowledge } from "./blog/operational-knowledge-live-systems";
import { post as pSemanticSearch } from "./blog/semantic-vs-keyword-search";
import { post as pAiGovernance } from "./blog/ai-governance-multi-tenant";
import { post as pSourceBackedAi } from "./blog/source-backed-ai";
import { post as pAuditReadyKb } from "./blog/audit-ready-knowledge-base";

// ---------- Guides ----------
import { guide as gDigitizeSops } from "./guides/how-to-digitize-warehouse-sops";
import { guide as gRolloutAi } from "./guides/rollout-ai-across-distribution";
import { guide as gAuditReadiness } from "./guides/iso-aligned-operational-audits";
import { guide as gOnboarding30 } from "./guides/30-day-onboarding-playbook";

// ---------- Case Studies ----------
import { study as csMultiWarehouse } from "./case-studies/multi-warehouse-rollout";
import { study as cs3plDigitization } from "./case-studies/3pl-sop-digitization";

export const BLOG_POSTS: BlogPost[] = [
  pKmDefinition,
  pOperationalKnowledge,
  pSemanticSearch,
  pAiGovernance,
  pSourceBackedAi,
  pAuditReadyKb,
];

export const GUIDES: Guide[] = [gDigitizeSops, gRolloutAi, gAuditReadiness, gOnboarding30];

export const CASE_STUDIES: CaseStudy[] = [csMultiWarehouse, cs3plDigitization];

export function findBlogPost(slug: string) {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
export function findGuide(slug: string) {
  return GUIDES.find((g) => g.slug === slug);
}
export function findCaseStudy(slug: string) {
  return CASE_STUDIES.find((c) => c.slug === slug);
}
