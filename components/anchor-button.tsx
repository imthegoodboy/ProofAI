"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowClockwise } from "@phosphor-icons/react";

export function AnchorButton({ id }: { id: string }) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  const retry = async () => {
    setWorking(true);
    setMessage("");
    try {
      const response = await fetch(`/api/verifications/${id}/anchor`, { method: "POST" });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok || payload.error) {
        throw new Error(payload.error || "0G anchoring failed.");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "0G anchoring failed.");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="anchor-action">
      <button type="button" className="retry-anchor button-press" onClick={retry} disabled={working}>
        <ArrowClockwise weight="light" /> {working ? "Requesting 0G receipts…" : "Retry 0G anchoring"}
      </button>
      {message && <p role="alert">{message}</p>}
    </div>
  );
}
