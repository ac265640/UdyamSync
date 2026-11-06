# UdyamSync — Data privacy & security note (1 page)

We treat the synthetic case data as if it were real customer data, designed for the **Digital Personal Data Protection Act, 2023** and the **DPDP Rules, 2025** (notified 13 Nov 2025, phased over 18 months; the consent-manager rule applies from 13 Nov 2026).

**1. Lawful basis and purpose limitation.** Processing rests on consent, recorded **per purpose**:
- Verifying the business to activate service. This one is required, because DoT telecom licensing requires KYC.
- Order updates on WhatsApp/SMS. Optional.
- Sharing a business summary with a local partner. Optional, off by default.
- Marketing. Optional, off by default.

KYC data is never reused for marketing. Each consent record stores the notice version the person saw.

**2. Data minimisation.** Each step asks only what it needs:
- A GSTIN lookup replaces typing the business details.
- The **Aadhaar number is never collected**. DigiLocker and e-sign return a verified yes/no and a reference.
- Partners see a masked business summary and never documents.
- The order form stores the e-sign certificate reference, not the OTP.

**3. Masking everywhere.**
- GSTIN, Udyam, phone and ID numbers are masked in the UI and in every API response.
- A logging filter redacts identifiers from every log line.
- Chat messages are stored redacted.
- Text sent to the optional AI provider is redacted first.

**4. Encryption and where data goes.**
- The raw GSTIN and every uploaded document image are encrypted at rest (Fernet: AES-128-CBC + HMAC-SHA256; production uses KMS keys).
- **OCR runs on our own server.** Document images never go to a third-party AI.
- Registry checks are lookups.

**5. Storage limitation.**
- Document images are purged automatically **30 days after verification** (configurable). An hourly job enforces it, and the owner sees the deletion date.
- Masked extracted fields are kept for the contract plus the audit period telecom rules require.
- Abandoned sessions can be erased.

**6. Consent you can audit.** The consent ledger is append-only and **hash-chained with an HMAC**. Editing or deleting any record breaks the chain, and a test checks this. Every access and change goes to an append-only audit log.

**7. Data-principal rights, in the product.** The **My Data** page lets the owner:
- see their profile, documents (with deletion dates), consents, orders and activity
- download it all as JSON
- withdraw or grant each consent
- **erase** their data, which deletes files, profile, chat and leads and keeps only an audit record of the erasure.

A grievance officer contact is in the notice, with a 7-day response time.

**8. Security controls.**
- The server re-prices and re-checks every order, so a tampered client can't buy an ineligible product.
- Uploads are restricted to PNG/JPEG/WEBP under 6 MB.
- Partner views are restricted by role.
- The AI is guarded against prompt injection, and any ₹ amount it invents is discarded.
- Secrets live only in `.env`, never in the repo.
- The CI runs 63 tests, including consent-chain tamper detection, encryption at rest and erasure.

**Prototype honesty.**
- The registries, DigiLocker, e-sign, UPI AutoPay and the WhatsApp Business API are simulated.
- The optional free-tier AI may retain prompts. That is acceptable here only because all data is synthetic and redacted first. Production would use a paid no-training tier or a self-hosted model.
