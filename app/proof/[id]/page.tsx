import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CheckCircle,
  Database,
  Fingerprint,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { AnchorButton } from "@/components/anchor-button";
import { CopyValue } from "@/components/copy-value";
import { RiskBadge } from "@/components/status-badge";
import { config } from "@/lib/config";
import { getVerification } from "@/lib/db";
import { formatDate, truncateHash } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ProofPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const record = getVerification(id);
  if (!record) notFound();
  if (record.status !== "complete") redirect(`/verify/${id}`);
  const anchored = Boolean(record.chainTxHash);

  return (
    <div className="proof-page section-shell">
      <nav className="report-nav" aria-label="Verification views">
        <Link href={`/report/${id}`}>Assessment</Link>
        <Link href={`/proof/${id}`} className="active">0G proof</Link>
      </nav>
      <header className="proof-header">
        <Link href={`/report/${id}`} className="back-link"><ArrowLeft weight="light" /> Back to assessment</Link>
        <div className="proof-title-row">
          <div>
            <span className="eyebrow">Tamper-resistant record</span>
            <h1>{anchored ? "Proof anchored on 0G." : "Proof is ready to anchor."}</h1>
          </div>
          <span className={anchored ? "proof-seal anchored" : "proof-seal"}>
            {anchored ? <CheckCircle weight="light" /> : <Warning weight="light" />}
            {anchored ? "Recorded" : "Pending"}
          </span>
        </div>
      </header>

      <section className="proof-card-shell">
        <div className="proof-card">
          <div className="proof-card-top">
            <div><span>Verification ID</span><strong>{record.id}</strong></div>
            <RiskBadge risk={record.riskLevel} />
          </div>
          <div className="proof-primary">
            <span>Document fingerprint / SHA-256</span>
            <div><strong>{record.documentHash}</strong>{record.documentHash && <CopyValue value={record.documentHash} />}</div>
          </div>
          <div className="proof-grid">
            <div><span>Proof score</span><strong>{record.proofScore}/100</strong></div>
            <div><span>Risk level</span><strong>{record.riskLevel}</strong></div>
            <div><span>Verified by</span><strong>ProofAI Auditor</strong></div>
            <div><span>Completed</span><strong>{formatDate(record.updatedAt)}</strong></div>
          </div>
        </div>
      </section>

      <section className="receipts-section">
        <div className="receipt-column">
          <div className="receipt-heading"><Database weight="light" /><div><span>Encrypted evidence</span><h2>0G Storage</h2></div></div>
          <div className="receipt-fields">
            <div><span>Document root</span><strong title={record.storageDocumentRoot || undefined}>{truncateHash(record.storageDocumentRoot)}</strong>{record.storageDocumentRoot && <CopyValue value={record.storageDocumentRoot} />}</div>
            <div><span>Report root</span><strong title={record.storageReportRoot || undefined}>{truncateHash(record.storageReportRoot)}</strong>{record.storageReportRoot && <CopyValue value={record.storageReportRoot} />}</div>
            <div><span>Storage transaction</span><strong title={record.storageTxHash || undefined}>{truncateHash(record.storageTxHash)}</strong>{record.storageTxHash && <CopyValue value={record.storageTxHash} />}</div>
          </div>
          {record.storageError && <p className="receipt-error">{record.storageError}</p>}
          {record.storageDocumentRoot && (
            <a className="receipt-link" href={`${config.og.storageExplorer}/file/${record.storageDocumentRoot}`} target="_blank" rel="noreferrer">
              Open storage explorer <ArrowUpRight weight="light" />
            </a>
          )}
        </div>

        <div className="receipt-column chain">
          <div className="receipt-heading"><Fingerprint weight="light" /><div><span>Proof envelope</span><h2>0G Chain</h2></div></div>
          <div className="receipt-fields">
            <div><span>Network</span><strong>Galileo testnet</strong></div>
            <div><span>Chain ID</span><strong>{config.og.chainId}</strong></div>
            <div><span>Transaction</span><strong title={record.chainTxHash || undefined}>{truncateHash(record.chainTxHash)}</strong>{record.chainTxHash && <CopyValue value={record.chainTxHash} />}</div>
            <div><span>Block</span><strong>{record.chainBlock?.toLocaleString() || "Not available"}</strong></div>
          </div>
          {record.chainError && <p className="receipt-error">{record.chainError}</p>}
          {record.chainTxHash && (
            <a className="receipt-link" href={`${config.og.chainExplorer}/tx/${record.chainTxHash}`} target="_blank" rel="noreferrer">
              View on ChainScan <ArrowUpRight weight="light" />
            </a>
          )}
        </div>
      </section>

      {!anchored && (
        <section className="anchor-prompt">
          <div><span className="eyebrow">No fabricated receipts</span><h2>The assessment is complete. The on-chain write is not.</h2><p>{record.chainError || "Configure a funded Galileo signer, then retry this proof."}</p></div>
          <AnchorButton id={record.id} />
        </section>
      )}
    </div>
  );
}
