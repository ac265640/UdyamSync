import { CalendarClock, CheckCircle2, Circle, Loader2, MessageCircle, PhoneOff, RefreshCw, Star, Wrench } from 'lucide-react'
import { useState } from 'react'
import { api, fmtDate, inr, type Order } from '../api'

export default function Tracker({ order, onChange, ops = true }: { order: Order; onChange: (o: Order) => void; ops?: boolean }) {
  const [resched, setResched] = useState(false)
  const [date, setDate] = useState(order.stages[3]?.eta?.slice(0, 10) ?? '')
  const [slot, setSlot] = useState(order.slots[1])
  const [busy, setBusy] = useState(false)
  const act = async (fn: () => Promise<Order>) => { setBusy(true); try { onChange(await fn()) } finally { setBusy(false) } }
  const live = order.status === 'live'

  return (
    <div className="h-[34rem] overflow-y-auto px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-muted">Order {order.id}</div>
          <h2 className="text-lg font-bold text-ink">{live ? 'You are live' : order.payment.status === 'failed' ? 'Payment needs a retry' : `Live in ~${order.days_left} days`}</h2>
          <div className="text-xs text-muted">{order.business} · {order.city} · {inr(order.quote.monthly_total)}/mo</div>
        </div>
        <div className="text-right text-xs">
          <div className="text-muted">All services by</div>
          <div className="font-semibold">{fmtDate(order.eta_live)}</div>
          {order.sla_breach_risk && <div className="pill mt-1 bg-rose-50 text-rose-700">SLA risk</div>}
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-paper"><div className="h-full bg-brand transition-all" style={{ width: `${order.progress * 100}%` }} /></div>

      {order.payment.status === 'failed' && (
        <button disabled={busy} onClick={() => act(() => api.retryPayment(order.id))} className="btn-primary mt-3 w-full"><RefreshCw size={16} /> Retry UPI AutoPay</button>
      )}

      <ol className="mt-4 space-y-0">
        {order.stages.map((s, i) => (
          <li key={s.key} className="relative flex gap-3 pb-4">
            {i < order.stages.length - 1 && <span className={`absolute left-[11px] top-6 h-full w-0.5 ${s.status === 'done' ? 'bg-[var(--brand)]' : 'bg-line'}`} />}
            {s.status === 'done' ? <CheckCircle2 className="z-10 shrink-0 text-brand" size={24} /> : s.status === 'active' ? <Loader2 className="z-10 shrink-0 animate-spin text-haldi" size={24} /> : <Circle className="z-10 shrink-0 text-line-strong" size={24} />}
            <div className="text-sm">
              <div className={`font-semibold ${s.status === 'pending' ? 'text-faint' : 'text-ink'}`}>{s.label}</div>
              <div className="text-xs text-muted">{s.at ? `Done ${fmtDate(s.at)}` : s.eta ? `Expected ${fmtDate(s.eta)}${s.slot ? ` · ${s.slot}` : ''}` : ''}</div>
              {s.key === 'scheduled' && s.status !== 'done' && !live && (
                <div className="mt-2 rounded-xl bg-paper p-2.5 ring-1 ring-line">
                  <div className="flex items-center gap-2 text-xs">
                    <Wrench size={14} /> <b>{order.technician.name}</b> <span className="flex items-center gap-0.5 text-amber-600"><Star size={11} fill="currentColor" />{order.technician.rating}</span> <span className="text-faint">{order.technician.phone_masked}</span>
                  </div>
                  {!resched ? (
                    <button onClick={() => setResched(true)} className="mt-1 flex items-center gap-1 text-xs font-semibold text-brand"><CalendarClock size={12} /> Reschedule visit</button>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1 text-xs">
                      <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-md px-2 py-1 ring-1 ring-line" />
                      <select value={slot} onChange={(e) => setSlot(e.target.value)} className="rounded-md px-2 py-1 ring-1 ring-line">{order.slots.map((x) => <option key={x}>{x}</option>)}</select>
                      <button onClick={() => { act(() => api.reschedule(order.id, date, slot)); setResched(false) }} className="btn-primary !px-2 !py-1 text-xs">Save</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>

      <h3 className="mt-1 text-sm font-semibold">Your services</h3>
      <ul className="mt-1 space-y-1">
        {order.products.map((p) => (
          <li key={p.product_id} className="flex items-center justify-between rounded-lg bg-paper px-3 py-1.5 text-xs">
            <span>{p.quantity > 1 ? `${p.quantity} × ` : ''}{p.name}</span>
            <span className={p.status === 'live' ? 'font-semibold text-leaf' : 'text-muted'}>{p.status === 'live' ? 'Live' : `by ${fmtDate(p.eta)}`}</span>
          </li>
        ))}
      </ul>

      <h3 className="mt-4 flex items-center gap-1 text-sm font-semibold"><MessageCircle size={14} className="text-leaf" /> Updates sent to you</h3>
      <ul className="mt-1 space-y-1.5">
        {[...order.notifications].reverse().map((n, i) => (
          <li key={i} className="rounded-xl rounded-tl-sm bg-[#dcf8c6] px-3 py-2 text-xs text-ink">
            {n.text}
            <div className="mt-0.5 text-right text-[10px] text-muted">{n.channel === 'whatsapp' ? 'WhatsApp' : 'In-app'} · {new Date(n.at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })} ✓✓</div>
          </li>
        ))}
      </ul>
      <p className="mt-3 flex items-center gap-1 text-[11px] text-muted"><PhoneOff size={12} /> No need to call us — every change shows up here and on WhatsApp.</p>
      {ops && !live && order.payment.status !== 'failed' && (
        <button disabled={busy} onClick={() => act(() => api.advance(order.id))} className="mt-3 w-full rounded-lg border border-dashed border-line-strong py-1.5 text-[11px] text-muted hover:bg-paper">
          Demo / field-ops: move to next stage →
        </button>
      )}
    </div>
  )
}
