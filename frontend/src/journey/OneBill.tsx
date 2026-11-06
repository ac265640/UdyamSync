import { ArrowLeft, ArrowRight, Link2, Lock, Minus, Plus, Printer, Share2, TrendingDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, fmtDate, inr, type AdvisorResponse, type Quote } from '../api'
import { Spinner } from '../components/ui'

type Product = Awaited<ReturnType<typeof api.catalogue>>[number]

export default function OneBill({ state, onBack, onContinue }: { state: AdvisorResponse; onBack: () => void; onContinue: () => void }) {
  const rec = state.recommendation
  const tierName = state.selected_tier || rec?.default_tier || 'recommended'
  const base = rec?.tiers[tierName]
  const [term, setTerm] = useState(rec?.term_months ?? 12)
  const [lines, setLines] = useState<Record<string, number>>(() => Object.fromEntries((base?.lines ?? []).filter((l) => l.added_by !== 'dependency').map((l) => [l.product_id, l.quantity])))
  const [quote, setQuote] = useState<Quote | null>(base ?? null)
  const [catalogue, setCatalogue] = useState<Product[]>([])
  const [showAll, setShowAll] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => { api.catalogue().then(setCatalogue) }, [])
  useEffect(() => {
    const t = setTimeout(() => {
      setBusy(true)
      api.quote(state.session_id, Object.entries(lines).map(([product_id, quantity]) => ({ product_id, quantity })), term).then(setQuote).finally(() => setBusy(false))
    }, 150)
    return () => clearTimeout(t)
  }, [lines, term, state.session_id])

  const why = useMemo(() => Object.fromEntries((base?.lines ?? []).map((l) => [l.product_id, l])), [base])
  const blockedIds = new Set((quote?.blocked ?? []).map((b) => b.product_id))
  const inBundle = new Set(quote?.lines.map((l) => l.product_id))
  const extras = catalogue.filter((p) => !inBundle.has(p.id) && !(p.id in lines))

  if (!rec || !quote) return <div className="p-6 text-sm text-slate-500">Chat with the advisor first to get a bundle. <button className="text-brand underline" onClick={onBack}>Back</button></div>

  const toggle = (id: string, on: boolean) => setLines((l) => { const n = { ...l }; if (on) n[id] = n[id] || 1; else delete n[id]; return n })
  const qty = (id: string, d: number) => setLines((l) => ({ ...l, [id]: Math.max(1, Math.min(200, (l[id] || 1) + d)) }))
  const shareText = `My Accel Business bundle: ${quote.lines.map((l) => `${l.quantity > 1 ? l.quantity + '× ' : ''}${l.name}`).join(', ')} — ${inr(quote.monthly_total)}/month + GST, one bill. Price valid till ${fmtDate(quote.price_valid_until)}.`

  return (
    <div className="flex h-[34rem] flex-col">
      <div className="flex-1 overflow-y-auto px-4 py-4" id="onebill-print">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-1 text-xs text-slate-500"><ArrowLeft size={14} /> Advisor</button>
          <span className="text-xs text-slate-400">Price valid till {fmtDate(quote.price_valid_until)}</span>
        </div>
        <h2 className="mt-2 text-lg font-bold text-slate-900">Your OneBill</h2>
        <p className="text-xs text-slate-500">One monthly price · one bill · one support number. Switch things on or off — the price updates instantly.</p>

        <div className="mt-3 flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
          {[6, 12, 24].map((t) => (
            <button key={t} onClick={() => setTerm(t)} className={`flex-1 rounded-lg py-1.5 ${term === t ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>
              {t} months{t === 24 ? ' · best price' : ''}
            </button>
          ))}
        </div>

        {quote.current_monthly_spend ? (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 ring-1 ring-emerald-200">
            <TrendingDown size={16} className="shrink-0" />
            <div>
              Today you pay about <b>{inr(quote.current_monthly_spend)}</b>/month for telecom. Internet + mobile in this bundle is <b>{inr(quote.connectivity_monthly)}</b>/month
              {quote.connectivity_vs_current && quote.connectivity_vs_current > 0 ? <> — <b>{inr(quote.connectivity_vs_current)} less</b></> : null}, and everything else comes on the same bill.
            </div>
          </div>
        ) : null}

        <ul className="mt-3 divide-y divide-slate-100 rounded-2xl ring-1 ring-slate-200">
          {quote.lines.map((l) => {
            const locked = l.added_by === 'dependency' && !(l.product_id in lines)
            return (
              <li key={l.product_id} className="flex gap-3 p-3">
                <label className="mt-0.5">
                  <input type="checkbox" checked disabled={locked} onChange={() => toggle(l.product_id, false)} className="h-4 w-4 accent-[var(--brand)]" />
                </label>
                <div className="min-w-0 flex-1">
                  <div className="flex justify-between gap-2 text-sm font-semibold text-slate-800">
                    <span>{l.name}</span>
                    <span>{inr(l.monthly)}</span>
                  </div>
                  <div className="text-xs text-slate-500">{why[l.product_id]?.why || l.why || l.description}</div>
                  {why[l.product_id]?.reason_texts?.[0] && <div className="mt-0.5 text-[11px] text-brand">✦ {why[l.product_id].reason_texts![0]}</div>}
                  {locked && <div className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-500"><Lock size={11} /> {l.note || 'Needed by another product'}</div>}
                  <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                    <span>{inr(l.unit_price)} {l.unit}</span>
                    {l.setup_fee > 0 && <span>Setup {inr(l.setup_fee_after_waiver)}{l.setup_fee_after_waiver < l.setup_fee && <s className="ml-1">{inr(l.setup_fee)}</s>}</span>}
                    <span>Live ~{l.install_days}d</span>
                  </div>
                </div>
                {l.unit !== 'per site' && l.unit !== 'per account' && !locked && (
                  <div className="flex items-center gap-1 self-center">
                    <button onClick={() => qty(l.product_id, -1)} className="rounded-md bg-slate-100 p-1"><Minus size={12} /></button>
                    <span className="w-6 text-center text-xs font-semibold">{l.quantity}</span>
                    <button onClick={() => qty(l.product_id, 1)} className="rounded-md bg-slate-100 p-1"><Plus size={12} /></button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>

        {quote.auto_added.length > 0 && (
          <p className="mt-2 text-[11px] text-slate-500">🔗 Added automatically: {quote.auto_added.map((a) => `${a.name} (needed for ${a.because_of})`).join('; ')}.</p>
        )}
        {quote.blocked.length > 0 && (
          <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
            <div className="mb-1 font-semibold text-slate-700">Not available right now</div>
            {quote.blocked.map((b) => (
              <div key={b.product_id} className="flex gap-1"><Lock size={12} className="mt-0.5 shrink-0" /> <span><b>{b.name}</b>: {b.reasons[0].message}</span></div>
            ))}
          </div>
        )}

        <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-semibold text-brand">{showAll ? 'Hide' : '+ Add more services'} ({extras.length})</button>
        {showAll && (
          <ul className="mt-2 grid gap-2">
            {extras.map((p) => (
              <li key={p.id} className="flex items-center gap-2 rounded-xl p-2 text-xs ring-1 ring-slate-200">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-800">{p.name} <span className="font-normal text-slate-400">· {p.category}</span></div>
                  <div className="truncate text-slate-500">{p.description}</div>
                </div>
                <div className="text-right text-slate-600">{inr(p.price_min)}–{inr(p.price_max)}<div className="text-[10px] text-slate-400">{p.unit}</div></div>
                <button onClick={() => toggle(p.id, true)} disabled={blockedIds.has(p.id)} className="btn-ghost !px-2 !py-1">Add</button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 flex gap-2 print:hidden">
          <a className="btn-ghost flex-1 !py-2 text-xs" target="_blank" rel="noreferrer" href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}><Share2 size={14} /> WhatsApp</a>
          <button className="btn-ghost flex-1 !py-2 text-xs" onClick={() => window.print()}><Printer size={14} /> 1-page PDF</button>
          <button className="btn-ghost flex-1 !py-2 text-xs" onClick={() => navigator.clipboard?.writeText(`${location.origin}/resume/${state.session_id}`)}><Link2 size={14} /> Copy link</button>
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,.04)]">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-2xl font-bold text-slate-900">{inr(quote.monthly_total)}<span className="text-sm font-normal text-slate-500">/month</span> {busy && <span className="ml-1 inline-block align-middle"><Spinner /></span>}</div>
            <div className="text-[11px] text-slate-500">+ GST {inr(quote.monthly_gst)} · one-time setup {inr(quote.one_time_setup)} · {quote.term_months}-month plan</div>
            {quote.commitment_saving_per_month > 0 && <div className="text-[11px] font-medium text-emerald-600">You save {inr(quote.commitment_saving_per_month)}/month vs no-commitment price</div>}
          </div>
          <div className="text-right text-[11px] text-slate-500">Fully live<br /><b className="text-slate-800">~{quote.full_activation_days} days</b></div>
        </div>
        <button onClick={onContinue} disabled={!quote.lines.length} className="btn-primary mt-2 w-full">Looks good — verify my business <ArrowRight size={16} /></button>
      </div>
    </div>
  )
}
