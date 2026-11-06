import { Check, Circle, Loader2 } from 'lucide-react'

/* Static, faithful fragments of the real app screens, used by the pinned chapters. */

export function ChatScreen() {
  return (
    <div className="space-y-2.5 px-3 py-4 text-[12.5px] leading-snug">
      <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-3 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]" lang="hi">नमस्ते! अपने बिज़नेस के बारे में बताइए — या बस अपना GSTIN लिख दीजिए।</div>
      <div className="ml-auto w-fit rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white">32TTNXB7384T1ZW</div>
      <div className="max-w-[88%] rounded-2xl rounded-bl-md bg-paper px-3 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]">GST registry: <b>Balaji Dental Care LLP</b>, Kochi — active. How many people work there?</div>
      <div className="flex flex-wrap gap-1.5 pt-1">
        {['Just me', '2–5 people', '6–20 people', '20+'].map((c, i) => <span key={c} className={`rounded-full px-2.5 py-1 text-[11px] ${i === 2 ? 'bg-brand text-white' : 'bg-surface shadow-[inset_0_0_0_1px_var(--color-line)]'}`}>{c}</span>)}
      </div>
    </div>
  )
}

export function LedgerScreen() {
  const rows = [['Biz Fibre 300', '1,649'], ['2 × Postpaid 599', '1,398'], ['20 × Cloud Email', '2,780'], ['20 × Endpoint Security', '2,380'], ['Cloud Backup 1 TB', '599']]
  return (
    <div className="px-3 py-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">OneBill · 12 months</div>
      <div className="ledger overflow-hidden rounded-xl shadow-[inset_0_0_0_1px_var(--color-line)]">
        {rows.map(([n, p]) => (
          <div key={n} className="flex h-9 items-center justify-between pl-11 pr-3 text-[12.5px]"><span>{n}</span><span className="num">₹{p}</span></div>
        ))}
        <div className="flex h-9 items-center justify-between border-t-2 border-double border-ink/60 pl-11 pr-3 text-[13px] font-bold"><span>Per month</span><span className="num">₹8,806</span></div>
      </div>
      <div className="mt-3 flex items-center justify-between rounded-xl bg-paper px-3 py-2 text-[11.5px]"><span>Add CCTV ×2</span><span className="relative h-5 w-9 rounded-full bg-brand"><span className="absolute right-0.5 top-0.5 h-4 w-4 rounded-full bg-white" /></span></div>
      <p className="mt-2 text-[10.5px] text-muted">Biz Fibre added automatically — CCTV needs internet.</p>
    </div>
  )
}

export function VerifyScreen({ stamped = true }: { stamped?: boolean }) {
  const checks = ['GSTIN active in registry', 'Udyam matches GST business', 'Bill dated 19 days ago', 'Signatory is the proprietor']
  return (
    <div className="relative px-3 py-4">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Smart KYC</div>
      <ul className="space-y-1.5">
        {checks.map((c) => (
          <li key={c} className="flex items-center gap-2 rounded-lg bg-paper px-2.5 py-2 text-[12px]"><Check size={14} className="text-leaf" strokeWidth={3} />{c}</li>
        ))}
        <li className="flex items-center gap-2 rounded-lg bg-[#fdf3e2] px-2.5 py-2 text-[12px]"><span className="h-3.5 w-3.5 rounded-full bg-haldi" />Photo tilted 7° — straightened</li>
      </ul>
      {stamped && (
        <div className="pointer-events-none absolute inset-x-0 top-[270px] flex justify-center text-leaf">
          <div className="stamp stamp-in text-[22px]"><span lang="hi" className="text-[17px] normal-case tracking-normal">सत्यापित</span>Verified</div>
        </div>
      )}
    </div>
  )
}

export function TrackScreen() {
  const st: [string, string, 'done' | 'active' | 'todo'][] = [['Order confirmed', 'Today', 'done'], ['KYC verified', 'Today', 'done'], ['Port reserved', 'Tomorrow', 'active'], ['Technician · Sunita ★4.9', 'Tue, 11–1', 'todo'], ['Live', 'Wed', 'todo']]
  return (
    <div className="px-3 py-4">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Your order</div>
      <div className="display mt-1 text-[22px]">Live in 5 days</div>
      <ol className="mt-3">
        {st.map(([l, d, s], i) => (
          <li key={l} className="relative flex gap-2.5 pb-3 text-[12px]">
            {i < st.length - 1 && <span className={`absolute left-[7px] top-4 h-full w-px ${s === 'done' ? 'bg-brand' : 'bg-line'}`} />}
            {s === 'done' ? <Check size={15} className="z-10 rounded-full bg-brand p-0.5 text-white" strokeWidth={3} /> : s === 'active' ? <Loader2 size={15} className="z-10 animate-spin text-brand" /> : <Circle size={15} className="z-10 text-line-strong" />}
            <div className="flex flex-1 justify-between"><span className={s === 'todo' ? 'text-muted' : ''}>{l}</span><span className="text-muted">{d}</span></div>
          </li>
        ))}
      </ol>
      <div className="mt-1 rounded-xl rounded-tl-sm bg-[#dcf3d6] px-3 py-2 text-[11.5px]">📡 Port reserved for you. Sunita visits Tue 11–1. No need to call us.</div>
    </div>
  )
}
