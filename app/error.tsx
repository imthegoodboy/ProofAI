"use client";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="not-found section-shell">
      <span className="eyebrow">Something went wrong</span>
      <h1>ProofAI could not render this view.</h1>
      <p>Your verification data has not been removed.</p>
      <button type="button" className="retry-anchor button-press" onClick={reset}>Try again</button>
    </div>
  );
}
