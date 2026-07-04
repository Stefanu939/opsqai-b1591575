export interface GuideStep {
  name: string;
  text: string;
}

export interface Guide {
  slug: string;
  title: string;
  description: string;
  keywords: string;
  datePublished: string;
  dateModified?: string;
  author: { name: string; role: string };
  readingMinutes: number;
  lede: string;
  steps: GuideStep[];
  closing?: string[];
  relatedLandingPages?: string[];
}
