import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <BrandMark />
          <p>Evidence-aware document verification, anchored on 0G.</p>
        </div>
        <div className="footer-links">
          <Link href="/dashboard">Dashboard</Link>
          <Link href="/verify">Verify a document</Link>
          <a href="https://docs.0g.ai/developer-hub/testnet/testnet-overview" target="_blank" rel="noreferrer">
            0G Galileo
          </a>
        </div>
      </div>
      <div className="footer-bottom">
        <span>ProofAI / Autonomous verification agent</span>
        <span>Assessment, not a guarantee of authenticity.</span>
      </div>
    </footer>
  );
}
