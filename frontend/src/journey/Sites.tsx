import { Check, MapPin, Plus, Radio, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api, type AdvisorResponse } from '../api'

type Row = { name: string; pincode: string; result?: Awaited<ReturnType<typeof api.feasibility>> }

/** Where will we install? One row per branch; each is checked for fibre, and the bundle re-prices. */
export default function Sites({ state, onState }: { state: AdvisorResponse; onState: (s: AdvisorResponse) => void }) {
  const p = state.profile
  const initial: Row[] = p.site_list?.length
    ? p.site_list.map((s) => ({ name: s.name, pincode: s.pincode, result: { pincode: s.pincode, valid: true, fibre: s.fibre, technology: s.fibre ? 'Fibre' : '5G AirFiber', message: '' } }))
    : Array.from({ length: Math.max(1, p.sites ?? 1) }, (_, i) => ({ name: (p.sites ?? 1) > 1 ? `Branch ${i + 1}` : p.business_name || 'Main site', pincode: i === 0 ? p.pincode ?? '' : '' }))
  const [rows, setRows] = useState<Row[]>(initial)
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(!p.site_list?.length)
  const set = (i: number, patch: Partial<Row>) => setRows((r) => r.map((x, j) => (j === i ? { ...x, ...patch, result: patch.pincode !== undefined ? undefined : x.result } : x)))
  const ready = rows.every((r) => /^[1-9]\d{5}$/.test(r.pincode))

  const apply = async () => {
    setBusy(true)
    try {
      const results = await Promise.all(rows.map((r) => api.feasibility(r.pincode)))
      setRows(rows.map((r, i) => ({ ...r, result: results[i] })))
      onState(await api.patchProfile(state.session_id, { site_list: rows.map((r) => ({ name: r.name, pincode: r.pincode })) }))
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mt-3 rounded-xl bg-surface p-3 ring-1 ring-line">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-sm font-semibold"><MapPin size={15} className="text-brand" /> Where do we install?</span>
        <span className="text-xs text-muted">{rows.length} site{rows.length > 1 ? 's' : ''} · {open ? 'hide' : 'edit'}</span>
      </button>
      {!open && rows.some((r) => r.result) && (
        <ul className="mt-2 space-y-1 text-xs">
          {rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <span className="truncate">{r.name} · {r.pincode}</span>
              {r.result?.fibre === false
                ? <span className="pill shrink-0 bg-[#fdf3e2] text-[#8a5a00]"><Radio size={11} /> 5G AirFiber</span>
                : <span className="pill shrink-0 bg-[#e7f2ea] text-leaf"><Check size={11} /> Fibre</span>}
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <div key={i}>
              <div className="flex gap-2">
                <input value={r.name} onChange={(e) => set(i, { name: e.target.value })} placeholder="Branch name" className="field !py-2 !text-xs" aria-label="Branch name" />
                <input value={r.pincode} onChange={(e) => set(i, { pincode: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" placeholder="Pincode" className="field !w-28 !py-2 !text-xs" aria-label="Pincode" />
                {rows.length > 1 && <button onClick={() => setRows(rows.filter((_, j) => j !== i))} className="rounded-lg p-2 text-faint hover:bg-paper" aria-label="Remove site"><Trash2 size={14} /></button>}
              </div>
              {r.result && <p className={`mt-1 text-[11px] ${r.result.fibre === false ? 'text-[#8a5a00]' : 'text-leaf'}`}>{r.result.message}</p>}
            </div>
          ))}
          <div className="flex items-center justify-between pt-1">
            <button onClick={() => setRows([...rows, { name: `Branch ${rows.length + 1}`, pincode: '' }])} className="flex items-center gap-1 text-xs font-semibold text-brand"><Plus size={13} /> Add a branch</button>
            <button disabled={!ready || busy} onClick={apply} className="btn-primary !px-3 !py-1.5 text-xs">{busy ? 'Checking…' : 'Check & update bundle'}</button>
          </div>
          <p className="text-[10.5px] text-faint">Try 411001 to see a site without fibre switch to 5G AirFiber.</p>
        </div>
      )}
    </div>
  )
}
