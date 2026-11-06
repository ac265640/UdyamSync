import { BarChart3, FileSearch, Play, Stethoscope, Store, Users, UtensilsCrossed, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'

// One-tap entry points into prepared states, for live demos. These are our own presets.
const PRESETS = [
  { icon: Stethoscope, label: 'Pune clinic · Hindi', to: '/start?new=1&lang=hi&say=' + encodeURIComponent('मेरी पुणे में डेंटल क्लिनिक है, 8 लोग काम करते हैं, 1 क्लिनिक, घर का wifi 1500 रुपये महीना') },
  { icon: Play, label: 'GSTIN auto-fill', to: '/start?new=1&lang=en&say=32TTNXB7384T1ZW' },
  { icon: UtensilsCrossed, label: 'Restaurant chain · 3 sites', to: '/start?new=1&lang=en&say=' + encodeURIComponent('3 restaurants in Pune, 25 staff, need CCTV and UPI billing that never stops') },
  { icon: Store, label: 'Kirana on WhatsApp · Marathi', to: '/whatsapp?lang=mr&say=' + encodeURIComponent('नाशिक मध्ये किराणा दुकान, फक्त मी, UPI बिलिंग') },
  { icon: FileSearch, label: 'KYC trap · K05', to: '/kyc-inspector?k=K05' },
  { icon: BarChart3, label: 'Replay the quarter', to: '/insights' },
  { icon: Users, label: 'Partner Co-Pilot', to: '/partner' },
]

export function useDemoMode(): [boolean, (v: boolean) => void] {
  const [on, setOn] = useState(() => localStorage.getItem('udyamsync.demo') === '1')
  const set = (v: boolean) => { localStorage.setItem('udyamsync.demo', v ? '1' : '0'); setOn(v); window.dispatchEvent(new Event('udyamsync-demo')) }
  useEffect(() => {
    const f = () => setOn(localStorage.getItem('udyamsync.demo') === '1')
    window.addEventListener('udyamsync-demo', f)
    return () => window.removeEventListener('udyamsync-demo', f)
  }, [])
  return [on, set]
}

export default function DemoBar() {
  const [on, setOn] = useDemoMode()
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  useEffect(() => { if (params.get('demo') === '1') setOn(true) }, [params]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!on || pathname.startsWith('/sign/')) return null
  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-3 print:hidden" data-lenis-prevent>
      <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-full bg-ink/95 p-1.5 text-paper shadow-[0_12px_32px_-12px_rgb(27_26_23/.6)] backdrop-blur">
        <span className="shrink-0 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#b9ae98]">Demo</span>
        {PRESETS.map((p) => (
          <Link key={p.label} to={p.to} reloadDocument={p.to.startsWith('/start')} className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] transition-colors hover:bg-white/10">
            <p.icon size={14} className="text-[#f2b53a]" />{p.label}
          </Link>
        ))}
        <button onClick={() => setOn(false)} className="ml-1 shrink-0 rounded-full p-1.5 hover:bg-white/10" aria-label="Hide demo shortcuts"><X size={14} /></button>
      </div>
    </div>
  )
}

export function DemoToggle() {
  const [on, setOn] = useDemoMode()
  return <button onClick={() => setOn(!on)} className="link">{on ? 'Hide' : 'Show'} demo shortcuts</button>
}

