import Link from "next/link";
import {
  ArrowRight,
  Check,
  Clock,
  Database,
  Hexagon,
  Pulse,
} from "@phosphor-icons/react/dist/ssr";
import { ActionLink } from "@/components/action-link";
import { ProcessBadge, RiskBadge } from "@/components/status-badge";
import { getIntegrationStatus } from "@/lib/config";
import { listVerifications } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { getOgNetworkHealth } from "@/lib/network";
import { getSessionHash } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const ownerHash = await getSessionHash();
  const [records, network] = await Promise.all([
    listVerifications(ownerHash, 25),
    getOgNetworkHealth(),
  ]);
  const integrations = getIntegrationStatus();
  const completed = records.filter((item) => item.status === "complete");
  const anchored = completed.filter((item) => item.chainTxHash);
  const average = completed.length
    ? Math.round(
        completed.reduce((sum, item) => sum + (item.proofScore || 0), 0) / completed.length,
      )
    : null;

  return (
    <div className="app-page section-shell">
      <header className="page-header dashboard-header">
        <div>
          <span className="eyebrow">Verification workspace</span>
          <h1 className="page-title">Your trust ledger.</h1>
          <p>Every analysis comes from a submitted document. No seeded records or sample scores.</p>
        </div>
        <ActionLink href="/verify">New verification</ActionLink>
      </header>

      <section className="metrics-row" aria-label="Verification summary">
        <div className="metric-block">
          <span>Completed</span>
          <strong>{completed.length}</strong>
          <small>of {records.length} total submissions</small>
        </div>
        <div className="metric-block">
          <span>Average proof score</span>
          <strong>{average === null ? "—" : average}</strong>
          <small>{average === null ? "No completed checks yet" : "Across completed checks"}</small>
        </div>
        <div className="metric-block">
          <span>Anchored on 0G</span>
          <strong>{anchored.length}</strong>
          <small>{integrations.chain ? "Signer configured" : "Signer setup required"}</small>
        </div>
      </section>

      <section className="dashboard-grid">
        <div className="records-panel">
          <div className="panel-heading">
            <div>
              <span className="eyebrow">Recent activity</span>
              <h2>Verifications</h2>
            </div>
            <span>{records.length} records</span>
          </div>

          {records.length ? (
            <div className="record-list">
              {records.map((record) => {
                const destination =
                  record.status === "complete" ? `/report/${record.id}` : `/verify/${record.id}`;
                return (
                  <Link href={destination} className="record-row" key={record.id}>
                    <div className="record-file">
                      <span className="file-monogram" aria-hidden="true">
                        {record.documentType.slice(0, 2).toUpperCase()}
                      </span>
                      <div>
                        <strong>{record.originalName}</strong>
                        <small>{record.id} · {formatDate(record.createdAt)}</small>
                      </div>
                    </div>
                    <div className="record-score">
                      {record.proofScore === null ? <ProcessBadge status={record.status} /> : <>
                        <strong>{record.proofScore}</strong><span>/100</span>
                      </>}
                    </div>
                    <RiskBadge risk={record.riskLevel} />
                    <span className="record-arrow"><ArrowRight weight="light" /></span>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="empty-records">
              <div className="empty-mark"><Hexagon weight="light" /></div>
              <h3>No verifications yet</h3>
              <p>Your first real document assessment will appear here.</p>
              <ActionLink href="/verify" secondary>Upload a document</ActionLink>
            </div>
          )}
        </div>

        <aside className="network-panel">
          <div className="network-heading">
            <span>Infrastructure</span>
            <span className={network.online ? "network-live" : "network-offline"}>
              <i /> {network.online ? "Network live" : "RPC unavailable"}
            </span>
          </div>
          <h2>0G Galileo</h2>
          <p>Chain ID {integrations.chainId}</p>
          <div className="network-details">
            <div>
              <Pulse weight="light" />
              <span>Latest observed block</span>
              <strong>{network.blockNumber?.toLocaleString() || "Unavailable"}</strong>
            </div>
            <div>
              <Database weight="light" />
              <span>Storage writer</span>
              <strong>{integrations.storage ? "Configured" : "Setup required"}</strong>
            </div>
            <div>
              <Check weight="light" />
              <span>Chain signer</span>
              <strong>{integrations.chain ? "Configured" : "Setup required"}</strong>
            </div>
            <div>
              <Clock weight="light" />
              <span>AI reasoning</span>
              <strong>{integrations.ai ? "Configured" : "Local checks"}</strong>
            </div>
          </div>
          {!integrations.chain && (
            <p className="network-note">
              Local verification works now. Add a funded testnet signer to create genuine storage and
              chain receipts.
            </p>
          )}
        </aside>
      </section>
    </div>
  );
}
