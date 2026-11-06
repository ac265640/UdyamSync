import { ArrowDownRight, ArrowUpRight, Calendar, ChevronLeft, ChevronRight, MessageCircle, Phone, PlayCircle, UserCheck, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, type Inbox, type InboxLead } from '../api'
import { Section, Spinner, Stat } from '../components/ui'

const SEGMENTS = { '': 'All segments', prof: 'Professional offices', micro: 'Micro retail & services', multi: 'Small multi-site', mfg: 'Small manufacturers' }
const ICON: Record<string, typeof Phone> = { whatsapp: MessageCircle, call: Phone, schedule: Calendar, visit: UserCheck, skip: ChevronRight }

export default function Partner() {
  const [partners, setPartners] = useState<Record<string, { name: string; type: string }>>({})
  const [pid, setPid] = useState('P-PUN-007')
  const [tab, setTab] = useState<'inbox' | 'earnings' | 'kyc'>('inbox')
  useEffect(() => { api.partners().then(setPartners) }, [])
  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Partner Co-Pilot</h1>
          <p className="text-sm text-slate-600">The digital journey adds to partners instead of competing: they get the leads it couldn't close, ranked, with the next best action — and full commission on assisted sales.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={pid} onChange={(e) => setPid(e.target.value)} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-slate-200">
            {Object.entries(partners).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
          <Link to={`/start?partner=${pid}&new=1`} className="btn-primary"><PlayCircle size={16} /> Assisted onboarding</Link>
        </div>
      </div>
      <div className="mt-4 flex gap-1 rounded-xl bg-slate-100 p-1 text-sm font-semibold sm:w-fit">
        {(['inbox', 'earnings', 'kyc'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-4 py-1.5 ${tab === t ? 'bg-white text-brand shadow' : 'text-slate-500'}`}>{{ inbox: 'Lead inbox', earnings: 'Earnings', kyc: 'KYC exceptions' }[t]}</button>
        ))}
      </div>
      <div className="mt-4">{tab === 'inbox' ? <InboxView pid={pid} /> : tab === 'earnings' ? <Earnings pid={pid} /> : <KycQueue />}</div>
    </div>
  )
}

function InboxView({ pid }: { pid: string }) {
  const [data, setData] = useState<Inbox | null>(null)
  const [segment, setSegment] = useState('')
  const [minScore, setMinScore] = useState(0)
  const [page, setPage] = useState(1)
  const [sel, setSel] = useState<InboxLead | null>(null)
  useEffect(() => { api.inbox({ partner_id: pid, segment, min_score: minScore, page, limit: 12 }).then(setData) }, [pid, segment, minScore, page])
  if (!data) return <Spinner label="Scoring leads…" />
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-4">
        {data.live.length > 0 && (
          <Section title={`From the advisor today (${data.live.length})`} subtitle="Customers who asked for a person, hesitated on price, or were too big for self-serve. Chat summary included — no repeat questions.">
            <LeadList leads={data.live} onSelect={setSel} selected={sel?.id} />
          </Section>
        )}
        <Section
          title="Win-back queue — historical dropped leads"
          subtitle={`${data.historical_total.toLocaleString('en-IN')} dropped leads from Apr–Jun, ranked by win-back score (propensity model AUC ${data.model.auc}, base activation ${data.model.base_rate_pct}%).`}
          right={
            <div className="flex flex-wrap gap-2 text-sm">
              <select value={segment} onChange={(e) => { setSegment(e.target.value); setPage(1) }} className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{Object.entries(SEGMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
              <select value={minScore} onChange={(e) => { setMinScore(Number(e.target.value)); setPage(1) }} className="rounded-lg bg-white px-2 py-1 ring-1 ring-slate-200">{[0, 50, 60, 70, 80].map((s) => <option key={s} value={s}>Score ≥ {s}</option>)}</select>
            </div>
          }
        >
          <LeadList leads={data.historical} onSelect={setSel} selected={sel?.id} />
          <div className="mt-3 flex items-center justify-end gap-2 text-sm">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="btn-ghost !p-1.5"><ChevronLeft size={16} /></button>
            Page {page} / {data.pages}
            <button disabled={page >= data.pages} onClick={() => setPage(page + 1)} className="btn-ghost !p-1.5"><ChevronRight size={16} /></button>
          </div>
        </Section>
      </div>
      <div className="lg:sticky lg:top-20 lg:self-start">{sel ? <LeadDetail lead={sel} pid={pid} /> : <div className="card p-6 text-sm text-slate-500">Select a lead to see why it scored that way and what to do next.</div>}</div>
    </div>
  )
}

function ScoreBar({ score }: { score: number }) {
  const c = score >= 75 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-400' : 'bg-slate-300'
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100"><div className={`h-full ${c}`} style={{ width: `${score}%` }} /></div>
      <span className="w-7 text-right text-sm font-bold">{score}</span>
    </div>
  )
}

function LeadList({ leads, onSelect, selected }: { leads: InboxLead[]; onSelect: (l: InboxLead) => void; selected?: string }) {
  return (
    <ul className="divide-y divide-slate-100">
      {leads.map((l) => {
        const Icon = ICON[l.next_action.channel] ?? Phone
        return (
          <li key={l.id}>
            <button onClick={() => onSelect(l)} className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-slate-50 ${selected === l.id ? 'bg-brand-soft' : ''}`}>
              <ScoreBar score={l.score} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-800">{l.business} <span className="font-normal text-slate-400">· {l.business_type} · {l.city}</span></div>
                <div className="truncate text-xs text-slate-500">{l.stage} → <span className="text-rose-600">{l.reason}</span> · {l.lang} · {l.source}</div>
              </div>
              <span className="hidden items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600 sm:flex"><Icon size={12} /> {l.next_action.channel}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

function LeadDetail({ lead, pid }: { lead: InboxLead; pid: string }) {
  const [status, setStatus] = useState<string | null>(null)
  useEffect(() => { setStatus(null) }, [lead.id])
  const act = (a: string) => api.leadAction(lead.id, a, `by ${pid}`).then((r) => setStatus(r.status))
  const msg = `Namaste! Accel Business here. You were looking at business internet for ${lead.business}. ${lead.next_action.text.includes('WhatsApp') || lead.next_action.channel === 'whatsapp' ? 'Your 2-minute quote link: ' : ''}${location.origin}/start?source=Channel%20partner&partner=${pid}`
  return (
    <div className="card fade-in space-y-4 p-5">
      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">{lead.business}</h3>
          <ScoreBar score={lead.score} />
        </div>
        <p className="mt-1 text-sm text-slate-600">{lead.summary}</p>
        {lead.contact && <p className="mt-1 text-xs text-slate-500">Contact: {lead.contact} · {lead.phone}</p>}
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Why this score</div>
        <ul className="mt-1 space-y-1 text-sm">
          {lead.factors.map((f) => (
            <li key={f.feature} className="flex items-center gap-2">{f.effect === 'up' ? <ArrowUpRight size={14} className="text-emerald-600" /> : <ArrowDownRight size={14} className="text-rose-500" />}{f.feature}</li>
          ))}
          {lead.propensity_pct != null && <li className="text-xs text-slate-500">Model activation propensity: {lead.propensity_pct}%</li>}
        </ul>
      </div>
      <div className="rounded-xl bg-brand-soft p-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-brand">Next best action</div>
        <div className="mt-1 text-sm font-medium text-slate-800">{lead.next_action.text}</div>
        {lead.recovered_by && <div className="mt-1 text-xs text-slate-500">UdyamSync fix for "{lead.reason}": {lead.recovered_by}</div>}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <a className="btn-primary text-xs" href={`https://wa.me/?text=${encodeURIComponent(msg)}`} target="_blank" rel="noreferrer" onClick={() => act('whatsapp_sent')}><MessageCircle size={14} /> Send WhatsApp</a>
        <button className="btn-ghost text-xs" onClick={() => act('contacted')}><Phone size={14} /> Mark called</button>
        <Link className="btn-ghost text-xs" to={`/start?partner=${pid}&new=1`}><PlayCircle size={14} /> Assisted mode</Link>
        <button className="btn-ghost text-xs" onClick={() => act('won')}>Mark won ✓</button>
      </div>
      {status && <div className="text-center text-xs text-emerald-700">Logged · status: {status}</div>}
    </div>
  )
}

function Earnings({ pid }: { pid: string }) {
  const [e, setE] = useState<Awaited<ReturnType<typeof api.earnings>> | null>(null)
  useEffect(() => { api.earnings(pid).then(setE) }, [pid])
  if (!e) return <Spinner />
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Leads submitted" value={e.leads_submitted} />
        <Stat label="Assisted digital checkouts" value={e.assisted_checkouts} sub="closed in one sitting on a tablet" />
        <Stat label="Commission (illustrative)" value={inr(e.commission_total_illustrative)} tone="good" />
      </div>
      <Section title="Orders credited to you" subtitle={e.policy_note} right={<Wallet className="text-brand" />}>
        {e.orders.length === 0 ? <p className="text-sm text-slate-500">No orders yet — start an assisted onboarding to see commission appear here instantly.</p> : (
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-slate-400"><tr><th className="py-1">Order</th><th>Business</th><th>Monthly</th><th>Commission</th><th>Status</th></tr></thead>
            <tbody>{e.orders.map((o) => <tr key={o.id} className="border-t border-slate-100"><td className="py-2 font-mono text-xs"><Link className="text-brand" to={`/track/${o.id}`}>{o.id}</Link></td><td>{o.business}</td><td>{inr(o.monthly)}</td><td className="font-semibold text-emerald-700">{inr(o.commission)}</td><td>{o.status}</td></tr>)}</tbody>
          </table>
        )}
      </Section>
    </div>
  )
}

function KycQueue() {
  const [q, setQ] = useState<Awaited<ReturnType<typeof api.kycQueue>> | null>(null)
  useEffect(() => { api.kycQueue().then(setQ) }, [])
  if (!q) return <Spinner />
  return (
    <Section title="KYC exceptions" subtitle="Cases Smart KYC flagged amber or red. Partners help the owner fix them — documents stay masked here.">
      {q.length === 0 ? <p className="text-sm text-slate-500">Nothing pending. 🎉</p> : (
        <ul className="divide-y divide-slate-100">
          {q.map((c) => (
            <li key={c.session_id} className="py-3 text-sm">
              <div className="flex justify-between"><b>{c.business || 'Business'} · {c.city}</b><span className="text-xs text-slate-500">{c.verdict}</span></div>
              <ul className="mt-1 list-disc pl-5 text-xs text-slate-600">{c.issues.map((i) => <li key={i}>{i}</li>)}</ul>
            </li>
          ))}
        </ul>
      )}
    </Section>
  )
}
