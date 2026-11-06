import { Mic, Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { inr } from '../api'
import { prefersReducedMotion } from '../motion/SmoothScroll'
import Phone, { AppBar } from './Phone'

type Preview = { business: string; city: string; tier: string; monthly: number; days: number; lines: { name: string; quantity: number; monthly: number; why: string }[] }

// Three owners, three languages. Prices come live from the same engine the app uses.
const SCENES = [
  { lang: 'hi', greet: 'नमस्ते! अपने बिज़नेस के बारे में बताइए।', say: 'मेरी पुणे में डेंटल क्लिनिक है, 8 लोग, 1 क्लिनिक, डेटा बैकअप चाहिए', voice: true, lead: 'आपके डेंटल क्लिनिक के लिए मेरा सुझाव:', unit: '/महीना', live: 'दिनों में चालू' },
  { lang: 'mr', greet: 'नमस्कार! तुमच्या व्यवसायाबद्दल सांगा.', say: 'नाशिक मध्ये किराणा दुकान, फक्त मी, UPI बिलिंग', voice: false, lead: 'तुमच्या किराणा दुकानासाठी:', unit: '/महिना', live: 'दिवसांत सुरू' },
  { lang: 'en', greet: 'Namaste! Tell me about your business.', say: '3 restaurants in Bengaluru, 25 staff, CCTV and UPI billing', voice: false, lead: 'For your three restaurants:', unit: '/month', live: 'days to go live' },
]
// One cycle: greeting → owner speaks → advisor thinks → bundle lands → hold.
const BEATS = [0, 900, 2300, 3300, 9200]

export default function HeroPhone() {
  const [scene, setScene] = useState(0)
  const [beat, setBeat] = useState(3)
  const [paused, setPaused] = useState(false)
  const [data, setData] = useState<(Preview | null)[]>([null, null, null])
  const timers = useRef<number[]>([])

  useEffect(() => {
    SCENES.forEach((s, i) =>
      fetch('/api/advisor/preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: s.say, lang: s.lang }) })
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => setData((d) => d.map((x, j) => (j === i ? p : x))))
        .catch(() => {}),
    )
  }, [])

  useEffect(() => {
    if (paused || prefersReducedMotion()) return
    const clear = () => { timers.current.forEach(clearTimeout); timers.current = [] }
    clear()
    // start each scene from the greeting; the first paint already shows a finished frame
    const run = (sc: number) => {
      setScene(sc)
      BEATS.forEach((t, b) => {
        timers.current.push(window.setTimeout(() => {
          if (b === BEATS.length - 1) run((sc + 1) % SCENES.length)
          else setBeat(b)
        }, t))
      })
    }
    timers.current.push(window.setTimeout(() => run(1), 5200))
    return clear
  }, [paused])

  const s = SCENES[scene]
  const p = data[scene]
  return (
    <div className="relative">
      <Phone label="Live demo of the Vyapar Saathi advisor">
        <AppBar />
        <div className="space-y-2.5 px-3 py-4 text-[12.5px] leading-snug" lang={s.lang}>
          <div key={`g${scene}`} className="msg-in max-w-[85%] rounded-2xl rounded-bl-md bg-paper px-3 py-2 shadow-[inset_0_0_0_1px_var(--color-line)]">{s.greet}</div>
          {beat >= 1 && (
            <div key={`u${scene}`} className="msg-in ml-auto max-w-[86%] rounded-2xl rounded-br-md bg-brand px-3 py-2 text-white">
              {s.voice && <span className="mb-1 flex items-center gap-1 text-[10.5px] text-white/75"><Mic size={11} /> 0:04 · voice note</span>}
              {s.say}
            </div>
          )}
          {beat === 2 && <div className="typing w-fit rounded-2xl bg-paper px-3 py-2 text-base leading-none shadow-[inset_0_0_0_1px_var(--color-line)]"><span>•</span><span>•</span><span>•</span></div>}
          {beat >= 3 && (
            <div key={`r${scene}`} className="msg-in rounded-2xl rounded-bl-md bg-paper p-3 shadow-[inset_0_0_0_1px_var(--color-line)]">
              <div className="text-muted">{s.lead}</div>
              {p ? (
                <>
                  <div className="mt-1 flex items-baseline gap-1"><span className="display text-[26px] font-semibold num">{inr(p.monthly)}</span><span className="text-[11px] text-muted">{s.unit} + GST</span></div>
                  <ul className="mt-1.5 space-y-1 border-t border-line pt-1.5">
                    {p.lines.slice(0, 4).map((l) => (
                      <li key={l.name} className="flex justify-between gap-2 text-[11.5px]"><span>{l.quantity > 1 ? `${l.quantity} × ` : ''}{l.name}</span><span className="num text-muted">{inr(l.monthly)}</span></li>
                    ))}
                  </ul>
                  <div className="mt-2 text-[11px] font-medium text-brand">~{p.days} {s.live}</div>
                </>
              ) : <div className="mt-2 h-20 animate-pulse rounded-lg bg-line/50" />}
            </div>
          )}
        </div>
        <div className="absolute inset-x-3 bottom-4 flex items-center gap-2 rounded-full bg-paper px-3 py-2 text-[12px] text-faint shadow-[inset_0_0_0_1px_var(--color-line)]">
          <span className="flex-1">{s.lang === 'en' ? 'Type or speak…' : s.lang === 'mr' ? 'लिहा किंवा बोला…' : 'लिखिए या बोलिए…'}</span>
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand text-white"><Mic size={14} /></span>
        </div>
      </Phone>
      <button onClick={() => setPaused(!paused)} className="absolute -right-2 bottom-6 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-paper shadow-md transition-transform hover:-translate-y-px" aria-label={paused ? 'Play demo' : 'Pause demo'}>
        {paused ? <Play size={14} /> : <Pause size={14} />}
      </button>
      <div className="mt-5 flex justify-center gap-1.5" aria-hidden>
        {SCENES.map((x, i) => <span key={x.lang} className={`h-1.5 rounded-full transition-all duration-300 ${i === scene ? 'w-6 bg-brand' : 'w-1.5 bg-line-strong'}`} />)}
      </div>
    </div>
  )
}
