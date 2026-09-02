"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  File,
  LinkSimple,
  Plus,
  Trash,
  UploadSimple,
} from "@phosphor-icons/react";

const documentTypes = ["Certificate", "Invoice", "License", "Report", "Other"];
const supportedTypes = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const maxBytes = 4 * 1024 * 1024;

function sizeLabel(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("Certificate");
  const [urls, setUrls] = useState([""]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const acceptFile = (nextFile: File | undefined) => {
    setError("");
    if (!nextFile) return;
    if (!supportedTypes.includes(nextFile.type)) {
      setError("Choose a PDF, PNG, JPEG, or WebP document.");
      return;
    }
    if (nextFile.size > maxBytes) {
      setError("The document exceeds the 12 MB limit.");
      return;
    }
    setFile(nextFile);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) {
      setError("Choose a document before starting verification.");
      return;
    }
    setSubmitting(true);
    setError("");
    const form = new FormData();
    form.set("document", file);
    form.set("documentType", documentType.toLowerCase());
    form.set("evidenceUrls", JSON.stringify(urls.map((url) => url.trim()).filter(Boolean)));
    try {
      const response = await fetch("/api/verifications", { method: "POST", body: form });
      const payload = (await response.json()) as {
        error?: string;
        verification?: { id: string };
      };
      if (!response.ok || !payload.verification) {
        throw new Error(payload.error || "The upload could not be saved.");
      }
      router.push(`/verify/${payload.verification.id}`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed.");
      setSubmitting(false);
    }
  };

  return (
    <form className="upload-form-shell" onSubmit={submit}>
      <div className="upload-form">
        <div className="form-section">
          <div className="form-section-heading">
            <span>01</span>
            <div><h2>Document</h2><p>One file, up to 4 MB</p></div>
          </div>
          <div
            className={`drop-zone ${dragging ? "dragging" : ""} ${file ? "has-file" : ""}`}
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              acceptFile(event.dataTransfer.files[0]);
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(event) => acceptFile(event.target.files?.[0])}
              aria-label="Choose document"
            />
            {file ? (
              <div className="selected-file">
                <span className="selected-file-icon"><File weight="light" /></span>
                <div><strong>{file.name}</strong><small>{sizeLabel(file.size)} · ready to analyze</small></div>
                <button type="button" onClick={() => { setFile(null); if (inputRef.current) inputRef.current.value = ""; }} aria-label="Remove file">
                  <Trash weight="light" />
                </button>
              </div>
            ) : (
              <button type="button" className="drop-prompt" onClick={() => inputRef.current?.click()}>
                <span><UploadSimple weight="light" /></span>
                <strong>Drop your document here</strong>
                <small>or choose from your device · PDF, PNG, JPEG, WebP</small>
              </button>
            )}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-heading">
            <span>02</span>
            <div><h2>Document type</h2><p>Helps tune field extraction</p></div>
          </div>
          <div className="type-options" role="radiogroup" aria-label="Document type">
            {documentTypes.map((type) => (
              <label key={type} className={documentType === type ? "selected" : ""}>
                <input
                  type="radio"
                  name="documentType"
                  value={type}
                  checked={documentType === type}
                  onChange={() => setDocumentType(type)}
                />
                <span>{type}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-heading">
            <span>03</span>
            <div><h2>Evidence sources</h2><p>Optional · public URLs only</p></div>
          </div>
          <div className="evidence-inputs">
            {urls.map((url, index) => (
              <div className="url-input" key={index}>
                <LinkSimple weight="light" />
                <input
                  type="url"
                  value={url}
                  onChange={(event) => setUrls((current) => current.map((item, itemIndex) => itemIndex === index ? event.target.value : item))}
                  placeholder="https://issuer.example/verify/..."
                  aria-label={`Evidence source ${index + 1}`}
                />
                {urls.length > 1 && (
                  <button type="button" onClick={() => setUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove evidence source ${index + 1}`}>
                    <Trash weight="light" />
                  </button>
                )}
              </div>
            ))}
            {urls.length < 3 && (
              <button type="button" className="add-source" onClick={() => setUrls((current) => [...current, ""])}>
                <Plus weight="light" /> Add another source
              </button>
            )}
          </div>
        </div>

        {error && <p className="form-error" role="alert">{error}</p>}

        <button type="submit" className="submit-verification button-press" disabled={submitting}>
          <span>{submitting ? "Securing upload…" : "Start verification"}</span>
          <span className="button-orb" aria-hidden="true"><ArrowRight weight="light" /></span>
        </button>
      </div>
    </form>
  );
}
