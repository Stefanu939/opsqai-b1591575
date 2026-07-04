export interface CaseStudy {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  datePublished: string;
  illustrative: true; // clearly labelled
  industry: string;
  scale: string;
  lede: string;
  challenge: string[];
  approach: string[];
  outcome: string[];
  metrics: { label: string; value: string }[];
}
