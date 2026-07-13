/**
 * OPSQAI shared SEO helpers.
 *
 * `pageHead()` returns the meta/links/scripts shape TanStack Router's
 * `head()` expects, with all enterprise defaults (canonical, og:*,
 * twitter:*, hreflang, BreadcrumbList) filled in. Route files stay lean.
 */

export const SITE_URL = "https://opsqai.de";
export const SITE_NAME = "OPSQAI";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.jpg`;
export const SUPPORTED_LOCALES = ["en", "de", "ro"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export interface BreadcrumbItem {
  name: string;
  path: string; // leading slash, relative to site root
}

export interface PageHeadInput {
  title: string;
  description: string;
  path: string; // leading slash
  ogType?: "website" | "article" | "product";
  ogImage?: string; // absolute URL
  noindex?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  jsonLd?: unknown[]; // extra JSON-LD blocks to inline
  keywords?: string;
}

const abs = (path: string) => `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

export function breadcrumbLd(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: abs(item.path),
    })),
  };
}

export function articleLd(input: {
  title: string;
  description: string;
  path: string;
  image?: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  authorUrl?: string;
  section?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.title,
    description: input.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": abs(input.path) },
    image: input.image ?? DEFAULT_OG_IMAGE,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { "@type": "Person", name: input.authorName, url: input.authorUrl },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      logo: { "@type": "ImageObject", url: `${SITE_URL}/icons/icon-192.png` },
    },
    articleSection: input.section,
  };
}

export function howToLd(input: {
  title: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: input.title,
    description: input.description,
    step: input.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}

export function faqLd(items: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

export function softwareApplicationLd(input: {
  name?: string;
  description: string;
  url?: string;
  category?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: input.name ?? SITE_NAME,
    description: input.description,
    url: input.url ?? SITE_URL,
    applicationCategory: input.category ?? "BusinessApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
    },
  };
}

export function hreflangLinks(path: string) {
  const url = abs(path);
  // Site is currently English-only in code; alternates plumb the same URL
  // so translated pages can plug in without a routing refactor.
  return [
    ...SUPPORTED_LOCALES.map((loc) => ({ rel: "alternate", hrefLang: loc, href: url })),
    { rel: "alternate", hrefLang: "x-default", href: url },
  ];
}

/**
 * Build TanStack Router head() output with enterprise defaults.
 */
export function pageHead(input: PageHeadInput) {
  const url = abs(input.path);
  const ogType = input.ogType ?? "website";
  const ogImage = input.ogImage ?? DEFAULT_OG_IMAGE;

  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: ogType },
    { property: "og:url", content: url },
    { property: "og:image", content: ogImage },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: ogImage },
  ];
  if (input.keywords) meta.push({ name: "keywords", content: input.keywords });
  if (input.noindex) meta.push({ name: "robots", content: "noindex, nofollow" });

  const links: Array<Record<string, string>> = [
    { rel: "canonical", href: url },
    ...hreflangLinks(input.path).map((l) => ({
      rel: l.rel,
      hreflang: l.hrefLang,
      href: l.href,
    })),
  ];

  const ldBlocks: unknown[] = [];
  if (input.breadcrumbs && input.breadcrumbs.length > 0) {
    ldBlocks.push(breadcrumbLd(input.breadcrumbs));
  }
  if (input.jsonLd) ldBlocks.push(...input.jsonLd);

  const scripts = ldBlocks.map((ld) => ({
    type: "application/ld+json",
    children: JSON.stringify(ld),
  }));

  return { meta, links, scripts };
}
