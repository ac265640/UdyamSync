// Free, on-device voice using the browser's Web Speech API (Chrome supports Hindi & Indian languages).
import { useCallback, useEffect, useRef, useState } from 'react'

export const SPEECH_LANG: Record<string, string> = {
  en: 'en-IN', hi: 'hi-IN', mr: 'mr-IN', gu: 'gu-IN', ta: 'ta-IN', te: 'te-IN', kn: 'kn-IN', bn: 'bn-IN', ml: 'ml-IN', pa: 'pa-IN',
}

type Rec = { lang: string; interimResults: boolean; continuous: boolean; start: () => void; stop: () => void; onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null; onend: (() => void) | null; onerror: (() => void) | null }

export function useSpeechInput(lang: string, onText: (t: string) => void) {
  const recRef = useRef<Rec | null>(null)
  const [listening, setListening] = useState(false)
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  const supported = !!Ctor
  const start = useCallback(() => {
    if (!Ctor) return
    const r = new Ctor()
    r.lang = SPEECH_LANG[lang] ?? 'en-IN'
    r.interimResults = false
    r.continuous = false
    r.onresult = (e) => {
      const text = Array.from(e.results).map((x) => x[0].transcript).join(' ')
      if (text.trim()) onText(text.trim())
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    recRef.current = r
    setListening(true)
    r.start()
  }, [Ctor, lang, onText])
  const stop = useCallback(() => recRef.current?.stop(), [])
  useEffect(() => () => { recRef.current?.stop() }, [])
  return { supported, listening, start, stop }
}

export function speak(text: string, lang: string) {
  if (!('speechSynthesis' in window)) return
  const u = new SpeechSynthesisUtterance(text.replace(/\*\*/g, ''))
  u.lang = SPEECH_LANG[lang] ?? 'en-IN'
  u.rate = 1.02
  const v = window.speechSynthesis.getVoices().find((x) => x.lang === u.lang)
  if (v) u.voice = v
  window.speechSynthesis.cancel()
  window.speechSynthesis.speak(u)
}
