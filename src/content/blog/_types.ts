export interface BlogAuthor {
  name: string;
  role: string;
  url?: string;
}

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  pillar:
    | "Enterprise AI"
    | "Knowledge Management"
    | "Warehouse AI"
    | "SOP Management"
    | "Compliance"
    | "Governance";
  keywords: string;
  datePublished: string; // ISO
  dateModified?: string;
  author: BlogAuthor;
  readingMinutes: number;
  lede: string;
  sections: BlogSection[];
  relatedLandingPages?: string[]; // paths
  relatedPosts?: string[]; // slugs
}
