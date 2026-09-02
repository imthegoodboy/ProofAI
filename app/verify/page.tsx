import { LockKey, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { UploadForm } from "@/components/upload-form";

export default function VerifyPage() {
  return (
    <div className="app-page section-shell upload-page">
      <header className="page-header upload-header">
        <div>
          <span className="eyebrow">New investigation</span>
          <h1 className="page-title">Verify a document.</h1>
        </div>
        <p>
          Submit one document at a time. Add official or public evidence links when you have them;
          ProofAI will never infer a match from an unavailable source.
        </p>
      </header>
      <div className="upload-layout">
        <UploadForm />
        <aside className="upload-aside">
          <div>
            <ShieldCheck weight="light" />
            <h2>What ProofAI checks</h2>
            <ul>
              <li>Readable structure and key identity fields</li>
              <li>Date, metadata, and typography consistency</li>
              <li>Duplicate file fingerprints</li>
              <li>Matches against the evidence links you provide</li>
            </ul>
          </div>
          <div>
            <LockKey weight="light" />
            <h2>Privacy by design</h2>
            <p>
              Files remain local unless a 0G signer is configured. 0G uploads are AES-256 encrypted
              before leaving the server.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
