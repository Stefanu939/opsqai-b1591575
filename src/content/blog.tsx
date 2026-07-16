import type { ReactNode } from "react";

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  date: string; // ISO
  readingMinutes: number;
  author: string;
  tag: "Product" | "Security" | "Engineering";
  body: () => ReactNode;
};

const P = ({ children }: { children: ReactNode }) => (
  <p className="mt-5 text-[15px] leading-relaxed text-muted-foreground">{children}</p>
);
const H2 = ({ children }: { children: ReactNode }) => (
  <h2 className="mt-10 text-2xl font-semibold tracking-tight text-foreground">{children}</h2>
);
const UL = ({ children }: { children: ReactNode }) => (
  <ul className="mt-4 space-y-2 pl-5 list-disc text-[15px] leading-relaxed text-muted-foreground">
    {children}
  </ul>
);

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "why-we-chose-windows-native",
    title: "Why OPSQAI ships as native Windows services — not Docker",
    description:
      "How we replaced the Docker Compose stack with signed Windows services, and what that means for customers running dedicated on-prem servers.",
    date: "2026-07-02",
    readingMinutes: 6,
    author: "OPSQAI Engineering",
    tag: "Engineering",
    body: () => (
      <>
        <P>
          Early builds of OPSQAI shipped as a Docker Compose stack. It worked on Linux, it worked
          in WSL, and it worked for us — but it did not work for the customers we actually sell
          to. Logistics operations, freight forwarders and 3PLs run dedicated Windows Servers, not
          container hosts. Requiring Docker Desktop, WSL2 or a separate Linux VM was a hard sell
          for their IT teams.
        </P>
        <P>
          We rewrote the deployment stack. OPSQAI now installs from a single Authenticode-signed{" "}
          <code>OPSQAI-Setup.exe</code> and runs as five native Windows services managed by WinSW:{" "}
          <code>OpsqaiCaddy</code>, <code>OpsqaiPlatform</code>, <code>OpsqaiWorker</code>,{" "}
          <code>OpsqaiDatabase</code> (Portable PostgreSQL 16), and <code>OpsqaiUpdater</code>.
          No Docker. No Hyper-V. No WSL. No IIS. No .NET.
        </P>
        <H2>What the customer sees</H2>
        <UL>
          <li>Right-click the installer, verify the Authenticode signature, install.</li>
          <li>
            Program files land under <code>C:\Program Files\OPSQAI\</code>, mutable state under{" "}
            <code>C:\ProgramData\OPSQAI\</code>.
          </li>
          <li>Services are set to <code>Automatic (Delayed Start)</code> and boot on reboot.</li>
          <li>
            Caddy terminates TLS on 443, obtaining an internal certificate from the customer's own
            CA or a Let's Encrypt certificate when the server is reachable.
          </li>
        </UL>
        <H2>What we kept</H2>
        <P>
          The application, worker, and database are the same code. Only the runtime substrate
          changed. That means the RAG pipeline, the AI adapter contract, and the licence /
          heartbeat design carry over unchanged from the container era.
        </P>
      </>
    ),
  },
  {
    slug: "grounded-answers",
    title: "Grounded answers, verifiable citations",
    description:
      "OPSQAI refuses to guess. This post walks through how the retrieval pipeline forces every AI answer to point back at a specific paragraph in a specific SOP.",
    date: "2026-06-18",
    readingMinutes: 5,
    author: "OPSQAI Product",
    tag: "Product",
    body: () => (
      <>
        <P>
          The default failure mode of chat AI is confident nonsense. In a warehouse or a
          dispatcher's office that is not a UX problem — it is a safety problem. OPSQAI is built
          so a wrong answer is impossible to hide.
        </P>
        <H2>The retrieval contract</H2>
        <P>
          Every user question goes through the local Worker, which embeds the question, retrieves
          the top-N candidate chunks from the customer's own PostgreSQL + pgvector store, and
          hands the model a system prompt with a single non-negotiable rule: answer only from the
          retrieved context; if the retrieved context is insufficient, refuse.
        </P>
        <H2>Citations are structural, not decorative</H2>
        <UL>
          <li>Every response comes with the source document, section, and a verbatim excerpt.</li>
          <li>The UI links the citation to the exact paragraph in the ingested SOP.</li>
          <li>
            The audit log stores the question, the retrieved chunk IDs, and the final answer —
            reviewable by an administrator months later.
          </li>
        </UL>
        <H2>Refusals are a feature</H2>
        <P>
          When retrieval returns nothing above the similarity threshold, OPSQAI does not
          hallucinate a plausible answer. It opens an internal request instead, which a manager
          can turn into a new SOP or FAQ. The knowledge base grows every time the AI does not
          know something — which is exactly how a knowledge base should grow.
        </P>
      </>
    ),
  },
  {
    slug: "data-stays-on-your-server",
    title: "Data stays on your server. Really.",
    description:
      "A concrete walkthrough of every network call an OPSQAI installation makes — and doesn't make — so IT teams can approve the firewall rules in one meeting.",
    date: "2026-05-27",
    readingMinutes: 4,
    author: "OPSQAI Security",
    tag: "Security",
    body: () => (
      <>
        <P>
          "Self-hosted" is a word people use loosely. This post is the specific version: what an
          OPSQAI installation talks to over the network, and what it does not.
        </P>
        <H2>Inbound</H2>
        <UL>
          <li>
            <strong>Port 443</strong> from the customer's LAN, terminated by Caddy. This is the
            only inbound port required.
          </li>
        </UL>
        <H2>Outbound — required</H2>
        <UL>
          <li>
            <strong>mc.opsqai.de</strong> — licence heartbeat and signed update manifest checks.
            Payload: licence ID, build version, timestamp. No customer content. No end-user
            identifiers.
          </li>
          <li>
            <strong>The AI endpoint chosen by the customer</strong> — OpenAI, Azure OpenAI,
            OpenRouter, or none at all if the customer picks Ollama. This traffic is between the
            customer's server and the customer's own AI account; OPSQAI does not proxy it.
          </li>
        </UL>
        <H2>Outbound — never</H2>
        <UL>
          <li>No analytics beacons. No product telemetry. No error-reporting SaaS.</li>
          <li>
            No document, chunk, embedding, question, or answer is ever transmitted to OPSQAI or to
            opsqai.de. If the customer picks Ollama, no document ever leaves the server at all.
          </li>
        </UL>
        <P>
          The Doctor tool in the first-run wizard prints exactly this list, so a security review
          can be closed with a screenshot instead of a questionnaire.
        </P>
      </>
    ),
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
