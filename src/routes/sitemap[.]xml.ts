import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { BLOG_POSTS, GUIDES, CASE_STUDIES } from "@/content/manifest";

const BASE_URL = "https://opsqai.de";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          // Core marketing surface
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/product", changefreq: "monthly", priority: "0.9" },
          { path: "/features", changefreq: "monthly", priority: "0.9" },
          { path: "/solutions", changefreq: "monthly", priority: "0.9" },
          { path: "/industries", changefreq: "monthly", priority: "0.8" },
          { path: "/pricing", changefreq: "monthly", priority: "0.9" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/demo", changefreq: "monthly", priority: "0.7" },
          { path: "/about", changefreq: "monthly", priority: "0.7" },

          // Commercial landing pages
          {
            path: "/solutions/enterprise-ai-for-logistics",
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/solutions/warehouse-ai-assistant", changefreq: "monthly", priority: "0.85" },
          { path: "/solutions/ai-knowledge-management", changefreq: "monthly", priority: "0.85" },
          {
            path: "/solutions/operational-knowledge-platform",
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/solutions/warehouse-sop-software", changefreq: "monthly", priority: "0.85" },
          {
            path: "/solutions/warehouse-documentation-software",
            changefreq: "monthly",
            priority: "0.8",
          },
          {
            path: "/solutions/ai-for-warehouse-operations",
            changefreq: "monthly",
            priority: "0.85",
          },
          {
            path: "/solutions/ai-for-distribution-centers",
            changefreq: "monthly",
            priority: "0.85",
          },
          { path: "/solutions/operational-ai-platform", changefreq: "monthly", priority: "0.85" },
          { path: "/solutions/enterprise-knowledge-base", changefreq: "monthly", priority: "0.85" },

          // Content architecture hubs
          { path: "/resources", changefreq: "weekly", priority: "0.8" },
          { path: "/blog", changefreq: "weekly", priority: "0.8" },
          { path: "/guides", changefreq: "weekly", priority: "0.8" },
          { path: "/case-studies", changefreq: "monthly", priority: "0.8" },
          { path: "/docs", changefreq: "weekly", priority: "0.7" },
          { path: "/help", changefreq: "weekly", priority: "0.7" },

          // Trust
          { path: "/trust", changefreq: "monthly", priority: "0.75" },
          { path: "/trust/gdpr", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/security-architecture", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/multi-tenant-isolation", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/encryption", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/audit-logs", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/responsible-ai", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/data-retention", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/incident-response", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/backup-policy", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/availability", changefreq: "yearly", priority: "0.5" },
          { path: "/trust/iso-27001-roadmap", changefreq: "yearly", priority: "0.5" },

          // Legal
          { path: "/legal", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/cookies", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/dpa", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/responsible-ai", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/impressum", changefreq: "yearly", priority: "0.3" },
        ];

        // Dynamic content
        for (const post of BLOG_POSTS) {
          entries.push({
            path: `/blog/${post.slug}`,
            lastmod: post.dateModified ?? post.datePublished,
            changefreq: "monthly",
            priority: "0.7",
          });
        }
        for (const g of GUIDES) {
          entries.push({
            path: `/guides/${g.slug}`,
            lastmod: g.dateModified ?? g.datePublished,
            changefreq: "monthly",
            priority: "0.7",
          });
        }
        for (const c of CASE_STUDIES) {
          entries.push({
            path: `/case-studies/${c.slug}`,
            lastmod: c.datePublished,
            changefreq: "monthly",
            priority: "0.7",
          });
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
