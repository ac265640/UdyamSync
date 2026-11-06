import { ArrowLeft, CheckCheck, Mic, MoreVertical, Paperclip, Phone, Send, Video } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { api, inr, type AdvisorResponse, type Chip } from '../api'
import { useBrand } from '../brand'
import Listening from '../components/Listening'
import { RichText } from '../components/ui'
import { useSpeechInput } from '../components/voice'
import { LANGS } from '../journey/Journey'

type Msg = { from: 'me' | 'biz'; text: string; time: string; card?: AdvisorResponse; voice?: boolean }
const now = () => new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

export default function WhatsApp() {
  const { name } = useBrand()
  const [params] = useSearchParams()
  const [lang, setLang] = useState(params.get('lang') || 'hi')
  const said = useRef(false)
  const [sid, setSid] = useState<string | null>(null)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [chips, setChips] = useState<Chip[]>([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const start = useCallback((l: string, alive: () => boolean) => {
    setMsgs([{ from: 'me', text: 'Hi', time: now() }])
    setSid(null)
    said.current = false
    api.start(l, 'whatsapp', null, 'WhatsApp campaign').then((r) => {
      if (!alive()) return
      setSid(r.session_id)
      setChips(r.chips)
      setMsgs((m) => [...m, ...r.replies.map((t) => ({ from: 'biz' as const, text: t, time: now() }))])
    })
  }, [])
  useEffect(() => {
    let alive = true
    start(lang, () => alive)
    return () => { alive = false }
  }, [lang, start])
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  const send = useCallback(async (text: string, label?: string, voice = false) => {
    if (!sid || !text.trim()) return
    if (text === 'action:checkout') { window.location.href = `/start?session=${sid}&step=quote`; return }
    setMsgs((m) => [...m, { from: 'me', text: label ?? text, time: now(), voice }])
    setInput('')
    setTyping(true)
    const r = await api.send(sid, text)
    setTyping(false)
    setChips(r.chips.slice(0, 7))
    const out: Msg[] = r.replies.map((t) => ({ from: 'biz', text: t, time: now() }))
    if (r.recommendation && (r.stage === 'recommended' || r.select_tier)) out.push({ from: 'biz', text: '', time: now(), card: r })
    setMsgs((m) => [...m, ...out])
  }, [sid])
  const voice = useSpeechInput(lang, (t) => send(t, t, true))
  useEffect(() => {
    const say = params.get('say')
    if (sid && say && !said.current) { said.current = true; setTimeout(() => send(say), 600) }
  }, [sid, params, send])

  return (
    <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 px-4 py-6 lg:flex-row lg:items-start">
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] border-[10px] border-ink bg-ink shadow-2xl">
        <div className="flex items-center gap-2 bg-[#075e54] px-3 py-2.5 text-white">
          <ArrowLeft size={18} />
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-xs font-bold text-[#075e54]">AB</div>
          <div className="flex-1 leading-tight">
            <div className="flex items-center gap-1 text-sm font-semibold">{name} <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#25d366] text-[8px]">✓</span></div>
            <div className="text-[10px] text-white/70">{typing ? 'typing…' : 'Official business account'}</div>
          </div>
          <Video size={18} /><Phone size={16} /><MoreVertical size={18} />
        </div>
        <div className="wa-bg h-[30rem] space-y-1.5 overflow-y-auto px-2 py-3">
          <div className="mx-auto w-fit rounded-md bg-[#fff5c4] px-2 py-1 text-center text-[10px] text-muted">🔒 Messages are end-to-end encrypted. Accel never asks for OTPs or passwords here.</div>
          {msgs.map((m, i) => (
            <div key={i} className={`flex ${m.from === 'me' ? 'justify-end' : ''}`}>
              {m.card ? <QuoteCard r={m.card} onOpen={() => (window.location.href = `/start?session=${m.card!.session_id}&step=quote`)} /> : (
                <div className={`max-w-[80%] rounded-lg px-2.5 py-1.5 text-[13px] shadow-sm ${m.from === 'me' ? 'rounded-tr-none bg-[#dcf8c6]' : 'rounded-tl-none bg-surface'}`}>
                  {m.voice && <div className="mb-1 flex items-center gap-1 text-[11px] text-muted"><Mic size={11} /> Voice note · transcribed</div>}
                  <RichText text={m.text} />
                  <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-faint">{m.time} {m.from === 'me' && <CheckCheck size={13} className="text-sky-500" />}</div>
                </div>
              )}
            </div>
          ))}
          <div ref={end} />
        </div>
        {chips.length > 0 && (
          <div className="grid grid-cols-2 gap-1 bg-[#efeae2] px-2 pb-1">
            {chips.slice(0, 6).map((c) => (
              <button key={c.value + c.label} onClick={() => send(c.value, c.label)} className={`truncate rounded-lg bg-surface py-1.5 text-[12px] font-medium shadow-sm ${c.selected ? 'text-[#075e54] ring-1 ring-[#25d366]' : 'text-[#027eb5]'}`}>{c.label}</button>
            ))}
          </div>
        )}
        {voice.listening && <Listening lang={lang} onStop={voice.stop} dark />}
        <form onSubmit={(e) => { e.preventDefault(); send(input) }} className="flex items-center gap-1.5 bg-[#efeae2] px-2 pb-2 pt-1">
          <div className="flex flex-1 items-center gap-2 rounded-full bg-surface px-3 py-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Message" className="min-w-0 flex-1 text-sm outline-none" />
            <Paperclip size={16} className="text-faint" />
          </div>
          {input ? (
            <button className="flex h-10 w-10 items-center justify-center rounded-full bg-[#00a884] text-white"><Send size={17} /></button>
          ) : (
            <button type="button" onClick={voice.listening ? voice.stop : voice.start} className={`flex h-10 w-10 items-center justify-center rounded-full text-white ${voice.listening ? 'animate-pulse bg-rose-500' : 'bg-[#00a884]'}`} title="Hold to talk"><Mic size={17} /></button>
          )}
        </form>
      </div>
      <div className="max-w-md space-y-4">
        <h1 className="display text-[2.6rem]">The advisor, inside WhatsApp</h1>
        <p className="text-muted">Micro-retail owners live on WhatsApp. This is the same advisor and rules engine as the web app — the conversation, quote and KYC carry over, so a customer can start here and finish on the web (or with a partner) without repeating anything.</p>
        <label className="block text-sm font-medium">Language
          <select value={lang} onChange={(e) => setLang(e.target.value)} className="mt-1 block w-full rounded-xl bg-surface px-3 py-2 ring-1 ring-line">
            {Object.entries(LANGS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Tap the mic to send a voice note; it's transcribed on your device.</li>
          <li>Quick-reply buttons for every question.</li>
          <li>The quote arrives as a card; "View &amp; customise" opens OneBill in the same session.</li>
        </ul>
        <p className="text-xs text-faint">Prototype simulates the WhatsApp Business API (which needs a paid Meta BSP). In production this connects through Accel's own WhatsApp API product (P15).</p>
        <Link to="/start" className="btn-ghost">Open the web app instead</Link>
      </div>
    </div>
  )
}

function QuoteCard({ r, onOpen }: { r: AdvisorResponse; onOpen: () => void }) {
  const rec = r.recommendation!
  const t = r.selected_tier || rec.default_tier
  const q = rec.tiers[t]
  return (
    <div className="w-[85%] overflow-hidden rounded-lg rounded-tl-none bg-surface shadow-sm">
      <div className="bg-brand px-3 py-2 text-white">
        <div className="text-[11px] uppercase tracking-wide opacity-80">{t} bundle</div>
        <div className="text-lg font-bold">{inr(q.monthly_total)}<span className="text-xs font-normal">/month + GST</span></div>
      </div>
      <ul className="space-y-0.5 px-3 py-2 text-[12px] text-ink">
        {q.lines.slice(0, 5).map((l) => <li key={l.product_id}>• {l.quantity > 1 ? `${l.quantity}× ` : ''}{l.name}</li>)}
        {q.lines.length > 5 && <li className="text-faint">+ {q.lines.length - 5} more</li>}
      </ul>
      <button onClick={onOpen} className="w-full border-t border-line py-2 text-[13px] font-semibold text-[#027eb5]">View &amp; customise</button>
    </div>
  )
}
