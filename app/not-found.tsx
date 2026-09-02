import { ActionLink } from "@/components/action-link";

export default function NotFound() {
  return (
    <div className="not-found section-shell">
      <span className="eyebrow">404 / Record not found</span>
      <h1>This proof is not in the ledger.</h1>
      <p>Check the verification ID or return to your workspace.</p>
      <ActionLink href="/dashboard">Open dashboard</ActionLink>
    </div>
  );
}
