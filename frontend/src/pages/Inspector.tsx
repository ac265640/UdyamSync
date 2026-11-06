import { useEffect, useState } from 'react'
import { api } from '../api'
import { Section, Spinner, StatusIcon, Verdict } from '../components/ui'

const DOCS: Record<string, string> = { gst_certificate: 'GST certificate', udyam_certificate: 'Udyam certificate', signatory_id: 'Signatory ID', address_proof: 'Address proof' }

export default function Inspector() {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.samples>> | null>(null)
  const [sel, setSel] = useState('K01')
  const [r, setR] = useState<Awaited<ReturnType<typeof api.sample>> | null>(null)
  useEffect(() => { api.samples().then(setList) }, [])
  useEffect(() => { setR(null); api.sample(sel).then(setR) }, [sel])
  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      <div>
        <h1 className="display text-[2.6rem]">Smart KYC Inspector</h1>
        <p className="max-w-3xl text-sm text-muted">The case pack's 12 specimen applicants, run through the real pipeline: on-server OCR (no third party), watermark removal, auto-deskew, GSTIN O/0 correction, then 20+ checks against the GST &amp; Udyam registries. Each problem comes with a fix the owner can do right now.</p>
      </div>
      {!list ? <Spinner label="Reading 47 documents (first load ~30s)…" /> : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6 lg:grid-cols-12">
          {list.map((a) => (
            <button key={a.applicant} onClick={() => setSel(a.applicant)} className={`rounded-xl p-2 text-left ring-1 transition ${sel === a.applicant ? 'bg-brand-soft ring-[var(--brand)]' : 'bg-surface ring-line hover:ring-line-strong'}`}>
              <div className="flex items-center justify-between font-mono text-sm font-bold">{a.applicant}<StatusIcon status={a.verdict === 'verified' ? 'pass' : a.verdict === 'verified_with_notes' ? 'warn' : 'fail'} size={15} /></div>
              <div className="truncate text-[10px] text-muted">{a.business}</div>
            </button>
          ))}
        </div>
      )}
      {!r ? <Spinner /> : (
        <div className="grid gap-4 lg:grid-cols-[1fr_28rem]">
          <Section title={`${r.applicant} · ${r.registry?.trade_name ?? (r.extracted.udyam_certificate as { enterprise_name?: string } | null)?.enterprise_name ?? ''}`} right={<Verdict verdict={r.verdict} label={r.verdict_label} />}>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Object.keys(DOCS).map((d) => {
                const ex = r.extracted[d] as (Record<string, unknown> & { _quality?: { issues: string[]; skew_deg: number } }) | null
                return (
                  <div key={d} className="rounded-xl p-2 ring-1 ring-line">
                    <div className="mb-1 text-xs font-semibold">{DOCS[d]}</div>
                    {r.files[d] ? <a href={r.files[d]!} target="_blank" rel="noreferrer"><img src={r.files[d]!} alt={DOCS[d]} className="h-36 w-full rounded-lg bg-paper object-contain" loading="lazy" /></a> : <div className="flex h-36 items-center justify-center rounded-lg bg-rose-50 text-xs font-semibold text-rose-600">Not provided</div>}
                    {ex && (
                      <dl className="mt-2 space-y-0.5 text-[10px]">
                        {Object.entries(ex).filter(([k]) => !k.startsWith('_') && k !== 'gstin_raw').slice(0, 6).map(([k, v]) => <div key={k} className="flex gap-1"><dt className="shrink-0 text-faint">{k.replace(/_/g, ' ')}:</dt><dd className="truncate text-ink">{String(v)}</dd></div>)}
                        {ex._quality?.issues?.length ? <div className="font-semibold text-rose-600">Issue: {ex._quality.issues.join(', ')}</div> : null}
                        {ex._quality?.skew_deg ? <div className="font-semibold text-amber-600">Straightened {ex._quality.skew_deg}°</div> : null}
                      </dl>
                    )}
                  </div>
                )
              })}
            </div>
          </Section>
          <Section title="Checks" subtitle={`${r.summary.pass} passed · ${r.summary.warn} to confirm · ${r.summary.fail} to fix`}>
            <ul className="max-h-[32rem] space-y-1.5 overflow-y-auto">
              {[...r.checks].sort((a, b) => ['fail', 'warn', 'pass'].indexOf(a.status) - ['fail', 'warn', 'pass'].indexOf(b.status)).map((c) => (
                <li key={c.id} className="flex gap-2 rounded-lg p-2 text-xs ring-1 ring-line">
                  <StatusIcon status={c.status} size={16} />
                  <div><div className="font-semibold">{c.label}</div><div className="text-muted">{c.message}</div>{c.fix && c.status !== 'pass' && <div className="mt-0.5 text-ink">→ {c.fix}</div>}</div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}
    </div>
  )
}
