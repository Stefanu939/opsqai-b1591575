/**
 * Central content manifest. Register every new blog post / guide /
 * case study here so the listing pages and sitemap.xml pick them up
 * automatically.
 */

import type { BlogPost } from "./blog/_types";
import type { Guide } from "./guides/_types";
import type { CaseStudy } from "./case-studies/_types";

import { post as blog1 } from "./blog/what-is-enterprise-knowledge-management-2026";
import { post as blog2 } from "./blog/operational-knowledge-live-systems";
import { post as blog3 } from "./blog/semantic-vs-keyword-search-warehouse";
import { post as blog4 } from "./blog/ai-governance-multi-tenant-saas";
import { post as blog5 } from "./blog/source-backed-ai-grounded-answers";
import { post as blog6 } from "./blog/audit-ready-knowledge-base";

import { guide as guide1 } from "./guides/how-to-digitize-warehouse-sops";
import { guide as guide2 } from "./guides/roll-out-ai-assistants-distribution-network";
import { guide as guide3 } from "./guides/prepare-for-iso-aligned-operational-audits";
import { guide as guide4 } from "./guides/onboarding-playbook-30-days-first-value";

import { study as study1 } from "./case-studies/multi-warehouse-rollout-cutting-onboarding-time";
import { study as study2 } from "./case-studies/sop-digitization-3pl-distribution-center";

export const BLOG_POSTS: BlogPost[] = [blog1, blog2, blog3, blog4, blog5, blog6];
export const GUIDES: Guide[] = [guide1, guide2, guide3, guide4];
export const CASE_STUDIES: CaseStudy[] = [study1, study2];

export function findBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
export function findGuide(slug: string): Guide | undefined {
  return GUIDES.find((g) => g.slug === slug);
}
export function findCaseStudy(slug: string): CaseStudy | undefined {
  return CASE_STUDIES.find((c) => c.slug === slug);
}

export const CONTENT_ROADMAP = {
  blog: [
    "AI Adoption Metrics That Matter in Warehouse Operations",
    "The Hidden Cost of Tribal Knowledge",
    "Multilingual AI on the Floor: Design Patterns",
    "Retention and Deletion for Enterprise AI",
  ],
  guides: ["How to Build a Refusal-First AI Pipeline", "How to Instrument AI Adoption"],
  caseStudies: ["European Cross-Border Rollout", "AI-Assisted Peak-Season Onboarding"],
};
