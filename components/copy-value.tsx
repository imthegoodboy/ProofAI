"use client";

import { useState } from "react";
import { Check, Copy } from "@phosphor-icons/react";

export function CopyValue({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy-value"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      }}
      aria-label={copied ? "Copied" : "Copy value"}
    >
      {copied ? <Check weight="light" /> : <Copy weight="light" />}
    </button>
  );
}
