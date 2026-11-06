import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useRef, useState } from 'react'
import { prefersReducedMotion } from '../motion/SmoothScroll'
import Phone, { AppBar } from './Phone'
import { ChatScreen, LedgerScreen, TrackScreen, VerifyScreen } from './Screens'

gsap.registerPlugin(ScrollTrigger)

const STEPS = [
  { title: 'Three questions, in their language', body: 'The advisor asks what the business does, how big it is and what hurts. A GSTIN answers half of it from the registry. Hindi, Marathi and English are built in; seven more languages run through the optional AI.', screen: <ChatScreen /> },
  { title: 'One line on the bill', body: 'Essential, Recommended or Pro, priced from the catalogue, never by the AI. Switch add-ons on and off; anything a product needs is added for you, and anything you can\'t buy yet says why.', screen: <LedgerScreen /> },
  { title: 'Verified while they wait', body: 'Photograph four documents. They are read on our own server, checked against the GST and Udyam registries, and every problem comes back as a fix in plain words, not a rejection.', screen: <VerifyScreen /> },
  { title: 'A tracker instead of a phone call', body: 'Five stages with dates, the technician\'s name and slot, and a WhatsApp message at every step. Customers who chased us once churned 5.9%; five times, 27.9%.', screen: <TrackScreen /> },
]

export default function Chapters() {
  const root = useRef<HTMLElement>(null)
  const rail = useRef<HTMLDivElement>(null)
  const [step, setStep] = useState(0)
  const [live, setLive] = useState(false)

  useEffect(() => {
    const desk = window.matchMedia('(min-width: 1024px)').matches
    if (!desk || prefersReducedMotion() || !root.current) return
    setLive(true)
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => setStep(Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length * 0.999))),
      })
      gsap.fromTo(rail.current, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom bottom', scrub: 0.4 } })
    }, root)
    return () => ctx.revert()
  }, [])

  if (!live) {
    // Phones, reduced motion, no script: the finished still — every step with its screen.
    return (
      <section ref={root} className="mx-auto max-w-[1240px] px-5 py-24 sm:px-8">
        <h2 className="display max-w-3xl text-[clamp(2.2rem,4.5vw,3.6rem)]">From hello to installed, in one sitting</h2>
        <div className="mt-12 grid gap-14 md:grid-cols-2">
          {STEPS.map((s) => (
            <div key={s.title}>
              <h3 className="display text-2xl">{s.title}</h3>
              <p className="lede mt-2 !text-base">{s.body}</p>
              <div className="mt-6 origin-top scale-[.9]"><Phone><AppBar />{s.screen}</Phone></div>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <section ref={root} className="relative" style={{ height: `${STEPS.length * 75 + 25}vh` }}>
      <div className="sticky top-0 flex h-screen items-center">
        <div className="mx-auto grid w-full max-w-[1240px] grid-cols-[1fr_auto] items-center gap-16 px-8">
          <div>
            <h2 className="display max-w-2xl text-[clamp(2.4rem,4.2vw,3.8rem)]">From hello to installed, in one sitting</h2>
            <div className="relative mt-10 pl-8">
              <div className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px bg-line" />
              <div ref={rail} className="absolute left-0 top-1 h-[calc(100%-0.5rem)] w-px origin-top bg-brand" />
              <ol className="space-y-7">
                {STEPS.map((s, i) => (
                  <li key={s.title} className="relative">
                    <span className={`absolute -left-[37px] top-[7px] h-[11px] w-[11px] rounded-full border-2 transition-colors duration-300 ${i <= step ? 'border-brand bg-brand' : 'border-line-strong bg-paper'}`} />
                    <h3 className={`display text-[1.6rem] transition-colors duration-300 ${i === step ? 'text-ink' : 'text-muted'}`}>{s.title}</h3>
                    <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(.2,.8,.2,1)]" style={{ gridTemplateRows: i === step ? '1fr' : '0fr' }}>
                      <p className="lede overflow-hidden !text-base">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          <Phone label="The UdyamSync owner app">
            <AppBar />
            {STEPS.map((s, i) => (
              <div key={s.title} className="absolute inset-x-0 bottom-0 top-[76px] bg-surface transition-[clip-path] duration-700 ease-[cubic-bezier(.65,0,.35,1)]" style={{ clipPath: i <= step ? 'inset(0 0 0 0)' : 'inset(100% 0 0 0)', zIndex: i }}>
                {i === 2 ? <VerifyScreen stamped={step >= 2} /> : s.screen}
              </div>
            ))}
          </Phone>
        </div>
      </div>
    </section>
  )
}
