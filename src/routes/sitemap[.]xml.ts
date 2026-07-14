import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://opsqai.de";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/product", changefreq: "monthly", priority: "0.9" },
          { path: "/self-hosted", changefreq: "monthly", priority: "0.9" },
          { path: "/modules", changefreq: "monthly", priority: "0.9" },
          { path: "/pricing", changefreq: "monthly", priority: "0.9" },
          { path: "/security", changefreq: "monthly", priority: "0.9" },
          { path: "/documentation", changefreq: "monthly", priority: "0.8" },
          { path: "/support", changefreq: "monthly", priority: "0.7" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/legal/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/terms", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/dpa", changefreq: "yearly", priority: "0.3" },
          { path: "/legal/impressum", changefreq: "yearly", priority: "0.3" },
        ];

        const now = new Date().toISOString();
        const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap-0.9">\n${entries
          .map(
            (e) =>
              `  <url>\n    <loc>${BASE_URL}${e.path}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${e.changefreq ?? "monthly"}</changefreq>\n    <priority>${e.priority ?? "0.5"}</priority>\n  </url>`,
          )
          .join("\n")}\n</urlset>\n`;

        return new Response(body, {
          headers: { "content-type": "application/xml; charset=utf-8" },
        });
      },
    },
  },
});
