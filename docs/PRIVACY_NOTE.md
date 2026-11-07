# UdyamSync — Data privacy & security note (1 page)

**Team Softmax · Deliverable 4 of 4.** Printable one-page version: [UdyamSync_Privacy_Note.pdf](https://ac265640.github.io/UdyamSync/UdyamSync_Privacy_Note.pdf).

Built for the **Digital Personal Data Protection Act, 2023** and the DPDP Rules, 2025. The case data is synthetic, but we treat it as real. Personal data here means the proprietor's, partners' and signatory's details (name, phone, ID, address, GSTIN of a proprietorship).

## 1. Who is responsible: roles under the DPDP Act

| Party | DPDP role | What they may do with personal data |
|---|---|---|
| Accel Telecom (Accel Business) | **Data Fiduciary** | Decides the purposes and means; owns the notice, consent, retention, breach reporting and grievance duties. |
| UdyamSync platform, cloud host, OCR | Data Processor | Processes only on Accel's written instructions. OCR runs on our own servers, so no third-party AI ever sees document images. |
| Channel partners | Data Processor (by contract) | See a masked lead summary only, and only if the owner consents to partner sharing. They may not reuse it or keep copies. |
| WhatsApp BSP, e-sign ASP, UPI/NPCI, optional LLM | Data Processors | Each gets the minimum it needs. The LLM gets redacted text only. |
| Business owner / signatory | Data Principal | Can see, export, correct, withdraw consent and erase via **My Data**. Grievances are answered within 7 days. |

## 2. Consent, per purpose, before any upload
- **Verification for activation:** required, because DoT licensing mandates subscriber KYC. Without it the upload API returns 403.
- **Order updates on WhatsApp/SMS:** optional.
- **Sharing with a local partner:** optional, **off by default**. Only with it does a stalled lead reach the Partner Co-Pilot, and then as a masked summary.
- **WhatsApp win-back / marketing:** optional, **off by default**.
  - Dropped leads are re-contacted only if they opted in.
  - Historical leads without consent get no message until fresh consent is taken through a channel they already use.
  - Every message carries an opt-out.
- **Each consent record stores the notice version shown.** Withdrawing is as easy as giving, and KYC data is never reused for marketing.

## 3. Data minimisation and purpose limitation
- **Less typing:** a GSTIN or Udyam lookup replaces typing the business details.
- **The Aadhaar number is never collected.** DigiLocker and e-sign return a verified yes/no and a reference ID. We store the e-sign certificate reference, never the OTP.
- **Masking:**
  - GSTIN, Udyam, phone and ID numbers are masked in the UI, in API responses and in logs; a redaction filter runs on every log line.
  - Chat is stored redacted.
- **No reuse of KYC data:** it never feeds marketing or the propensity model. The model uses business attributes only (type, size, sites, spend).

## 4. Security controls
- **Encryption at rest:** raw identifiers and document images are encrypted (Fernet: AES-128-CBC + HMAC-SHA256). Production uses KMS-managed, rotated keys.
- **Server-side checks:** the server re-prices and re-checks every order, so a tampered client cannot buy an ineligible product.
- **Uploads and access:**
  - Uploads must be PNG, JPEG or WEBP under 6 MB.
  - Partner views are role-based.
  - Every access goes to an append-only audit log.
- **LLM guardrails:** the LLM is guarded against prompt injection, and any ₹ amount it invents is discarded.
- **Secrets** live only in `.env`, never in the repo.

## 5. Auditable consent and breach response
- **Tamper-evident ledger:** the consent ledger is append-only, **hash-chained and HMAC-sealed**. Editing or deleting any record breaks the chain, and a CI test proves it.
- **Breaches:** on a personal-data breach, Accel as Data Fiduciary informs the Data Protection Board and affected owners. The audit log and the ledger give the timeline.
- **Consent Manager:** the ledger is built to plug into a registered Consent Manager.

## 6. Storage limitation, and how it fits telecom KYC record-keeping
- **Document images are purged after 30 days.** These are the photos of certificates and IDs; the purge runs automatically 30 days after verification, and the owner sees the date. It is a setting (`DOC_RETENTION_DAYS`), not hard-coded.
- **The KYC record itself is kept**, encrypted, for the contract term plus the retention period the telecom licence and DoT KYC instructions prescribe. It holds:
  - masked extracted fields
  - registry and DigiLocker/e-sign reference IDs
  - the verification verdict and timestamps
- **Abandoned sessions** can be erased at any time from My Data.

> **Open item for Accel's regulatory team:** we have not confirmed whether the licence requires the document *image* itself to be kept for the full retention period. If it does, the image purge moves to the end of that period, with images still encrypted and every access logged. It is a single configuration change.

## Prototype honesty
- **Simulated services:** the GSTIN and Udyam registries, DigiLocker, e-sign, UPI AutoPay and the WhatsApp channel are simulated behind production-shaped interfaces. The WhatsApp screen is a WhatsApp-style web client, not the WhatsApp Business API.
- **LLM:** the optional free-tier LLM may retain prompts. That is acceptable only because all data is synthetic and redacted first. Production would use a no-training enterprise tier or a self-hosted model.
