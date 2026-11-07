import { useEffect, useRef, useState } from 'react'
import type { Check } from '../api'
import { prefersReducedMotion } from '../motion/SmoothScroll'

// Which extracted field each check is about, so its verdict can be drawn on the page where the OCR found it.
const FIELD_FOR_CHECK: Record<string, string[]> = {
  'gstin.registry': ['gstin'], 'gstin.format': ['gstin'], 'gstin.status': ['gstin'], 'gstin.read': ['gstin__label'],
  'gstin.legal_name': ['legal_name'], 'gstin.trade_name': ['trade_name'], 'gstin.address': ['address'],
  'udyam.number': ['udyam_number', 'udyam_number__label'], 'udyam.registry': ['udyam_number'], 'udyam.name': ['enterprise_name'], 'udyam.state': ['state'],
  'address.date': ['bill_date'], 'address.name': ['billed_to'], 'address.match': ['address'],
  'signatory.name': ['name__label'], 'signatory.expiry': ['valid_till'], 'signatory.business': ['for_business'], 'signatory.authority': ['designation', 'name'],
}
const SHORT: Record<string, string> = {
  'gstin.registry': 'In GST registry', 'gstin.format': 'Checksum fails', 'gstin.status': 'GSTIN status', 'gstin.legal_name': 'Name vs registry',
  'gstin.trade_name': 'Trade name', 'gstin.address': 'Address', 'udyam.number': 'Udyam number', 'udyam.registry': 'In Udyam registry',
  'udyam.name': 'Same business', 'address.date': 'Bill age', 'address.name': 'Billed to', 'address.match': 'Address match',
  'signatory.expiry': 'ID validity', 'signatory.authority': 'Signing authority', 'signatory.business': 'For business', 'signatory.name': 'Name',
}
const COLOR = { pass: '#1e7b4e', warn: '#b7791f', fail: '#b4232a' } as const

type Box = { key: string; rect: number[]; status: 'pass' | 'warn' | 'fail'; label: string; message: string }

/** A document being read: a scan line passes down the page and each finding lights up where it was read. */
export default function DocScanner({ src, label, boxes, checks, delay = 0, missing = false }: { src: string | null; label: string; boxes: Record<string, number[]>; checks: Check[]; delay?: number; missing?: boolean }) {
  const [progress, setProgress] = useState(prefersReducedMotion() ? 1 : 0)
  const [loaded, setLoaded] = useState(false)
  const [crop, setCrop] = useState(1) // portrait A4 pages: everything printed sits in the top ~42%
  const raf = useRef(0)
  const quality = checks.find((c) => c.id.startsWith('quality.'))

  useEffect(() => {
    if (!loaded || prefersReducedMotion()) return
    setProgress(0)
    const start = performance.now() + delay
    const run = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - start) / 1700))
      setProgress(p)
      if (p < 1) raf.current = requestAnimationFrame(run)
    }
    raf.current = requestAnimationFrame(run)
    return () => cancelAnimationFrame(raf.current)
  }, [loaded, delay, src])

  const drawn: Box[] = []
  for (const c of checks) {
    const keys = FIELD_FOR_CHECK[c.id] ?? []
    const key = keys.find((k) => boxes[k])
    if (!key || drawn.some((d) => d.key === key && d.status === 'fail')) continue
    const existing = drawn.findIndex((d) => d.key === key)
    const box: Box = { key, rect: boxes[key], status: c.status, label: SHORT[c.id] ?? c.label, message: c.message }
    if (existing >= 0) { if (c.status !== 'pass') drawn[existing] = box } else drawn.push(box)
  }

  return (
    <figure className="m-0">
      <figcaption className="mb-1.5 flex items-center justify-between text-xs font-semibold">{label}
        {quality && progress >= 1 && <span className="pill" style={{ background: quality.status === 'fail' ? '#fbe9e9' : '#fdf3e2', color: COLOR[quality.status] }}>{quality.status === 'fail' ? 'Unreadable' : 'Straightened'}</span>}
      </figcaption>
      {missing || !src ? (
        <div className="flex aspect-[1240/737] items-center justify-center rounded-xl border-2 border-dashed border-[#e3b6b6] bg-[#fbf1f1] text-center text-xs font-semibold text-khata">Not provided</div>
      ) : (
        <div className="relative overflow-hidden rounded-xl bg-white shadow-[inset_0_0_0_1px_var(--color-line)]" style={{ aspectRatio: crop < 1 ? `1240 / ${Math.round(1754 * crop)}` : undefined }}>
          <img src={src} alt={label} onLoad={(e) => { const im = e.currentTarget; setCrop(im.naturalHeight / im.naturalWidth > 1.2 ? 0.42 : 1); setLoaded(true) }} className="block h-auto w-full" style={{ filter: progress < 1 ? `saturate(${0.4 + progress * 0.6})` : undefined }} />
          {progress > 0 && progress < 1 && (
            <div className="pointer-events-none absolute inset-x-0 h-10 -translate-y-full" style={{ top: `${progress * 100}%`, background: 'linear-gradient(to bottom, transparent, color-mix(in oklab, var(--brand) 22%, transparent))', borderBottom: '2px solid var(--brand)' }} />
          )}
          {drawn.map((b) => {
            const [x0, y0, x1, y1] = b.rect
            const shown = progress >= y1 / crop || progress >= 1
            return (
              <div key={b.key} title={b.message} className="absolute transition-[opacity,transform] duration-300 ease-out"
                style={{ left: `${x0 * 100 - 0.8}%`, top: `${(y0 / crop) * 100 - 0.8}%`, width: `${(x1 - x0) * 100 + 1.6}%`, height: `${((y1 - y0) / crop) * 100 + 1.6}%`, opacity: shown ? 1 : 0, transform: shown ? 'scale(1)' : 'scale(1.08)',
                  border: `2px solid ${COLOR[b.status]}`, borderRadius: 4, background: `${COLOR[b.status]}14` }}>
                <span className="absolute -top-[1.35rem] left-0 whitespace-nowrap rounded px-1.5 py-0.5 text-[9.5px] font-semibold text-white shadow-sm" style={{ background: COLOR[b.status] }}>
                  {b.status === 'pass' ? '✓' : b.status === 'warn' ? '!' : '✕'} {b.label}
                </span>
              </div>
            )
          })}
          {quality?.status === 'fail' && progress >= 1 && <div className="absolute inset-0 rounded-xl border-[3px] border-khata bg-[#b4232a10]" />}
        </div>
      )}
    </figure>
  )
}
