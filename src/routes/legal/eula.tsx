import { createFileRoute, Link } from "@tanstack/react-router";

const DESC =
  "End-user license agreement for OPSQAI Self-Hosted: license scope, installations, updates, data ownership and liability.";

export const Route = createFileRoute("/legal/eula")({
  head: () => ({
    meta: [
      { title: "OPSQAI License Agreement (EULA) — OPSQAI" },
      { name: "description", content: DESC },
      { property: "og:title", content: "OPSQAI License Agreement (EULA)" },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://opsqai.de/legal/eula" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "https://opsqai.de/legal/eula" }],
  }),
  component: () => (
    <>
      <h1>OPSQAI License Agreement (EULA)</h1>
      <p>
        This agreement governs the installation and use of OPSQAI Self-Hosted software
        ("Software") by the organization that holds a valid OPSQAI license ("Customer"). By
        installing or using the Software, the Customer accepts these terms. The commercial terms of
        the Customer's order or contract take precedence where they differ.
      </p>

      <h2>1. License grant</h2>
      <p>
        OPSQAI grants the Customer a non-exclusive, non-transferable license to install and use the
        Software on its own infrastructure, for its internal business purposes, within the modules,
        seats and period stated in the license file.
      </p>

      <h2>2. Installations and workstations</h2>
      <ul>
        <li>One license activates one main installation (company server) identified by its installation ID.</li>
        <li>Additional computers connect as workstations to that main installation, within the licensed number of seats.</li>
        <li>Modules not included in the license remain locked.</li>
      </ul>

      <h2>3. Restrictions</h2>
      <p>
        The Customer may not resell, sublicense, rent or provide the Software as a service to third
        parties, circumvent license checks, or reverse engineer the Software except where mandatory
        law allows it.
      </p>

      <h2>4. Updates and maintenance</h2>
      <p>
        Updates are provided while maintenance is active. They are cryptographically signed and
        verified before installation. When maintenance expires, the installed version keeps
        working; new versions are no longer delivered until renewal.
      </p>

      <h2>5. Customer data</h2>
      <p>
        All data processed by the Software stays on the Customer's infrastructure and remains the
        Customer's property. The Customer is the data controller. OPSQAI receives only technical
        license and health information (installation ID, version, status) and no business content.
        See the <Link to="/legal/privacy">Privacy Policy</Link> and the{" "}
        <Link to="/legal/dpa">Data Processing Agreement</Link>.
      </p>

      <h2>6. AI output</h2>
      <p>
        AI answers are generated from the Customer's own documents and are assistance, not
        decisions. The Customer remains responsible for reviewing outputs and for any action taken
        on them.
      </p>

      <h2>7. Warranty and liability</h2>
      <p>
        OPSQAI provides the Software with reasonable care and in line with its documentation.
        Liability for slight negligence is limited to foreseeable, contract-typical damages, except
        for injury to life, body or health and liability under mandatory law. The Customer is
        responsible for backups of its installation.
      </p>

      <h2>8. Term and termination</h2>
      <p>
        The license runs for the period stated in the license file. If it ends, the Customer stops
        using the Software and may export its data at any time.
      </p>

      <h2>9. Governing law</h2>
      <p>
        German law applies, excluding the UN Convention on Contracts for the International Sale of
        Goods. See the <Link to="/legal/terms">Terms</Link> and{" "}
        <Link to="/legal/impressum">Impressum</Link> for company details.
      </p>
    </>
  ),
});
