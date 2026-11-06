import { ArrowRight, BarChart3, FileSearch, MessageCircle, ShieldCheck, Smartphone, Users } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, type Baseline, type Replay } from '../api'
import { useBrand } from '../brand'

const ENTRIES = [
  { to: '/start?new=1', icon: Smartphone, title: 'Owner app', text: 'Chat or speak in Hindi, get a bundle with one clear price, verify in 2 minutes, track your order.', cta: 'Start as a shop owner' },
  { to: '/whatsapp', icon: MessageCircle, title: 'On WhatsApp', text: 'The same advisor inside a WhatsApp chat — quick replies, voice notes, quote card.', cta: 'Open WhatsApp view' },
  { to: '/partner', icon: Users, title: 'Partner Co-Pilot', text: 'Leads the advisor could not close, ranked by win-back score with the next best action. Assisted mode keeps partners earning.', cta: 'Open cockpit' },
  { to: '/insights', icon: BarChart3, title: 'Insights', text: 'Replay the quarter: run the real 5,000 leads through UdyamSync and see conversion, cost and churn move.', cta: 'See the impact' },
  { to: '/kyc-inspector', icon: FileSearch, title: 'KYC Inspector', text: 'Run the 12 specimen applicants through Smart KYC and watch every planted problem get caught.', cta: 'Inspect K01–K12' },
  { to: '/privacy', icon: ShieldCheck, title: 'Privacy by design', text: 'DPDP consent ledger, masking, encryption, auto-purge and a "My Data" page the owner controls.', cta: 'Read the note' },
]

export default function Home() {
  const { name } = useBrand()
  const [b, setB] = useState<Baseline | null>(null)
  const [r, setR] = useState<Replay | null>(null)
  useEffect(() => { api.baseline().then(setB); api.replay({}).then(setR) }, [])
  return (
    <div>
      <section className="bg-brand text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-2 lg:py-16">
          <div>
            <div className="pill bg-white/15 text-white">{name} · Project Udyam Digital</div>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl">Ek baar mein<br />vyapar digital.</h1>
            <p className="mt-4 max-w-xl text-lg text-white/80">A small business owner goes from "what do I need?" to "my order is verified and scheduled" in one 10-minute sitting — on a phone, in their own language. Partners stay in the loop and keep their commission.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/start?new=1&lang=hi" className="btn bg-white text-brand">शुरू करें (Hindi) <ArrowRight size={16} /></Link>
              <Link to="/start?new=1&lang=en" className="btn bg-white/15 text-white ring-1 ring-white/30">Start in English</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 self-center">
            <Kpi label="Lead → activation" before={b ? `${b.conversion_pct}%` : '…'} after={r ? `${r.after.conversion_pct}%` : '…'} />
            <Kpi label="Days to activate" before={b ? `${b.avg_days_to_activate}` : '…'} after={r ? `${r.after.days_to_activate}` : '…'} />
            <Kpi label="Cost per activation" before={b ? inr(b.cac_per_activation) : '…'} after={r ? inr(r.after.cac) : '…'} />
            <Kpi label="6-month churn" before={b ? `${b.churn_6m_pct}%` : '…'} after={r ? `${r.after.churn_6m_pct}%` : '…'} />
            <p className="col-span-2 text-xs text-white/60">Before = the case's 5,000 real (synthetic) leads, Apr–Jun 2026. After = the same leads replayed through UdyamSync with conservative, adjustable assumptions — see Insights.</p>
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRIES.map((e) => (
            <Link key={e.to} to={e.to} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-md">
              <e.icon className="text-brand" />
              <h3 className="mt-3 font-semibold text-slate-900">{e.title}</h3>
              <p className="mt-1 text-sm text-slate-600">{e.text}</p>
              <div className="mt-3 flex items-center gap-1 text-sm font-semibold text-brand">{e.cta} <ArrowRight size={14} className="transition group-hover:translate-x-0.5" /></div>
            </Link>
          ))}
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-4">
          {[
            ['1 · Discover', '3 questions in Hindi, English, Marathi + 7 more. GSTIN fills half the answers from the registry.'],
            ['2 · OneBill', 'Essential / Recommended / Pro, one monthly price, toggles, dependencies handled, no product codes.'],
            ['3 · Smart KYC', 'Photos → OCR → registry checks → plain-language fixes. DigiLocker, e-sign, consent ledger.'],
            ['4 · Track', '5-stage tracker with ETAs, technician, reschedule, WhatsApp updates. No chase calls.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
              <div className="text-sm font-bold text-brand">{t}</div>
              <div className="mt-1 text-sm text-slate-600">{d}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function Kpi({ label, before, after }: { label: string; before: string; after: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
      <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-sm text-white/50 line-through">{before}</span>
        <span className="text-2xl font-bold">{after}</span>
      </div>
    </div>
  )
}
