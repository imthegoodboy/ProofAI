import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowDown,
  ArrowRight,
  Check,
  DownloadSimple,
  Minus,
  Warning,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { ScoreRing } from "@/components/score-ring";
import { RiskBadge } from "@/components/status-badge";
import { getVerification } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getSessionHash } from "@/lib/session";

export const dynamic = "force-dynamic";

const CheckIcon = ({ status }: { status: string }) => {
  if (status === "passed") return <Check weight="light" />;
  if (status === "failed") return <X weight="light" />;
  if (status === "warning") return <Warning weight="light" />;
  return <Minus weight="light" />;
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ownerHash = await getSessionHash();
  const record = ownerHash ? await getVerification(id, ownerHash) : null;
  if (!record) notFound();
  if (record.status !== "complete") redirect(`/verify/${id}`);

  return (
    <div className="report-page section-shell">
      <nav className="report-nav" aria-label="Verification views">
        <Link href={`/report/${id}`} className="active">Assessment</Link>
        <Link href={`/proof/${id}`}>0G proof</Link>
      </nav>
      <header className="report-hero">
        <div className="report-title-block">
          <span className="eyebrow">Verification complete</span>
          <h1>{record.verdict}</h1>
          <div className="report-meta">
            <RiskBadge risk={record.riskLevel} />
            <span>{record.originalName}</span>
            <span>{formatDate(record.updatedAt)}</span>
          </div>
        </div>
        <ScoreRing score={record.proofScore || 0} />
      </header>

      <div className="report-actions">
        <a href={`/api/verifications/${id}/report`} className="text-action">
          <DownloadSimple weight="light" /> Download report
        </a>
        <a href="#score-breakdown" className="text-action">
          <ArrowDown weight="light" /> Why this score?
        </a>
        <Link href={`/proof/${id}`} className="text-action strong">
          View 0G proof <ArrowRight weight="light" />
        </Link>
      </div>

      <section className="report-section" id="score-breakdown">
        <div className="report-section-heading">
          <span>01</span>
          <div><h2>Score breakdown</h2><p>The result is the sum of these explicit contributions plus a 20-point readable-submission baseline.</p></div>
        </div>
        <div className="check-list">
          {record.checks.map((check) => (
            <div className={`check-row ${check.status}`} key={check.id}>
              <span className="check-icon"><CheckIcon status={check.status} /></span>
              <div><strong>{check.label}</strong><p>{check.detail}</p></div>
              <span className="contribution">{check.contribution > 0 ? "+" : ""}{check.contribution}</span>
            </div>
          ))}
          <div className="check-total"><span>Final proof score</span><strong>{record.proofScore}/100</strong></div>
        </div>
      </section>

      <section className="report-section extracted-section">
        <div className="report-section-heading">
          <span>02</span>
          <div><h2>What was extracted</h2><p>Fields recovered from the submitted document, not entered by the interface.</p></div>
        </div>
        <div className="extracted-grid">
          <div><span>Document title</span><strong>{record.extractedData?.title || "Not detected"}</strong></div>
          <div><span>Organization</span><strong>{record.extractedData?.organization || "Not detected"}</strong></div>
          <div><span>Document ID</span><strong>{record.extractedData?.documentId || "Not detected"}</strong></div>
          <div><span>Issuing authority</span><strong>{record.extractedData?.issuingAuthority || "Not detected"}</strong></div>
          <div><span>Pages</span><strong>{record.extractedData?.pageCount || "—"}</strong></div>
          <div><span>AI reasoning</span><strong>{record.aiProvider === "0g-compute" ? "0G Compute" : record.aiProvider === "openai" ? "OpenAI" : "Local checks only"}</strong></div>
        </div>
        <div className="claim-block">
          <span>Extracted claims</span>
          {record.extractedData?.claims.length ? (
            <ol>{record.extractedData.claims.map((claim, index) => <li key={`${claim}-${index}`}>{claim}</li>)}</ol>
          ) : <p>No explicit claim sentence was recovered.</p>}
        </div>
      </section>

      <section className="report-section">
        <div className="report-section-heading">
          <span>03</span>
          <div><h2>Evidence review</h2><p>Results from the public sources supplied with this verification.</p></div>
        </div>
        {record.evidence.length ? (
          <div className="evidence-list">
            {record.evidence.map((item) => (
              <a href={item.url} target="_blank" rel="noreferrer" key={item.url} className="evidence-row">
                <div><span>{item.status}</span><strong>{item.host}</strong><p>{item.detail}</p></div>
                <ArrowRight weight="light" />
              </a>
            ))}
          </div>
        ) : (
          <div className="evidence-empty"><Minus weight="light" /><div><strong>No evidence links supplied</strong><p>No external match points were added to the score.</p></div></div>
        )}
      </section>

      <aside className="report-disclaimer">
        <Warning weight="light" />
        <p><strong>Assessment, not a legal determination.</strong> ProofAI evaluates consistency and available evidence. A low-risk result does not guarantee authenticity.</p>
      </aside>
    </div>
  );
}
