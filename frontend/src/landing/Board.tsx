import { useEffect, useRef, useState } from 'react'
import { inr, type Replay } from '../api'
import SplitFlapText from '../bits/SplitFlapText'
import { prefersReducedMotion } from '../motion/SmoothScroll'

/** Station departure board: before → after, flipped once when it comes into view. */
export default function Board({ r }: { r: Replay | null }) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!ref.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShow(true), { threshold: 0.4 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [])
  const rows = r
    ? [
        ['Lead to activation', `${r.before.conversion_pct}%`, `${r.after.conversion_pct}%`],
        ['Days to go live', `${r.before.days_to_activate}`, `${r.after.days_to_activate}`],
        ['Cost per activation', inr(r.before.cac), inr(r.after.cac)],
        ['Six-month churn', `${r.before.churn_6m_pct}%`, `${r.after.churn_6m_pct}%`],
        ['Rule-breaking sales', '56', '0'],
      ]
    : []
  const still = prefersReducedMotion()
  return (
    <div ref={ref} className="rounded-[18px] bg-[#1b1a17] p-5 text-[#f6f1e7] shadow-[0_30px_60px_-30px_rgb(27_26_23/.6)] sm:p-7">
      <div className="mb-4 grid grid-cols-[1fr_7rem_11rem] gap-x-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#b9ae98]">
        <span>Apr–Jun 2026, 5,000 leads</span><span className="text-right">Today</span><span className="text-right">UdyamSync</span>
      </div>
      <div className="divide-y divide-white/10">
        {rows.map(([label, before, after], i) => (
          <div key={label} className="grid grid-cols-[1fr_7rem_11rem] items-center gap-x-4 py-3">
            <span className="text-[15px] text-[#e9e1d0]">{label}</span>
            <span className="num text-right text-[15px] text-[#b9ae98] line-through decoration-[#b4232a]/70">{before}</span>
            <span className="flex justify-end overflow-hidden">
              {show && !still ? (
                <SplitFlapText words={[after.padStart(6, ' ')]} loop={false} intro stagger={0.045 + i * 0.006} flipsPerChar={6} fontSize={23} tileColor="#2a2722" textColor="#f2b53a" gap={3} tileRadius={4} align="right" charset=" 0123456789.%₹," />
              ) : (
                <span className="num font-mono text-[23px] font-bold text-[#f2b53a]">{after}</span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
