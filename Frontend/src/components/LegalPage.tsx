import type { ReactNode } from "react";
import SiteNav from "@/components/SiteNav";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

const PROSE_CSS = `
  .legal-prose h2 { font-size: 1.2rem; font-weight: 600; margin-top: 2rem; margin-bottom: 0.5rem; }
  .legal-prose p { margin-top: 0.75rem; line-height: 1.7; }
  .legal-prose ul { margin-top: 0.75rem; padding-left: 1.25rem; list-style: disc; }
  .legal-prose li { margin-top: 0.35rem; line-height: 1.6; }
  .legal-prose a { color: var(--color-primary); text-decoration: underline; }
  .legal-prose strong { font-weight: 600; }
`;

/** Shared shell for Terms, Privacy, and Refund pages. */
export default function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="page-shell">
      <style>{PROSE_CSS}</style>
      <SiteNav />
      <main className="section-padding" id="main-content">
        <div className="container-main" style={{ maxWidth: "48rem" }}>
          <header style={{ marginBottom: "1.5rem" }}>
            <h1 className="type-display-lg">{title}</h1>
            <p className="type-body-sm" style={{ opacity: 0.6, marginTop: "0.5rem" }}>
              Last updated: {LEGAL_LAST_UPDATED}
            </p>
          </header>
          <div className="legal-prose type-body-sm">{children}</div>
        </div>
      </main>
    </div>
  );
}
