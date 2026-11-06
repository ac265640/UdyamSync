import { Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useBrand } from '../brand'
import { Logo } from './ui'

const LINKS = [
  { to: '/start', label: 'Owner app' },
  { to: '/whatsapp', label: 'WhatsApp' },
  { to: '/partner', label: 'Partner Co-Pilot' },
  { to: '/insights', label: 'Insights' },
  { to: '/kyc-inspector', label: 'KYC Inspector' },
  { to: '/privacy', label: 'Privacy' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { brand, setBrand, name } = useBrand()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5">
          <NavLink to="/" className="shrink-0">
            <Logo />
          </NavLink>
          <nav className="hidden flex-1 items-center gap-1 lg:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium ${isActive ? 'bg-brand-soft text-brand' : 'text-slate-600 hover:bg-slate-100'}`}>
                {l.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center rounded-lg bg-slate-100 p-0.5 text-xs font-semibold sm:flex" title="Case universe vs production theme">
              <button onClick={() => setBrand('accel')} className={`rounded-md px-2 py-1 ${brand === 'accel' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Accel (case)</button>
              <button onClick={() => setBrand('airtel')} className={`rounded-md px-2 py-1 ${brand === 'airtel' ? 'bg-white shadow text-slate-900' : 'text-slate-500'}`}>Airtel theme</button>
            </div>
            <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
              {open ? <X /> : <Menu />}
            </button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-slate-100 px-4 py-2 lg:hidden">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                {l.label}
              </NavLink>
            ))}
            <button onClick={() => setBrand(brand === 'accel' ? 'airtel' : 'accel')} className="rounded-lg px-3 py-2 text-left text-sm text-slate-500">
              Theme: {name} (tap to switch)
            </button>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        {name} UdyamSync · Built for Airtel SYNC 2026 · YTL Hackathon · Enterprise Track A · All data synthetic
      </footer>
    </div>
  )
}
