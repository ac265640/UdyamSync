import type { ReactNode } from 'react'

/** A phone the product UI lives in. The screen is real HTML, never a picture. */
export default function Phone({ children, className = '', label }: { children: ReactNode; className?: string; label?: string }) {
  return (
    <div className={`relative mx-auto w-[300px] shrink-0 rounded-[46px] bg-[#1b1a17] p-[10px] shadow-[0_2px_4px_rgb(27_26_23/.2),0_40px_80px_-30px_rgb(27_26_23/.55)] ${className}`} aria-label={label} role={label ? 'img' : undefined}>
      <div className="absolute left-1/2 top-[18px] z-20 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-[#1b1a17]" />
      <div className="relative h-[600px] overflow-hidden rounded-[37px] bg-surface">{children}</div>
    </div>
  )
}

export function AppBar({ title = 'Vyapar Saathi', sub = 'Accel Business · online' }: { title?: string; sub?: string }) {
  return (
    <div className="flex items-center gap-2.5 bg-brand px-4 pb-3 pt-11 text-white">
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-xs font-bold">VS</span>
      <div className="leading-tight">
        <div className="text-[13px] font-semibold">{title}</div>
        <div className="text-[10.5px] text-white/75">{sub}</div>
      </div>
    </div>
  )
}
