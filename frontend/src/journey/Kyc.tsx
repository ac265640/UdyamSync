import { ArrowLeft, ArrowRight, Camera, ChevronDown, FileCheck2, Fingerprint, Lock, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, type KycCase } from '../api'
import { ErrorNote, Spinner, StatusIcon, Verdict } from '../components/ui'

const SLOTS: { key: string; label: string; hint: string }[] = [
  { key: 'gst_certificate', label: 'GST registration certificate', hint: 'Or skip — we already fetched it from the GST registry if you gave your GSTIN' },
  { key: 'udyam_certificate', label: 'Udyam certificate', hint: 'PDF screenshot or photo' },
  { key: 'signatory_id', label: 'Authorised signatory ID', hint: 'Or verify in 30 seconds with DigiLocker' },
  { key: 'address_proof', label: 'Address proof', hint: 'Electricity / water / landline bill from the last 90 days' },
]

export default function Kyc({ sid, onBack, onContinue }: { sid: string; lang: string; onBack: () => void; onContinue: () => void }) {
  const [consented, setConsented] = useState<boolean | null>(null)
  const [kc, setKc] = useState<KycCase | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getConsent(sid).then((c) => setConsented(!!c.state.kyc_verification?.granted))
    api.kycCase(sid).then(setKc)
  }, [sid])

  if (consented === null) return <div className="p-6"><Spinner /></div>
  if (!consented) return <Consent sid={sid} onDone={() => setConsented(true)} onBack={onBack} />

  const run = async (label: string, fn: () => Promise<KycCase>) => {
    setBusy(label)
    setError(null)
    try { setKc(await fn()) } catch (e) { setError((e as Error).message) } finally { setBusy(null) }
  }
  const r = kc?.result
  const canContinue = r && r.verdict !== 'action_needed' && (kc?.missing.length ?? 4) === 0

  return (
    <div className="flex h-[34rem] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500"><ArrowLeft size={14} /> OneBill</button>
        <h2 className="mt-2 text-lg font-bold">Verify your business</h2>
        <p className="text-xs text-slate-500">Take photos with your phone. We read them instantly, check them against the GST & Udyam registries, and tell you exactly what to fix.</p>

        <div className="mt-3 space-y-2">
          {SLOTS.map((s) => (
            <Slot key={s.key} slot={s} kc={kc} busy={busy === s.key}
              onFile={(f) => run(s.key, () => api.upload(sid, s.key, f))}
              onRemove={() => run(s.key, () => api.removeDoc(sid, s.key))}
              extra={s.key === 'signatory_id' && !kc?.docs.signatory_id ? <DigiLocker busy={busy === 'dl'} verified={!!kc?.digilocker} onVerify={(n, d) => run('dl', () => api.digilocker(sid, n, d))} /> : null}
            />
          ))}
        </div>

        <details className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <summary className="cursor-pointer font-semibold text-slate-700">Demo: load a specimen applicant (K01–K12)</summary>
          <p className="mt-1">Loads the case pack's documents as if you photographed them — some have planted problems.</p>
          <div className="mt-2 grid grid-cols-6 gap-1">
            {Array.from({ length: 12 }, (_, i) => `K${String(i + 1).padStart(2, '0')}`).map((k) => (
              <button key={k} onClick={() => run('sample', () => api.useSample(sid, k))} className="rounded-lg bg-white py-1 font-mono ring-1 ring-slate-200 hover:ring-[var(--brand)]">{k}</button>
            ))}
          </div>
        </details>

        {busy && <div className="mt-3"><Spinner label="Reading documents and checking registries…" /></div>}
        <ErrorNote error={error} />

        {r && (
          <div className="fade-in mt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Verification result</h3>
              <Verdict verdict={r.verdict} label={r.verdict_label} />
            </div>
            <ul className="mt-2 space-y-1.5">
              {[...r.checks].sort((a, b) => ['fail', 'warn', 'pass'].indexOf(a.status) - ['fail', 'warn', 'pass'].indexOf(b.status)).map((c) => (
                <li key={c.id} className={`rounded-xl p-2.5 text-xs ring-1 ${c.status === 'fail' ? 'bg-rose-50 ring-rose-200' : c.status === 'warn' ? 'bg-amber-50 ring-amber-200' : 'bg-white ring-slate-200'}`}>
                  <div className="flex gap-2">
                    <StatusIcon status={c.status} size={16} />
                    <div>
                      <div className="font-semibold text-slate-800">{c.label}</div>
                      <div className="text-slate-600">{c.message}</div>
                      {c.fix && c.status !== 'pass' && <div className="mt-1 font-medium text-slate-800">👉 {c.fix}</div>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <button onClick={onContinue} disabled={!canContinue} className="btn-primary w-full">
          {canContinue ? <>Continue to e-sign &amp; pay <ArrowRight size={16} /></> : kc?.missing.length ? `Add ${kc.missing.length} more document${kc.missing.length > 1 ? 's' : ''}` : 'Fix the items above to continue'}
        </button>
        <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-slate-400"><Lock size={10} /> Encrypted · masked · images auto-deleted after verification</p>
      </div>
    </div>
  )
}

function Slot({ slot, kc, busy, onFile, onRemove, extra }: { slot: { key: string; label: string; hint: string }; kc: KycCase | null; busy: boolean; onFile: (f: File) => void; onRemove: () => void; extra?: React.ReactNode }) {
  const ref = useRef<HTMLInputElement>(null)
  const doc = kc?.docs[slot.key]
  const checks = kc?.result?.checks.filter((c) => c.doc === slot.key) ?? []
  const worst = checks.some((c) => c.status === 'fail') ? 'fail' : checks.some((c) => c.status === 'warn') ? 'warn' : doc ? 'pass' : null
  const viaDl = slot.key === 'signatory_id' && kc?.digilocker && !doc
  return (
    <div className="rounded-xl p-3 ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${doc || viaDl ? 'bg-emerald-50' : 'bg-slate-100'}`}>
          {worst ? <StatusIcon status={worst} /> : viaDl ? <StatusIcon status="pass" /> : <FileCheck2 size={18} className="text-slate-400" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{slot.label}</div>
          <div className="truncate text-[11px] text-slate-500">
            {viaDl ? 'Verified via DigiLocker' : doc ? Object.entries(doc.fields).filter(([k]) => !k.startsWith('_') && k !== 'gstin_raw').slice(0, 2).map(([, v]) => v).join(' · ') || 'Uploaded' : slot.hint}
          </div>
        </div>
        <input ref={ref} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        {doc ? (
          <button onClick={onRemove} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" title="Remove"><Trash2 size={16} /></button>
        ) : (
          <button onClick={() => ref.current?.click()} disabled={busy} className="btn-ghost !px-3 !py-1.5 text-xs"><Camera size={14} /> {busy ? '…' : 'Photo'}</button>
        )}
      </div>
      {extra}
    </div>
  )
}

function DigiLocker({ onVerify, busy, verified }: { onVerify: (name: string, desig: string) => void; busy: boolean; verified: boolean }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [desig, setDesig] = useState('Owner')
  if (verified) return null
  return (
    <div className="mt-2">
      {!open ? (
        <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1e3a8a] py-2 text-xs font-semibold text-white"><Fingerprint size={14} /> Verify with DigiLocker instead</button>
      ) : (
        <div className="space-y-2 rounded-lg bg-blue-50 p-2 text-xs">
          <div className="text-blue-900">DigiLocker (simulated): you approve sharing your <b>name</b> only. Accel never receives or stores your Aadhaar number.</div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name as on Aadhaar" className="w-full rounded-md px-2 py-1.5 ring-1 ring-blue-200" />
          <select value={desig} onChange={(e) => setDesig(e.target.value)} className="w-full rounded-md px-2 py-1.5 ring-1 ring-blue-200">
            {['Owner', 'Proprietor', 'Partner', 'Director', 'Authorised signatory'].map((d) => <option key={d}>{d}</option>)}
          </select>
          <button disabled={name.length < 2 || busy} onClick={() => onVerify(name, desig)} className="w-full rounded-md bg-[#1e3a8a] py-1.5 font-semibold text-white disabled:opacity-50">{busy ? 'Connecting to DigiLocker…' : 'Allow & verify'}</button>
        </div>
      )}
    </div>
  )
}

function Consent({ sid, onDone, onBack }: { sid: string; onDone: () => void; onBack: () => void }) {
  const [notice, setNotice] = useState<Awaited<ReturnType<typeof api.notice>> | null>(null)
  const [choices, setChoices] = useState<Record<string, boolean>>({ kyc_verification: true, service_updates: true, partner_assist: false, marketing: false })
  const [busy, setBusy] = useState(false)
  useEffect(() => { api.notice().then(setNotice) }, [])
  if (!notice) return <div className="p-6"><Spinner /></div>
  return (
    <div className="flex h-[34rem] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500"><ArrowLeft size={14} /> OneBill</button>
        <div className="mt-2 flex items-center gap-2"><ShieldCheck className="text-emerald-600" /><h2 className="text-lg font-bold">Before we verify — your consent</h2></div>
        <p className="mt-1 text-xs text-slate-500">Under India's DPDP Act, 2023 you decide what we use. Each choice is separate; only the first is needed to activate service. Change your mind any time in My Data.</p>
        <div className="mt-3 space-y-2">
          {Object.entries(notice.purposes).map(([k, p]) => (
            <div key={k} className="rounded-xl p-3 ring-1 ring-slate-200">
              <label className="flex items-start gap-3">
                <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--brand)]" checked={choices[k]} disabled={p.required} onChange={(e) => setChoices({ ...choices, [k]: e.target.checked })} />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-slate-800">{p.title} {p.required && <span className="pill bg-slate-100 text-slate-600">needed</span>}</div>
                  <div className="text-xs text-slate-500">{p.why}</div>
                </div>
              </label>
              <details className="mt-1 pl-7 text-[11px] text-slate-500">
                <summary className="flex cursor-pointer items-center gap-1 text-brand">Details <ChevronDown size={12} /></summary>
                <div className="mt-1"><b>We collect:</b> {p.what.join(', ')}</div>
                <div><b>Kept for:</b> {p.retention}</div>
                <div><b>Shared with:</b> {p.shared_with}</div>
              </details>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-400">Notice {notice.version} · {notice.controller} · Grievance officer: {notice.grievance_officer}</p>
      </div>
      <div className="border-t border-slate-200 bg-white px-4 py-3">
        <button disabled={busy} onClick={() => { setBusy(true); api.consent(sid, choices).then(onDone).finally(() => setBusy(false)) }} className="btn-primary w-full">I agree — start verification</button>
      </div>
    </div>
  )
}
