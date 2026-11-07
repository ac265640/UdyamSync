import { Building2, Check, MapPin, ShieldCheck, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, type AdvisorResponse, type Order } from '../api'
import { ErrorNote, Spinner } from '../components/ui'
import Tracker from '../components/Tracker'
import Advisor from './Advisor'
import Kyc from './Kyc'
import OneBill from './OneBill'
import Pay from './Pay'

export type Step = 'advisor' | 'quote' | 'kyc' | 'pay' | 'track'
const STEPS: { key: Step; label: string }[] = [
  { key: 'advisor', label: 'Advisor' },
  { key: 'quote', label: 'OneBill' },
  { key: 'kyc', label: 'Verify' },
  { key: 'pay', label: 'Sign & pay' },
  { key: 'track', label: 'Track' },
]
export const LANGS: Record<string, string> = { en: 'English', hi: 'हिन्दी', mr: 'मराठी', gu: 'ગુજરાતી', ta: 'தமிழ்', te: 'తెలుగు', kn: 'ಕನ್ನಡ', bn: 'বাংলা', ml: 'മലയാളം', pa: 'ਪੰਜਾਬੀ' }
const KEY = 'udyamsync.journey'

type Saved = { sid: string; step: Step; lang: string; orderId?: string; partner?: string | null }

export default function Journey() {
  const [params] = useSearchParams()
  const { sid: resumeSid } = useParams()
  const nav = useNavigate()
  const partner = params.get('partner')
  const [saved, setSaved] = useState<Saved | null>(null)
  const [state, setState] = useState<AdvisorResponse | null>(null)
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lang, setLang] = useState(params.get('lang') || 'hi')

  const persist = useCallback((s: Saved) => {
    setSaved(s)
    localStorage.setItem(KEY, JSON.stringify(s))
  }, [])

  // Resume (auto-save on device) or start a new session.
  useEffect(() => {
    const fromUrl = resumeSid || params.get('session')
    const raw = localStorage.getItem(KEY)
    const local: Saved | null = raw ? JSON.parse(raw) : null
    const sid = fromUrl || (params.get('new') ? null : local?.sid)
    const step = (params.get('step') as Step) || (fromUrl ? 'advisor' : local?.step) || 'advisor'
    if (sid && !partner) {
      api.resume(sid).then((r) => {
        setState(r)
        setLang(r.lang)
        const st = !params.get('step') && r.recommendation && fromUrl ? 'quote' : step
        persist({ sid, step: st, lang: r.lang, orderId: local?.sid === sid ? local?.orderId : undefined, partner: null })
        if (local?.sid === sid && local.orderId) api.getOrder(local.orderId).then(setOrder).catch(() => {})
      }).catch(() => begin(lang))
    } else {
      begin(lang)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function begin(l: string) {
    setOrder(null)
    const say = params.get('say')
    api.start(l, partner ? 'partner' : 'web', partner, params.get('source')).then(async (r) => {
      if (say) {
        await api.send(r.session_id, say)
        r = await api.resume(r.session_id)
      }
      setState(r)
      persist({ sid: r.session_id, step: 'advisor', lang: l, partner })
    }).catch((e) => setError(String(e.message)))
  }

  const go = (step: Step) => saved && persist({ ...saved, step })
  const restart = (l = lang) => {
    localStorage.removeItem(KEY)
    setState(null)
    setLang(l)
    nav('/start' + (partner ? `?partner=${partner}` : ''), { replace: true })
    begin(l)
  }

  if (error) return <div className="mx-auto max-w-md p-6"><ErrorNote error={`Couldn't reach the UdyamSync API (${error}). Is the backend running on :8000?`} /></div>
  if (!state || !saved) return <div className="mx-auto max-w-md p-6"><Spinner label="Starting your advisor…" /></div>

  const idx = STEPS.findIndex((s) => s.key === saved.step)
  const p = state.profile

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-3 py-4 lg:grid-cols-[minmax(0,28rem)_1fr] lg:px-6">
      <div className="mx-auto w-full max-w-md">
        {partner && (
          <div className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 ring-1 ring-amber-200">
            <b>Assisted mode</b> · Partner {partner} is onboarding this customer. Commission is credited automatically.
          </div>
        )}
        <div className="card overflow-hidden">
          <div className="bg-brand px-4 pb-3 pt-3 text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">Vyapar Saathi</div>
              <div className="flex items-center gap-2">
                <select value={lang} onChange={(e) => restart(e.target.value)} className="rounded-lg bg-surface/15 px-2 py-1 text-xs text-white outline-none" aria-label="Language">
                  {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k} className="text-ink">{v}</option>)}
                </select>
                <button onClick={() => restart()} className="rounded-lg bg-surface/15 px-2 py-1 text-xs">New</button>
              </div>
            </div>
            <ol className="mt-3 flex items-center gap-1">
              {STEPS.map((s, i) => (
                <li key={s.key} className="flex flex-1 flex-col items-center gap-1">
                  <button
                    disabled={i > idx}
                    onClick={() => i <= idx && go(s.key)}
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${i < idx ? 'bg-surface text-brand' : i === idx ? 'bg-haldi text-white ring-2 ring-white' : 'bg-surface/20 text-white/70'}`}
                  >
                    {i < idx ? <Check size={14} /> : i + 1}
                  </button>
                  <span className={`text-[10px] ${i === idx ? 'font-semibold' : 'text-white/70'}`}>{s.label}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="min-h-[34rem]">
            {saved.step === 'advisor' && <Advisor state={state} setState={setState} onCheckout={() => go('quote')} />}
            {saved.step === 'quote' && <OneBill state={state} onState={setState} onBack={() => go('advisor')} onContinue={() => go('kyc')} />}
            {saved.step === 'kyc' && <Kyc sid={saved.sid} lang={lang} onBack={() => go('quote')} onContinue={() => go('pay')} />}
            {saved.step === 'pay' && (
              <Pay sid={saved.sid} state={state} onBack={() => go('kyc')} onOrdered={(o) => { setOrder(o); persist({ ...saved, step: 'track', orderId: o.id }) }} />
            )}
            {saved.step === 'track' && (order ? <Tracker order={order} onChange={setOrder} /> : <div className="p-6"><Spinner label="Loading your order…" /></div>)}
          </div>
        </div>
        <p className="mt-2 text-center text-[11px] text-faint">Progress is saved on this device — close the app and continue anytime.</p>
      </div>

      <aside className="hidden space-y-4 lg:block">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-ink">What the advisor understood</h3>
          <p className="text-xs text-muted">Updates live as you chat. {p.prefilled_from?.length ? `Auto-filled from ${p.prefilled_from.join(' + ')}.` : 'Type a GSTIN to auto-fill from the registry.'}</p>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <Fact icon={<Building2 size={15} />} label="Business" value={p.business_name || p.business_type} badge={p.prefilled_from?.includes('GST registry') ? 'GST' : undefined} />
            <Fact label="Segment" value={p.segment_name} />
            <Fact icon={<MapPin size={15} />} label="City" value={p.city ? `${p.city} · Tier ${p.city_tier}` : null} />
            <Fact icon={<Users size={15} />} label="Team / sites" value={p.employees ? `${p.employees} people · ${p.sites ?? '?'} site(s)` : null} />
            <Fact label="GSTIN" value={p.gstin_masked ? `${p.gstin_masked} · ${p.gstin_status}` : p.gstin_status === 'none' ? 'Not provided' : p.gstin_status} warn={['cancelled', 'suspended'].includes(p.gstin_status)} />
            <Fact label="Udyam" value={p.udyam_masked ? `${p.udyam_type} enterprise` : null} />
            <Fact label="Today's internet" value={p.current_internet ? `${p.current_internet}${p.current_spend ? ` · ₹${p.current_spend}/mo` : ''}` : null} />
            <Fact label="Needs" value={p.needs?.length ? p.needs.join(', ').replace(/_/g, ' ') : null} />
          </dl>
        </div>
        <div className="card flex gap-3 p-5 text-sm text-muted">
          <ShieldCheck className="shrink-0 text-leaf" />
          <div>
            <div className="font-semibold text-ink">Your data, your control</div>
            We only ask what each step needs. Identifiers are masked on screen and in logs, raw GSTIN is stored encrypted, document images are deleted after verification, and you can see or erase everything from <a className="text-brand underline" href={`/my-data/${saved.sid}`}>My Data</a>.
          </div>
        </div>
      </aside>
    </div>
  )
}

function Fact({ label, value, icon, badge, warn }: { label: string; value?: string | null; icon?: React.ReactNode; badge?: string; warn?: boolean }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-faint">{icon}{label}</dt>
      <dd className={`mt-0.5 font-medium ${value ? (warn ? 'text-rose-600' : 'text-ink') : 'text-line-strong'}`}>
        {value || '—'} {badge && <span className="pill ml-1 bg-[#e7f2ea] text-leaf">from {badge}</span>}
      </dd>
    </div>
  )
}
