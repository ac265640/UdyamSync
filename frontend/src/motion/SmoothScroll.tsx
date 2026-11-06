import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

gsap.registerPlugin(ScrollTrigger)

export const prefersReducedMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
export const isFinePointer = () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches

const LenisCtx = createContext<Lenis | null>(null)
export const useLenis = () => useContext(LenisCtx)

/** Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger moments stay in sync.
 *  Off under reduced motion and on touch screens (native momentum is better there). */
export default function SmoothScroll({ children }: { children: ReactNode }) {
  const ref = useRef<Lenis | null>(null)
  const { pathname } = useLocation()

  useEffect(() => {
    if (prefersReducedMotion() || !isFinePointer()) return
    const lenis = new Lenis({ duration: 1.05, easing: (t) => 1 - Math.pow(1 - t, 3.2), wheelMultiplier: 0.95, prevent: (node) => !!node.closest?.('[data-lenis-prevent]') })
    ref.current = lenis
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      lenis.destroy()
      ref.current = null
    }
  }, [])

  // New page starts at the top; moments re-measure.
  useEffect(() => {
    if (ref.current) ref.current.scrollTo(0, { immediate: true })
    else window.scrollTo(0, 0)
    requestAnimationFrame(() => ScrollTrigger.refresh())
  }, [pathname])

  return <LenisCtx.Provider value={ref.current}>{children}</LenisCtx.Provider>
}
