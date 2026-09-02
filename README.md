# ProofAI

ProofAI is an evidence-aware document verification application for the 0G Galileo testnet. It extracts document content, identifies claims and identity fields, checks metadata and duplicates, compares user-supplied public evidence, calculates an explainable proof score, encrypts the document and report for 0G Storage, and anchors a compact proof envelope on 0G Chain.

ProofAI reports an assessment—not a guarantee of legal authenticity.

## Run locally

Requirements: Node.js 22.5 or newer (ProofAI uses the built-in SQLite module).

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Local document verification works without external credentials. Image OCR downloads Tesseract language data on first use and can take longer than text-based PDF extraction.

## Enable real 0G writes

1. Create a dedicated testnet wallet. Never use a mainnet or personal wallet key.
2. Fund it from the [official 0G faucet](https://faucet.0g.ai/).
3. Set `OG_PRIVATE_KEY` in `.env.local`.
4. Keep the default Galileo RPC, chain ID, and Turbo Storage indexer from `.env.example`, or replace them with current official endpoints.

When configured, ProofAI encrypts the original document and JSON report with AES-256, uploads both using the official 0G Storage SDK, and then writes a versioned proof envelope to a self-addressed 0G Chain transaction. The private key and storage decryption key never enter client responses.

If any network operation fails, the report remains available locally and the proof page shows the real error with a retry action. It never synthesizes transaction hashes or storage roots.

## Enable deeper AI review

Set `OPENAI_API_KEY` and optionally `OPENAI_MODEL`. Without them, ProofAI uses its local extraction, consistency, duplicate, metadata, and evidence checks. The UI labels which mode produced the review.

## Verification flow

```text
Upload → SHA-256 → PDF text / image OCR → field & claim extraction
       → metadata + date + duplicate checks → evidence URL comparison
       → explainable score → encrypted 0G Storage → 0G Chain receipt
```

Uploaded files and SQLite data live under `PROOFAI_DATA_DIR` (default `./data`) and are excluded from version control. Use a durable encrypted disk and an external secrets manager for production.

## Commands

```bash
npm run dev      # development server
npm run lint     # ESLint
npm test         # unit tests
npm run build    # production build
npm start        # production server
```

## Security notes

- Uploads are restricted to PDF, PNG, JPEG, and WebP and capped at 12 MB by default.
- Evidence URLs are limited to public HTTP(S) endpoints; loopback and private network addresses are rejected.
- 0G and AI credentials stay server-side.
- 0G documents are encrypted before upload. The encryption key is stored only in the local database for future retrieval workflows.
- This MVP uses a single server-side Galileo writer. A production multi-tenant deployment should add authentication, per-organization encryption keys, rate limiting, malware scanning, and durable database/object storage.
