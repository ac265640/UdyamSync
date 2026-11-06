import { Bot, Mic, MicOff, PhoneCall, Send, Sparkles, Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, inr, type AdvisorResponse, type Chip } from '../api'
import { RichText } from '../components/ui'
import { speak, useSpeechInput } from '../components/voice'

type Msg = { role: 'user' | 'assistant' | 'system'; text: string }

const TIER_LABEL: Record<string, string> = { essential: 'Essential', recommended: 'Recommended', pro: 'Pro' }

export default function Advisor({ state, setState, onCheckout }: { state: AdvisorResponse; setState: (s: AdvisorResponse) => void; onCheckout: () => void }) {
  const [msgs, setMsgs] = useState<Msg[]>(() => (state.messages?.length ? state.messages : state.replies.map((t) => ({ role: 'assistant' as const, text: t }))))
  const [chips, setChips] = useState<Chip[]>(state.chips)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [tts, setTts] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [msgs, busy])

  const send = useCallback(
    async (text: string, label?: string) => {
      if (!text.trim() || busy) return
      if (text === 'action:checkout') return onCheckout()
      setMsgs((m) => [...m, { role: 'user', text: label ?? text }])
      setInput('')
      setBusy(true)
      try {
        const r = await api.send(state.session_id, text)
        setState(r)
        setChips(r.chips)
        const extra: Msg[] = []
        if (r.handoff) extra.push({ role: 'system', text: 'A person from Accel Business will call you — your chat summary is already with them.' })
        if (r.resume_link) extra.push({ role: 'system', text: `Saved. Continue anytime: ${location.origin}${r.resume_link}` })
        setMsgs((m) => [...m, ...r.replies.map((t) => ({ role: 'assistant' as const, text: t })), ...extra])
        if (tts && r.replies.length) speak(r.replies.join(' '), r.lang)
        if (r.go === 'checkout') setTimeout(onCheckout, 400)
      } catch (e) {
        setMsgs((m) => [...m, { role: 'system', text: `Network hiccup — your progress is saved. (${(e as Error).message})` }])
      } finally {
        setBusy(false)
      }
    },
    [busy, onCheckout, setState, state.session_id, tts],
  )

  const voice = useSpeechInput(state.lang, (t) => send(t, `(voice) ${t}`))
  const rec = state.recommendation
  const tier = state.selected_tier || rec?.default_tier

  return (
    <div className="flex h-[34rem] flex-col">
      <div className="flex-1 space-y-3 overflow-y-auto bg-paper px-3 py-4">
        {msgs.map((m, i) =>
          m.role === 'system' ? (
            <div key={i} className="fade-in mx-auto max-w-[90%] rounded-xl bg-amber-50 px-3 py-2 text-center text-xs text-amber-800 ring-1 ring-amber-200">{m.text}</div>
          ) : (
            <div key={i} className={`fade-in flex gap-2 ${m.role === 'user' ? 'justify-end' : ''}`}>
              {m.role === 'assistant' && <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand text-white"><Bot size={15} /></div>}
              <div className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${m.role === 'user' ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-surface text-ink ring-1 ring-line'}`}>
                <RichText text={m.text} />
              </div>
            </div>
          ),
        )}
        {rec && tier && rec.tiers[tier] && (
          <div className="fade-in ml-9 rounded-2xl bg-surface p-3 shadow-sm ring-1 ring-line">
            <div className="mb-2 flex gap-1 rounded-xl bg-paper p-1">
              {Object.keys(rec.tiers).map((t) => (
                <button key={t} onClick={() => api.select(state.session_id, t).then(setState)} className={`flex-1 rounded-lg py-1 text-xs font-semibold ${t === tier ? 'bg-surface text-brand shadow' : 'text-muted'}`}>
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <div className="flex items-baseline justify-between">
              <div className="display num text-[1.9rem] font-semibold text-ink">{inr(rec.tiers[tier].monthly_total)}<span className="text-sm font-normal text-muted">/month + GST</span></div>
              <div className="text-xs text-muted">Live in ~{rec.tiers[tier].full_activation_days} days</div>
            </div>
            <ul className="mt-2 space-y-1.5">
              {rec.tiers[tier].lines.map((l) => (
                <li key={l.product_id} className="text-xs">
                  <div className="flex justify-between gap-2 font-medium text-ink">
                    <span>{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.name}</span>
                    <span>{inr(l.monthly)}</span>
                  </div>
                  <div className="text-muted">{l.why}</div>
                </li>
              ))}
            </ul>
            {rec.tiers[tier].blocked.length > 0 && (
              <div className="mt-2 rounded-lg bg-paper p-2 text-[11px] text-muted">
                Not yet: {rec.tiers[tier].blocked.map((b) => b.name).join(', ')} — {rec.tiers[tier].blocked[0].reasons[0].message}
              </div>
            )}
            <button onClick={onCheckout} className="btn-primary mt-3 w-full"><Sparkles size={16} /> Customise &amp; continue</button>
          </div>
        )}
        {busy && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Bot size={15} /></div>
            <div className="typing rounded-2xl bg-surface px-4 py-3 text-lg leading-none ring-1 ring-line"><span>•</span><span>•</span><span>•</span></div>
          </div>
        )}
        <div ref={end} />
      </div>

      {chips.length > 0 && (
        <div className="flex gap-2 overflow-x-auto border-t border-line bg-surface px-3 py-2">
          {chips.map((c) => (
            <button
              key={c.value + c.label}
              onClick={() => send(c.value, c.label)}
              className={`chip shrink-0 ${c.primary ? 'border-transparent bg-brand text-white' : c.selected ? 'border-brand bg-brand-soft text-brand' : 'border-line bg-surface text-ink hover:border-line-strong'}`}
            >
              {c.selected ? '✓ ' : ''}{c.label}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex items-center gap-2 border-t border-line bg-surface p-2">
        <button type="button" onClick={() => setTts(!tts)} className="rounded-lg p-2 text-muted hover:bg-paper" title={tts ? 'Voice replies on' : 'Voice replies off'}>
          {tts ? <Volume2 size={18} /> : <VolumeX size={18} />}
        </button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={voice.listening ? 'Listening…' : state.lang === 'en' ? 'Type or tap the mic…' : 'लिखिए या माइक दबाइए…'}
          className="min-w-0 flex-1 rounded-xl bg-paper px-3 py-2.5 text-sm outline-none focus:ring-2 ring-brand"
        />
        {voice.supported && (
          <button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`rounded-xl p-2.5 ${voice.listening ? 'animate-pulse bg-rose-500 text-white' : 'bg-paper text-ink'}`} title="Speak">
            {voice.listening ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        )}
        <button disabled={!input.trim() || busy} className="btn-primary !px-3"><Send size={16} /></button>
      </form>
      {state.lead_id && (
        <div className="flex items-center justify-center gap-1 bg-[#e7f2ea] py-1 text-[11px] text-leaf"><PhoneCall size={12} /> A human advisor has your context — no need to repeat yourself.</div>
      )}
    </div>
  )
}
