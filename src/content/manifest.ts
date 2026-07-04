/**
 * Central content manifest. Phase 2 ships the scaffolding with empty arrays;
 * Phase 4 registers each new blog post / guide / case study here so the
 * listing pages and sitemap.xml pick them up automatically.
 *
 * To register a new article:
 *   1. Create `src/content/blog/my-slug.ts` exporting a `BlogPost`
 *   2. Import and add it to `BLOG_POSTS` below
 *
 * The sitemap loader reads these arrays — no other place to update.
 */

import type { BlogPost } from "./blog/_types";
import type { Guide } from "./guides/_types";
import type { CaseStudy } from "./case-studies/_types";

export const BLOG_POSTS: BlogPost[] = [];
export const GUIDES: Guide[] = [];
export const CASE_STUDIES: CaseStudy[] = [];

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
    "What Is Enterprise Knowledge Management in 2026",
    "Operational Knowledge: Turning SOPs Into Live Systems",
    "Semantic Search vs Keyword Search in Warehouse Operations",
    "AI Governance for Multi-Tenant SaaS",
    "Source-Backed AI: Why Grounded Answers Matter",
    "Building an Audit-Ready Knowledge Base",
  ],
  guides: [
    "How to Digitize Warehouse SOPs",
    "How to Roll Out AI Assistants Across a Distribution Network",
    "How to Prepare for ISO-Aligned Operational Audits",
    "Onboarding Playbook: 30 Days to First Value with OPSQAI",
  ],
  caseStudies: [
    "Multi-Warehouse Rollout: Cutting Onboarding Time",
    "SOP Digitization for a 3PL Distribution Center",
  ],
};
