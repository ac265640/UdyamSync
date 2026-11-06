import { AlertTriangle, CheckCircle2, RotateCcw, ShieldAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, inr, type Baseline, type Compliance, type Replay, type Segment } from '../api'
import { Section, Spinner } from '../components/ui'

// Validated (dataviz validator, light surface): categorical slot 1 + 2 — CVD ΔE 26.8, contrast ≥ 3:1.
const BEFORE = '#eb6834'
const AFTER = '#2a78d6'
const GRID = '#e1e0d9'
const AXIS = '#898781'

export default function Insights() {
  const [b, setB] = useState<Baseline | null>(null)
  const [r, setR] = useState<Replay | null>(null)
  const [rec, setRec] = useState<Record<string, number>>({})
  const [calls, setCalls] = useState(0.5)
  const [avoid, setAvoid] = useState(40)
  const [platform, setPlatform] = useState(40)
  const [c, setC] = useState<Compliance | null>(null)
  const [seg, setSeg] = useState<Segment[]>([])
  const [ev, setEv] = useState<Awaited<ReturnType<typeof api.eval>> | null>(null)
  const [live, setLive] = useState<Awaited<ReturnType<typeof api.live>> | null>(null)
  const [sla, setSla] = useState<Awaited<ReturnType<typeof api.slaAlerts>>>([])

  useEffect(() => {
    api.baseline().then((x) => { setB(x); setRec(Object.fromEntries(x.drops.map((d) => [d.reason, d.default_recovery]))) })
    api.compliance().then(setC)
    api.segments().then(setSeg)
    api.eval().then(setEv)
    api.live().then(setLive)
    api.slaAlerts().then(setSla)
  }, [])
  useEffect(() => {
    if (!b) return
    const t = setTimeout(() => api.replay({ recovery: rec, chase_calls_new: calls, field_cost_avoided_pct: avoid, platform_cost_per_lead: platform }).then(setR), 200)
    return () => clearTimeout(t)
  }, [b, rec, calls, avoid, platform])

  const stageData = useMemo(() => r?.stages.map((s) => ({ name: `${s.from} → ${s.to}`, Today: s.old_rate_pct, UdyamSync: s.new_rate_pct })) ?? [], [r])
  const byStage = useMemo(() => {
    const g: Record<string, Baseline['drops']> = {}
    b?.drops.forEach((d) => (g[d.stage] = [...(g[d.stage] ?? []), d]))
    return g
  }, [b])

  if (!b || !r) return <div className="p-6"><Spinner label="Replaying 5,000 leads…" /></div>

  const kpis: { label: string; k: keyof Replay['after']; fmt: (n: number) => string; better: 'up' | 'down' }[] = [
    { label: 'Lead → activation', k: 'conversion_pct', fmt: (n) => `${n}%`, better: 'up' },
    { label: 'Activations / quarter', k: 'activations', fmt: (n) => n.toLocaleString('en-IN'), better: 'up' },
    { label: 'Days to activate', k: 'days_to_activate', fmt: (n) => `${n}`, better: 'down' },
    { label: 'Chase calls / customer', k: 'chase_calls', fmt: (n) => `${n}`, better: 'down' },
    { label: 'Cost per activation', k: 'cac', fmt: inr, better: 'down' },
    { label: '6-month churn', k: 'churn_6m_pct', fmt: (n) => `${n}%`, better: 'down' },
  ]

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Replay the Quarter</h1>
        <p className="max-w-3xl text-sm text-slate-600">We take the case's real 5,000 leads (Apr–Jun 2026), and for every lead that dropped we ask: <i>would the UdyamSync feature that removes this drop reason have won it back?</i> Every assumption is a slider below. Nothing is a typed-in "projection".</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((x) => {
          const before = r.before[x.k] as number, after = r.after[x.k] as number
          const good = x.better === 'up' ? after > before : after < before
          return (
            <div key={x.k} className="card p-4">
              <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{x.label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">{x.fmt(after)}</div>
              <div className="text-xs text-slate-500">today {x.fmt(before)} <span className={good ? 'text-[#006300]' : 'text-rose-600'}>{good ? '▲ better' : '▼ worse'}</span></div>
            </div>
          )
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_26rem]">
        <Section title="Stage-by-stage pass rate" subtitle="% of leads that move to the next stage. Recovered leads can still drop later — no double counting.">
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={stageData} barGap={2} margin={{ left: -10, right: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: AXIS }} interval={0} angle={-12} height={50} tickLine={false} axisLine={{ stroke: '#c3c2b7' }} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(v) => `${v}%`} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Today" fill={BEFORE} radius={[4, 4, 0, 0]} maxBarSize={28} />
                <Bar dataKey="UdyamSync" fill={AFTER} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">Extra activations / quarter</div><div className="text-xl font-bold">+{r.impact.extra_activations_per_quarter.toLocaleString('en-IN')}</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">Extra annual recurring revenue</div><div className="text-xl font-bold">{inr(r.impact.extra_annual_recurring_revenue_inr / 1e7)} Cr</div></div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm"><div className="text-xs text-slate-500">NPS (from chase-call link)</div><div className="text-xl font-bold">{r.before.nps} → {r.after.nps}</div></div>
          </div>
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-xs text-slate-500">{r.assumptions.notes.map((n) => <li key={n}>{n}</li>)}</ul>
        </Section>

        <Section title="Assumptions (drag to stress-test)" right={<button onClick={() => { setRec(Object.fromEntries(b.drops.map((d) => [d.reason, d.default_recovery]))); setCalls(0.5); setAvoid(40); setPlatform(40) }} className="btn-ghost !px-2 !py-1 text-xs"><RotateCcw size={12} /> Reset</button>}>
          <div className="max-h-[30rem] space-y-4 overflow-y-auto pr-1">
            <Slider label="Chase calls per customer (tracker)" value={calls} min={0} max={3} step={0.1} fmt={(v) => v.toFixed(1)} onChange={setCalls} />
            <Slider label="Field/partner cost avoided by self-serve" value={avoid} min={0} max={80} step={5} fmt={(v) => `${v}%`} onChange={setAvoid} />
            <Slider label="Platform cost per lead (AI, OCR, hosting)" value={platform} min={0} max={300} step={10} fmt={(v) => `₹${v}`} onChange={setPlatform} />
            {['Lead', 'Contacted', 'Needs assessed', 'Quote accepted', 'KYC complete'].filter((st) => byStage[st]).map((stage) => [stage, byStage[stage]] as const).map(([stage, ds]) => (
              <div key={stage}>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Dropped at: {stage}</div>
                {ds.map((d) => (
                  <Slider key={d.reason} label={`${d.reason} (${d.count})`} hint={d.feature ?? undefined} value={rec[d.reason] ?? 0} min={0} max={1} step={0.05} fmt={(v) => `${Math.round(v * 100)}% won back`} onChange={(v) => setRec({ ...rec, [d.reason]: v })} />
                ))}
              </div>
            ))}
          </div>
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Why the tracker matters: churn rises with every chase call" subtitle={`Activated customers in the case data (n=${b.activations}). Single series: 6-month churn %.`}>
          <div className="h-56">
            <ResponsiveContainer>
              <LineChart data={b.churn_by_calls} margin={{ left: -10, right: 16, top: 8 }}>
                <CartesianGrid stroke={GRID} vertical={false} />
                <XAxis dataKey="calls" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} label={{ value: 'customer follow-up calls', position: 'insideBottom', offset: -2, fontSize: 11, fill: AXIS }} height={36} />
                <YAxis unit="%" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v, _n, p) => [`${v}% churn (NPS ${(p.payload as { nps: number }).nps}, n=${(p.payload as { n: number }).n})`, '']} labelFormatter={(l) => `${l} call(s)`} />
                <Line type="monotone" dataKey="churn_pct" stroke={AFTER} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-slate-500">1 call → {b.churn_by_calls[0]?.churn_pct}% churn; 5 calls → {b.churn_by_calls.at(-1)?.churn_pct}%. Removing chase calls is a retention lever, not just a support saving.</p>
        </Section>

        {c && (
          <Section title={<span className="flex items-center gap-2"><ShieldAlert size={18} className="text-[#d03b3b]" /> Compliance guard: {c.violating_activations} → {c.after}</span>}
            subtitle={`${c.violating_activations} of ${c.activations_checked} activations last quarter broke a catalogue rule — sold manually without checks. UdyamSync's rules engine blocks every one of them at quote time.`}>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(c.by_rule).map(([rule, n]) => (
                <div key={rule} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span className="flex items-center gap-1.5 text-slate-600"><AlertTriangle size={14} className="text-[#ec835a]" />{{ GSTIN_REQUIRED: 'Needs GSTIN, none/cancelled', CITY_TIER: 'Not sold in that city tier', MIN_EMPLOYEES: 'Below minimum team size', DEPENDENCY_UNMET: 'Missing required connectivity', MIN_SITES: 'Below minimum sites' }[rule] ?? rule}</span>
                  <b>{n}</b>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-[#006300]"><CheckCircle2 size={16} /> Re-run through the rules engine: {c.blocked_by_rules_engine}/{c.violating_activations} blocked · {inr(c.monthly_revenue_at_risk)}/month of revenue sold on shaky ground.</div>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-brand">Show the {c.cases.length} cases</summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">{c.cases.map((x) => <li key={x.lead_id} className="rounded-lg bg-slate-50 px-2 py-1"><b>{x.lead_id}</b> {x.business_type}, {x.city} (GSTIN {x.gstin_status}): {x.violations.map((v) => v.message).join(' ')}</li>)}</ul>
            </details>
          </Section>
        )}
      </div>

      <Section title="Which segment first? — segment opportunity matrix" subtitle="From the case data. Payback = acquisition cost per activation ÷ median monthly bundle. Lead with professional offices; scale micro-retail on WhatsApp with partners.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-slate-400"><tr><th className="py-2">#</th><th>Segment</th><th>Share of leads</th><th>Conversion</th><th>Median bundle</th><th>6-mo churn</th><th>Cost / activation</th><th>Payback</th><th>Play</th></tr></thead>
            <tbody>
              {seg.map((s) => (
                <tr key={s.code} className="border-t border-slate-100 align-top">
                  <td className="py-2 font-bold text-brand">{s.priority}</td><td className="font-semibold">{s.segment}</td><td>{s.share_of_leads_pct}%</td><td>{s.conversion_pct}%</td><td>{inr(s.median_mrr)}/mo</td><td>{s.churn_6m_pct}%</td><td>{inr(s.cac_per_activation)}</td>
                  <td className={s.payback_months > 4 ? 'font-semibold text-rose-600' : 'font-semibold text-[#006300]'}>{s.payback_months} mo</td><td className="max-w-xs text-xs text-slate-600">{s.play}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <div className="grid gap-5 lg:grid-cols-3">
        <Section title="Advisor test suite" subtitle="Our own scenarios (judges' scenarios are private). Every tier of every bundle must also pass the catalogue rules.">
          {ev ? (
            <>
              <div className="text-3xl font-bold">{ev.passed}/{ev.total} <span className="text-base font-medium text-slate-500">passing</span></div>
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs">{ev.results.map((x) => <li key={x.id} className="flex justify-between gap-2"><span>{x.passed ? '✅' : '❌'} {x.id} <span className="text-slate-400">({x.lang})</span></span><span className="text-slate-500">{x.tier} {x.monthly ? inr(x.monthly) : ''}</span></li>)}</ul>
            </>
          ) : <Spinner />}
        </Section>
        <Section title="Live from this instance" subtitle="Real telemetry from sessions on this server.">
          {live ? (
            <div className="space-y-1 text-sm">
              {Object.entries(live.funnel).map(([k, v]) => <div key={k} className="flex justify-between"><span className="capitalize text-slate-600">{k}</span><b>{v}</b></div>)}
              <div className="flex justify-between"><span className="text-slate-600">Avg minutes to order</span><b>{live.avg_minutes_to_order ?? '—'}</b></div>
              <div className="flex justify-between"><span className="text-slate-600">Handoffs to humans</span><b>{live.handoffs}</b></div>
              <div className="flex justify-between"><span className="text-slate-600">AI provider</span><b>{live.llm.provider}</b></div>
            </div>
          ) : <Spinner />}
        </Section>
        <Section title="Ops: SLA early warning" subtitle="Orders at risk of crossing 21 days — before the customer has to call.">
          {sla.length === 0 ? <p className="text-sm text-slate-500">No orders at risk.</p> : <ul className="space-y-1 text-xs">{sla.map((a) => <li key={a.order_id} className="rounded-lg bg-amber-50 px-2 py-1"><b>{a.business}</b> · {a.reason}</li>)}</ul>}
        </Section>
      </div>
    </div>
  )
}

function Slider({ label, hint, value, min, max, step, fmt, onChange }: { label: string; hint?: string; value: number; min: number; max: number; step: number; fmt: (v: number) => string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <div className="flex justify-between gap-2 text-xs"><span className="text-slate-700">{label}</span><span className="shrink-0 font-semibold">{fmt(value)}</span></div>
      {hint && <div className="text-[10px] text-slate-400">via {hint}</div>}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-[var(--brand)]" />
    </label>
  )
}
