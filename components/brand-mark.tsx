export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <span />
        <span />
      </span>
      {compact ? <span className="sr-only">ProofAI</span> : <span className="brand-word">ProofAI</span>}
    </span>
  );
}
