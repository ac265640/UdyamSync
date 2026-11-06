import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'
import type { ReactNode } from 'react'

/** Renders **bold** and line breaks from advisor text (no HTML injection). */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <span className={className}>
      {text.split('\n').map((line, i) => (
        <span key={i}>
          {i > 0 && <br />}
          {line.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>,
          )}
        </span>
      ))}
    </span>
  )
}

export function StatusIcon({ status, size = 18 }: { status: string; size?: number }) {
  if (status === 'pass') return <CheckCircle2 size={size} className="shrink-0 text-emerald-600" />
  if (status === 'warn') return <AlertTriangle size={size} className="shrink-0 text-amber-500" />
  if (status === 'fail') return <XCircle size={size} className="shrink-0 text-rose-600" />
  return <Info size={size} className="shrink-0 text-slate-400" />
}

export function Verdict({ verdict, label }: { verdict: string; label: string }) {
  const cls =
    verdict === 'verified' ? 'bg-emerald-50 text-emerald-800 ring-emerald-200' : verdict === 'verified_with_notes' ? 'bg-amber-50 text-amber-800 ring-amber-200' : 'bg-rose-50 text-rose-800 ring-rose-200'
  return <span className={`pill ring-1 ${cls}`}>{label}</span>
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' }) {
  return (
    <div className="card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-rose-600' : 'text-slate-900'}`}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  )
}

export function Section({ title, subtitle, right, children, className = '' }: { title: ReactNode; subtitle?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-[var(--brand)]" />
      {label}
    </div>
  )
}

export function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null
  return <div className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 ring-1 ring-rose-200">{error}</div>
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg viewBox="0 0 64 64" className="h-8 w-8">
        <rect width="64" height="64" rx="14" fill="var(--brand)" />
        <path d="M16 40c6-14 14-20 32-22-8 6-12 12-14 22" fill="none" stroke="var(--brand-2)" strokeWidth="6" strokeLinecap="round" />
        <circle cx="20" cy="44" r="5" fill="#fff" />
      </svg>
      {!compact && (
        <span className="leading-tight">
          <span className="block text-sm font-bold text-slate-900">UdyamSync</span>
          <span className="block text-[10px] font-medium text-slate-500">Ek Baar Mein Vyapar Digital</span>
        </span>
      )}
    </span>
  )
}
