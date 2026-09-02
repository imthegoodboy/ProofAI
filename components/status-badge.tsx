import type { RiskLevel, VerificationStatus } from "@/lib/types";

export function RiskBadge({ risk }: { risk: RiskLevel }) {
  if (!risk) return <span className="status-badge neutral">Pending</span>;
  return <span className={`status-badge risk-${risk}`}>{risk} risk</span>;
}

export function ProcessBadge({ status }: { status: VerificationStatus }) {
  return <span className={`status-badge process-${status}`}>{status}</span>;
}
