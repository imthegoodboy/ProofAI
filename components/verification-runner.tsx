"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  CircleNotch,
  FileText,
  Fingerprint,
  MagnifyingGlass,
  ShieldCheck,
} from "@phosphor-icons/react";
import type { Verification } from "@/lib/types";

const steps = [
  { at: 6, label: "Document received", detail: "Encrypted local copy created", icon: FileText },
  { at: 14, label: "Fingerprint generated", detail: "SHA-256 content identity", icon: Fingerprint },
  { at: 28, label: "Content extracted", detail: "Text, fields, dates, and claims", icon: MagnifyingGlass },
  { at: 46, label: "Consistency reviewed", detail: "Structure, metadata, and reuse", icon: ShieldCheck },
  { at: 72, label: "Proof score calculated", detail: "Every contribution explained", icon: Check },
  { at: 81, label: "0G proof requested", detail: "Encrypted storage and chain receipt", icon: Fingerprint },
];

export function VerificationRunner({ initial }: { initial: Verification }) {
  const router = useRouter();
  const [record, setRecord] = useState(initial);
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const read = async () => {
      try {
        const response = await fetch(`/api/verifications/${initial.id}`, { cache: "no-store" });
        const payload = (await response.json()) as { verification?: Verification };
        if (!cancelled && payload.verification) {
          setRecord(payload.verification);
          if (payload.verification.status === "complete") {
            timer = setTimeout(() => router.replace(`/report/${initial.id}`), 700);
            return;
          }
          if (payload.verification.status === "failed") return;
        }
      } catch {
        if (!cancelled) setMessage("Connection interrupted. Retrying…");
      }
      if (!cancelled) timer = setTimeout(read, 1100);
    };

    const run = async () => {
      if (started.current) return;
      started.current = true;
      try {
        const response = await fetch(`/api/verifications/${initial.id}/run`, { method: "POST" });
        const payload = (await response.json()) as { error?: string; verification?: Verification };
        if (!cancelled && payload.verification) setRecord(payload.verification);
        if (!response.ok && response.status !== 202 && !cancelled) {
          setMessage(payload.error || "Verification stopped unexpectedly.");
        }
      } catch {
        if (!cancelled) setMessage("The verification request was interrupted. Status checks will continue.");
      }
    };

    if (initial.status === "complete") {
      router.replace(`/report/${initial.id}`);
      return;
    }
    void run();
    void read();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [initial.id, initial.status, router]);

  const failed = record.status === "failed";

  return (
    <div className="agent-page section-shell">
      <div className="agent-intro">
        <span className="eyebrow">ProofAI Auditor / Active</span>
        <h1>{failed ? "The investigation stopped." : "Following the evidence."}</h1>
        <p>{record.originalName}</p>
      </div>
      <div className="agent-layout">
        <section className="agent-progress-shell" aria-live="polite">
          <div className="agent-progress-card">
            <div className="agent-status-line">
              <span>{record.id}</span>
              <span>{record.progress}%</span>
            </div>
            <div className="progress-track" aria-label={`${record.progress}% complete`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={record.progress}>
              <span style={{ transform: `scaleX(${record.progress / 100})` }} />
            </div>
            <div className="agent-current">
              {!failed && <CircleNotch className="spin" weight="light" />}
              <div>
                <span>{failed ? "Needs attention" : "Current operation"}</span>
                <strong>{record.currentStep}</strong>
              </div>
            </div>
            {message && <p className="agent-message">{message}</p>}
            {failed && (
              <button className="retry-button" type="button" onClick={() => window.location.reload()}>
                Retry analysis
              </button>
            )}
          </div>
        </section>
        <ol className="agent-steps">
          {steps.map((step) => {
            const complete = record.progress > step.at;
            const active = record.progress >= step.at && !complete && !failed;
            const Icon = step.icon;
            return (
              <li key={step.label} className={`${complete ? "complete" : ""} ${active ? "active" : ""}`}>
                <span className="step-icon">{complete ? <Check weight="light" /> : <Icon weight="light" />}</span>
                <div><strong>{step.label}</strong><small>{step.detail}</small></div>
                <span className="step-state">{complete ? "Done" : active ? "Working" : "Queued"}</span>
              </li>
            );
          })}
        </ol>
      </div>
      <p className="agent-footnote">
        Keep this page open while image OCR or testnet finality is in progress. No score is shown until
        the assessment is complete.
      </p>
    </div>
  );
}
