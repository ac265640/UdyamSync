import { Download, ShieldCheck, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, type MyData as MD } from '../api'
import { ErrorNote, Section, Spinner } from '../components/ui'

export default function MyData() {
  const { sid } = useParams()
  const [d, setD] = useState<MD | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirm, setConfirm] = useState(false)
  const load = (): void => { if (sid) api.myData(sid).then(setD).catch((e) => setError(e.message)) }
  useEffect(() => { load() }, [sid]) // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <div className="mx-auto max-w-3xl p-6"><ErrorNote error={error} /></div>
  if (!d || !sid) return <div className="p-6"><Spinner /></div>
  const toggle = (purpose: string, granted: boolean) => api.consent(sid, { [purpose]: granted }).then(load)
  const download = () => {
    const blob = new Blob([JSON.stringify(d, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `udyamsync-my-data-${sid}.json`
    a.click()
  }
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <div className="flex items-center gap-2"><ShieldCheck className="text-emerald-600" /><h1 className="text-2xl font-bold">My Data</h1></div>
      {d.erased ? <div className="card p-6 text-sm">Your data has been erased. Only an audit record that the erasure happened remains.</div> : (
        <>
          <Section title="What we hold about your business" right={<button onClick={download} className="btn-ghost text-xs"><Download size={14} /> Download (JSON)</button>}>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              {Object.entries(d.profile).filter(([, v]) => v !== null && v !== '' && !(Array.isArray(v) && !v.length)).map(([k, v]) => (
                <div key={k}><dt className="text-[11px] uppercase tracking-wide text-slate-400">{k.replace(/_/g, ' ')}</dt><dd className="font-medium">{Array.isArray(v) ? v.join(', ') : String(v)}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-slate-500">{d.chat_messages} chat messages (stored with identifiers masked). Shared with a partner: {d.shared_with_partner ? 'yes' : 'no'}.</p>
          </Section>
          <Section title="Documents" subtitle="Images are encrypted and deleted automatically after verification.">
            {d.documents.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded.</p> : (
              <ul className="space-y-1 text-sm">{d.documents.map((x) => <li key={x.type} className="flex justify-between"><span>{x.type.replace(/_/g, ' ')}</span><span className="text-xs text-slate-500">{x.purged ? 'image deleted' : x.purge_after ? `auto-delete ${new Date(x.purge_after).toLocaleDateString('en-IN')}` : 'kept until verified'}</span></li>)}</ul>
            )}
          </Section>
          <Section title="Your consents" subtitle={`Ledger integrity: ${d.consent_receipt.integrity.valid ? `✓ verified (${d.consent_receipt.integrity.records} records, head ${d.consent_receipt.integrity.head})` : '✗ broken'}`}>
            <ul className="space-y-2 text-sm">
              {Object.entries(d.consents).map(([p, c]) => (
                <li key={p} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2">
                  <span>{p.replace(/_/g, ' ')} <span className="text-xs text-slate-400">· since {new Date(c.at).toLocaleString('en-IN')}</span></span>
                  <button onClick={() => toggle(p, !c.granted)} className={`pill ${c.granted ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'}`}>{c.granted ? 'Granted — withdraw' : 'Withdrawn — grant'}</button>
                </li>
              ))}
              {Object.keys(d.consents).length === 0 && <li className="text-slate-500">No consents recorded yet.</li>}
            </ul>
          </Section>
          <Section title="Activity log" subtitle="Every access and change, newest first.">
            <ul className="max-h-48 space-y-0.5 overflow-y-auto font-mono text-xs text-slate-600">{d.activity.map((a, i) => <li key={i}>{new Date(a.at).toLocaleString('en-IN')} · {a.action}</li>)}</ul>
          </Section>
          <div className="card border border-rose-200 p-5">
            <h3 className="font-semibold text-rose-700">Erase my data</h3>
            <p className="text-sm text-slate-600">Deletes your profile, chat, documents and leads. Active orders may need some data kept for billing and legal reasons — we tell you exactly what.</p>
            {!confirm ? <button onClick={() => setConfirm(true)} className="btn mt-3 bg-rose-600 text-white"><Trash2 size={14} /> Erase</button> : (
              <div className="mt-3 flex gap-2"><button onClick={() => api.erase(sid).then(load)} className="btn bg-rose-600 text-white">Yes, erase permanently</button><button onClick={() => setConfirm(false)} className="btn-ghost">Cancel</button></div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
