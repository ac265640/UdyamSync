import { ArrowRight, Menu, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useBrand } from '../brand'
import { Logo } from './ui'

const LINKS = [
  { to: '/start', label: 'Owner app' },
  { to: '/whatsapp', label: 'WhatsApp' },
  { to: '/partner', label: 'Partners' },
  { to: '/insights', label: 'Insights' },
  { to: '/kyc-inspector', label: 'KYC Inspector' },
  { to: '/privacy', label: 'Privacy' },
]

export default function Layout({ children }: { children: ReactNode }) {
  const { brand, setBrand, name } = useBrand()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-8 px-5 sm:px-8">
          <Link to="/" className="shrink-0" aria-label="UdyamSync home"><Logo /></Link>
          <nav className="hidden flex-1 items-center gap-7 text-[0.9rem] font-medium lg:flex">
            {LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className="navlink whitespace-nowrap">{l.label}</NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center rounded-full p-0.5 text-xs font-semibold shadow-[inset_0_0_0_1px_var(--color-line)] sm:flex" role="group" aria-label="Theme">
              {(['accel', 'airtel'] as const).map((b) => (
                <button key={b} onClick={() => setBrand(b)} aria-pressed={brand === b} className={`rounded-full px-3 py-1.5 transition-colors ${brand === b ? 'bg-ink text-paper' : 'text-muted hover:text-ink'}`}>
                  {b === 'accel' ? 'Accel · case' : 'Airtel'}
                </button>
              ))}
            </div>
            {pathname !== '/start' && <Link to="/start?new=1&lang=hi" className="btn-primary hidden !py-2 md:inline-flex">Start <ArrowRight size={15} /></Link>}
            <button className="rounded-lg p-2 lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" aria-expanded={open}>{open ? <X /> : <Menu />}</button>
          </div>
        </div>
        {open && (
          <nav className="grid gap-1 border-t border-line bg-paper px-5 py-3 lg:hidden">
            {LINKS.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-base font-medium hover:bg-surface">{l.label}</NavLink>)}
            <button onClick={() => setBrand(brand === 'accel' ? 'airtel' : 'accel')} className="rounded-lg px-3 py-2.5 text-left text-sm text-muted">Theme: {name}</button>
          </nav>
        )}
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-4 px-5 py-8 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3"><Logo compact /><span>{name} UdyamSync — built for Airtel SYNC 2026, YTL Hackathon, Enterprise Track A.</span></div>
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <Link className="link" to="/privacy">Privacy note</Link>
            <a className="link" href="https://github.com/ac265640/UdyamSync" target="_blank" rel="noreferrer">Source</a>
            <span>All businesses, people and figures are synthetic. Text animation components adapted from React Bits.</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
