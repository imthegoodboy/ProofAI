import {
  ArrowDown,
  CheckCircle,
  FileText,
  Fingerprint,
  MagnifyingGlass,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import { ActionLink } from "@/components/action-link";
import { Reveal } from "@/components/reveal";

const investigationSteps = [
  {
    number: "01",
    title: "Extract",
    text: "Recover readable text, identity fields, dates, claims, and document metadata.",
    icon: FileText,
  },
  {
    number: "02",
    title: "Investigate",
    text: "Check formatting, internal consistency, file reuse, and supplied public evidence.",
    icon: MagnifyingGlass,
  },
  {
    number: "03",
    title: "Explain",
    text: "Calculate a transparent score where every addition and deduction is visible.",
    icon: ShieldCheck,
  },
  {
    number: "04",
    title: "Prove",
    text: "Encrypt the evidence on 0G Storage and anchor a compact proof on 0G Chain.",
    icon: Fingerprint,
  },
];

export default function HomePage() {
  return (
    <>
      <section className="hero section-shell">
        <div className="hero-copy">
          <Reveal>
            <span className="eyebrow">Autonomous document verification / 0G</span>
            <h1>
              Documents make claims.
              <em> ProofAI checks the evidence.</em>
            </h1>
            <p className="hero-lede">
              Upload a document. Receive an explainable consistency assessment, a clear risk score,
              and a tamper-resistant verification record—without pretending AI is infallible.
            </p>
            <div className="hero-actions">
              <ActionLink href="/verify">Verify a document</ActionLink>
              <ActionLink href="/dashboard" secondary>
                Open dashboard
              </ActionLink>
            </div>
          </Reveal>
        </div>

        <Reveal className="hero-visual" delay={120}>
          <div className="audit-shell">
            <div className="audit-card">
              <div className="audit-topline">
                <span>ProofAI investigation</span>
                <span className="live-label">
                  <i /> Live workflow
                </span>
              </div>
              <div className="document-glyph" aria-hidden="true">
                <span className="glyph-fold" />
                <span className="glyph-line long" />
                <span className="glyph-line" />
                <span className="glyph-line short" />
                <CheckCircle weight="light" />
              </div>
              <div className="audit-flow">
                <div><i className="done" /><span>Document fingerprinted</span><b>SHA-256</b></div>
                <div><i className="done" /><span>Claims extracted</span><b>Local + AI</b></div>
                <div><i className="active" /><span>Evidence compared</span><b>Source-aware</b></div>
                <div><i /><span>Proof anchored</span><b>0G Galileo</b></div>
              </div>
            </div>
          </div>
          <div className="hero-caption">
            <ArrowDown weight="light" />
            <span>One agent. A traceable chain of reasoning.</span>
          </div>
        </Reveal>
      </section>

      <section className="statement-section">
        <Reveal className="statement-inner">
          <span className="section-index">01 / The premise</span>
          <p>
            A polished PDF is not proof. <em>Consistency, corroboration, and provenance</em> are.
          </p>
        </Reveal>
      </section>

      <section className="workflow-section section-shell">
        <Reveal className="section-heading">
          <div>
            <span className="eyebrow">From file to verifiable record</span>
            <h2>A complete investigation,<br />{" "}not a binary guess.</h2>
          </div>
          <p>
            ProofAI separates what was observed, what could be confirmed, and what remains uncertain.
            The result stays useful even when an evidence source is unavailable.
          </p>
        </Reveal>
        <div className="workflow-grid">
          {investigationSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <Reveal key={step.number} className="workflow-item" delay={index * 70}>
                <div className="workflow-icon"><Icon weight="light" /></div>
                <span className="workflow-number">{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="architecture-section section-shell">
        <Reveal className="architecture-copy">
          <span className="eyebrow light">Proof that survives the interface</span>
          <h2>Evidence stays large.<br />{" "}<em>Proof stays lean.</em></h2>
          <p>
            Original documents and reports are encrypted before 0G Storage upload. A compact envelope
            containing the document hash, score, risk level, and storage roots is then recorded on the
            Galileo testnet.
          </p>
          <ActionLink href="https://docs.0g.ai/developer-hub/testnet/testnet-overview" external secondary>
            Explore 0G Galileo
          </ActionLink>
        </Reveal>
        <Reveal className="architecture-map" delay={120}>
          <div className="map-node source">
            <span>01</span><strong>Document</strong><small>Local encrypted source</small>
          </div>
          <div className="map-line"><i /><i /></div>
          <div className="map-destinations">
            <div className="map-node">
              <span>02A</span><strong>0G Storage</strong><small>Document + report</small>
            </div>
            <div className="map-node accent">
              <span>02B</span><strong>0G Chain</strong><small>Hash + score + roots</small>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="closing-section section-shell">
        <Reveal className="closing-card">
          <div>
            <span className="eyebrow">Begin an investigation</span>
            <h2>Turn a document into<br />{" "}a record you can inspect.</h2>
          </div>
          <div>
            <p>PDF, PNG, JPEG, or WebP. Up to 12 MB. Evidence links are optional.</p>
            <ActionLink href="/verify">Start verification</ActionLink>
          </div>
        </Reveal>
      </section>
    </>
  );
}
