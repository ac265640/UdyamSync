import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api } from '../api'
import DocScanner from '../components/DocScanner'
import { Section, Spinner, StatusIcon, Verdict } from '../components/ui'

const DOCS: Record<string, string> = { gst_certificate: 'GST certificate', udyam_certificate: 'Udyam certificate', signatory_id: 'Signatory ID', address_proof: 'Address proof' }

export default function Inspector() {
  const [list, setList] = useState<Awaited<ReturnType<typeof api.samples>> | null>(null)
  const [params] = useSearchParams()
  const [sel, setSel] = useState(() => (/^K(0[1-9]|1[0-2])$/.test(params.get('k') ?? '') ? params.get('k')! : 'K01'))
  const [r, setR] = useState<Awaited<ReturnType<typeof api.sample>> | null>(null)
  useEffect(() => { api.samples().then(setList) }, [])
  const [stamp, setStamp] = useState<string | null>(null)
  useEffect(() => { setR(null); setStamp(null); api.sample(sel).then(setR) }, [sel])
  // The verdict is stamped once all four pages have been read.
  useEffect(() => {
    if (!r) return
    const t = setTimeout(() => setStamp(r.applicant), 6600)
    return () => clearTimeout(t)
  }, [r])
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
        <div className="grid gap-4 xl:grid-cols-[1fr_24rem]">
          <Section title={`${r.applicant} · ${r.registry?.trade_name ?? (r.extracted.udyam_certificate as { enterprise_name?: string } | null)?.enterprise_name ?? ''}`} right={<Verdict verdict={r.verdict} label={r.verdict_label} />}>
            <div className="relative grid grid-cols-2 gap-x-5 gap-y-6">
              {Object.keys(DOCS).map((d, i) => {
                const ex = r.extracted[d] as (Record<string, unknown> & { _boxes?: Record<string, number[]> }) | null
                return (
                  <DocScanner key={`${r.applicant}-${d}`} label={DOCS[d]} src={r.files[d] ? `${r.files[d]}?processed=1` : null} missing={!r.files[d]}
                    boxes={ex?._boxes ?? {}} checks={r.checks.filter((c) => c.doc === d)} delay={i * 1500} />
                )
              })}
              {stamp === r.applicant && <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                {r.verdict === 'action_needed'
                  ? <div className="stamp stamp-in bg-[#fdf6f0]/85 text-[30px] text-khata"><span lang="hi" className="text-[19px] normal-case tracking-normal">सुधार करें</span>Fix &amp; resend</div>
                  : <div className="stamp stamp-in bg-[#f3faf5]/85 text-[30px] text-leaf"><span lang="hi" className="text-[19px] normal-case tracking-normal">सत्यापित</span>Verified</div>}
              </div>}
            </div>
            <p className="mt-3 text-[11px] text-faint">Boxes are drawn where the OCR actually read each field; hover one for the finding. Pages are shown as the engine reads them (straightened, watermark still visible).</p>
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
