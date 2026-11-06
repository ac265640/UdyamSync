import { Database, EyeOff, FileLock2, Fingerprint, KeyRound, Scale, Timer, UserCheck } from 'lucide-react'
import { Link } from 'react-router-dom'

const POINTS = [
  { icon: Scale, title: 'Lawful basis & purpose', text: 'Consent under the DPDP Act, 2023, captured per purpose. KYC data is used only to verify the business and activate service, as DoT telecom licensing requires. Marketing and partner sharing are separate, optional, off by default.' },
  { icon: EyeOff, title: 'Data minimisation', text: 'Each step asks only what it needs. GSTIN/Udyam lookups replace typing. Aadhaar numbers are never collected — DigiLocker and e-sign return a yes/no and a reference. Partners see a business summary, never documents.' },
  { icon: Fingerprint, title: 'Masking everywhere', text: 'GSTIN, Udyam, phone and ID numbers are masked in the UI, in API responses and in logs (a redaction filter runs on every log line). Text sent to the optional AI is redacted first.' },
  { icon: FileLock2, title: 'Encryption at rest', text: 'Raw identifiers and document images are encrypted (AES + HMAC, key from a managed secret). Document OCR runs on our own server — images are never sent to a third-party AI.' },
  { icon: Timer, title: 'Storage limitation', text: 'Document images are purged automatically a fixed number of days after verification (default 30). Masked extracted fields are kept for the contract plus the audit period telecom rules require.' },
  { icon: KeyRound, title: 'Tamper-evident consent ledger', text: 'Every grant and withdrawal is a hash-chained, HMAC-sealed record tied to a versioned notice — editing any record breaks the chain and is detected.' },
  { icon: UserCheck, title: 'Rights in the product', text: 'The "My Data" page lets the owner see what we hold, download a consent receipt, withdraw consent and erase their data. Grievance officer responds within 7 days; complaints can go to the Data Protection Board.' },
  { icon: Database, title: 'Security controls', text: 'Server-side re-pricing and rule checks (a client can never sneak in an ineligible product), upload type/size validation, role-based partner views, append-only audit log, no secrets in the repo.' },
]

export default function Privacy() {
  const sid = (() => { try { return JSON.parse(localStorage.getItem('udyamsync.journey') || 'null')?.sid } catch { return null } })()
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="pill bg-[#e7f2ea] text-leaf">1-page note · privacy &amp; security choices</div>
      <h1 className="display mt-2 text-[2.8rem]">Privacy by design, not by PDF</h1>
      <p className="mt-2 max-w-3xl text-muted">We treat the synthetic case data as if it were real customer data. The DPDP Rules were notified on 13 Nov 2025 with an 18-month rollout; the consent-manager rule takes effect on 13 Nov 2026 — UdyamSync's per-purpose consent ledger is built to plug into a registered consent manager.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {POINTS.map((p) => (
          <div key={p.title} className="card p-5">
            <p.icon className="text-brand" />
            <h3 className="mt-2 font-semibold">{p.title}</h3>
            <p className="mt-1 text-sm text-muted">{p.text}</p>
          </div>
        ))}
      </div>
      <div className="card mt-6 p-5 text-sm text-muted">
        <b className="text-ink">Prototype honesty:</b> GSTIN/Udyam registries, DigiLocker, e-sign, UPI AutoPay and WhatsApp are simulated. The optional AI (Gemini/Groq free tier) may retain prompts, which is acceptable only because all data is synthetic and redacted first; production would use a paid no-training tier or a self-hosted model.
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        {sid ? <Link className="btn-primary" to={`/my-data/${sid}`}>Open My Data for your session</Link> : <Link className="btn-primary" to="/start">Start a session to see My Data</Link>}
        <a className="btn-ghost" href="https://github.com/ac265640/UdyamSync/blob/main/docs/PRIVACY_NOTE.md" target="_blank" rel="noreferrer">Read the full note</a>
      </div>
    </div>
  )
}
