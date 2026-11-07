import { ArrowRight, ArrowUpRight, FileLock2, Fingerprint, MessageCircle, Phone as PhoneIcon, ScrollText, Timer } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, inr, type InboxLead, type Replay } from '../api'
import ScrollReveal from '../bits/ScrollReveal'
import Board from '../landing/Board'
import Chapters from '../landing/Chapters'
import HeroPhone from '../landing/HeroPhone'

const LANGS: [string, string][] = [['hi', 'हिन्दी'], ['en', 'English'], ['mr', 'मराठी'], ['gu', 'ગુજરાતી'], ['ta', 'தமிழ்'], ['te', 'తెలుగు'], ['kn', 'ಕನ್ನಡ'], ['bn', 'বাংলা'], ['ml', 'മലയാളം'], ['pa', 'ਪੰਜਾਬੀ']]

const PRIVACY: [typeof Timer, string, string][] = [
  [Fingerprint, 'No Aadhaar number, ever', 'DigiLocker and e-sign return a yes and a reference. The number never reaches us.'],
  [FileLock2, 'Read on our own server', "Document photos are read in-house and encrypted. No third-party AI sees them."],
  [Timer, 'Deleted on a timer', 'Images are purged 30 days after verification. Masked fields stay for the contract.'],
  [ScrollText, 'Consent you can audit', 'Every grant and withdrawal is hash-chained to the exact notice you read.'],
]

export default function Home() {
  const [r, setR] = useState<Replay | null>(null)
  const [leads, setLeads] = useState<InboxLead[]>([])
  useEffect(() => {
    api.replay({}).then(setR).catch(() => {})
    api.inbox({ limit: 4, segment: 'prof' }).then((x) => setLeads(x.historical)).catch(() => {})
  }, [])

  return (
    <div>
      {/* hero */}
      <section className="mx-auto grid min-h-[calc(100svh-4rem)] max-w-[1240px] items-center gap-12 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:py-10">
        <div>
          <h1 className="display text-[clamp(2.9rem,6.4vw,5.6rem)] font-medium">
            Get your business online <em className="font-normal italic text-brand">in one sitting.</em>
          </h1>
          <p className="lede mt-6">
            Internet, business mobiles, WhatsApp, CCTV and cloud for India's small businesses. A three-question advisor in your language picks the bundle, prices it on one line, verifies you in two minutes and tracks the install to the day.
          </p>
          <p className="mt-5 text-[0.95rem] font-medium text-ink">Ordered the same day, not 17.6 days and three follow-up calls later.</p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link to="/start?new=1&lang=hi" className="btn-primary !px-5 !py-3.5 text-base" lang="hi">हिन्दी में शुरू करें <ArrowRight size={17} /></Link>
            <Link to="/start?new=1&lang=en" className="btn-ghost !px-5 !py-3.5 text-base">Start in English</Link>
          </div>
          <Link to="/partner" className="link mt-6 inline-flex items-center gap-1 text-sm text-muted">Are you an Accel partner? Open the Co-Pilot <ArrowUpRight size={14} /></Link>
        </div>
        <div className="lg:justify-self-end lg:pr-6"><HeroPhone /></div>
      </section>

      {/* statement — scroll moment 1 */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-[1240px] px-5 py-28 sm:px-8 lg:py-40">
          <ScrollReveal baseOpacity={0.14} enableBlur={false} baseRotation={0} splitBy="words" mode="scrub" containerClassName="max-w-5xl" textClassName="display !text-[clamp(1.9rem,4vw,3.4rem)] !leading-[1.12] !font-normal">
            Today a clinic owner waits 17.6 days, chases us three times and costs ₹15,053 to win. Ninety-three of every hundred interested businesses give up before they are switched on.
          </ScrollReveal>
          <p className="mt-10 text-sm text-muted">Source: the case's 5,000 leads, April to June 2026.</p>
        </div>
      </section>

      {/* pinned chapters — scroll moment 2 */}
      <Chapters />

      {/* proof — the station board is the page's one count */}
      <section className="border-t border-line bg-surface">
        <div className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.25fr] lg:py-32">
          <div>
            <h2 className="display text-[clamp(2.2rem,4vw,3.4rem)]">The same quarter, replayed</h2>
            <p className="lede mt-5">We ran all 5,000 real leads back through UdyamSync. Each drop reason is won back only by the feature that removes it, at deliberately cautious rates. Every assumption is a slider you can move.</p>
            {r && <p className="mt-4 text-[0.95rem] text-ink">That is <b className="num">+{r.impact.extra_activations_per_quarter.toLocaleString('en-IN')}</b> businesses switched on every quarter, about <b className="num">{inr(r.impact.extra_annual_recurring_revenue_inr / 1e7)} crore</b> of new annual recurring revenue after one year, net of churn.</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/insights" className="btn-ink">Move the assumptions <ArrowRight size={16} /></Link>
              <Link to="/kyc-inspector" className="btn-ghost">Watch KYC catch the 12 specimens</Link>
            </div>
          </div>
          <Board r={r} />
        </div>
      </section>

      {/* partners */}
      <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1.2fr_1fr] lg:py-32">
        <div className="order-2 lg:order-1">
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3 text-sm">
              <span className="font-semibold">Win-back queue · Professional offices</span>
              <span className="text-muted">ranked by score</span>
            </div>
            <ul className="divide-y divide-line">
              {(leads.length ? leads : [null, null, null, null]).map((l, i) => (
                <li key={l?.id ?? i} className="flex items-center gap-4 px-5 py-3.5">
                  {l ? (
                    <>
                      <span className="display num w-9 text-2xl">{l.score}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{l.business} <span className="font-normal text-muted">· {l.city}</span></div>
                        <div className="truncate text-xs text-muted">Dropped: {l.reason}</div>
                      </div>
                      <span className="flex items-center gap-1.5 rounded-full bg-paper px-2.5 py-1 text-xs font-medium">
                        {l.next_action.channel === 'whatsapp' ? <MessageCircle size={13} className="text-leaf" /> : <PhoneIcon size={13} />}
                        {l.next_action.channel === 'whatsapp' ? 'Send quote' : 'Call'}
                      </span>
                    </>
                  ) : <div className="h-9 w-full animate-pulse rounded bg-line/40" />}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="display text-[clamp(2.2rem,4vw,3.4rem)]">Partners stay in the deal</h2>
          <p className="lede mt-5">Leads the advisor can't close go to the local partner, ranked by a model trained on last quarter, each with the chat summary and the next best action. Partners can run the same flow on a tablet at the counter, and their commission is credited automatically.</p>
          <Link to="/partner" className="btn-ghost mt-8">Open the Partner Co-Pilot <ArrowRight size={16} /></Link>
        </div>
      </section>

      {/* privacy */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-[1240px] gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.1fr] lg:py-32">
          <div>
            <h2 className="display text-[clamp(2.2rem,4vw,3.4rem)]">KYC without handing over your life</h2>
            <p className="lede mt-5">Built for the DPDP Act from the first screen: consent per purpose, nothing collected that a step does not need, and a page where the owner sees, downloads or erases everything we hold.</p>
            <Link to="/privacy" className="link mt-6 inline-flex items-center gap-1 text-sm font-medium">Read the one-page privacy note <ArrowUpRight size={14} /></Link>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-[14px] bg-line shadow-[inset_0_0_0_1px_var(--color-line)] sm:grid-cols-2">
            {PRIVACY.map(([Icon, t, d]) => (
              <li key={t} className="bg-surface p-6">
                <Icon size={20} className="text-brand" />
                <div className="mt-3 font-semibold">{t}</div>
                <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* close */}
      <section className="mx-auto max-w-[1240px] px-5 py-28 text-center sm:px-8 lg:py-36">
        <h2 className="display mx-auto max-w-3xl text-[clamp(2.4rem,5vw,4.4rem)]">Start in the language you think in</h2>
        <p className="lede mx-auto mt-5">Ten languages. Type, tap or speak. About ten minutes from hello to a verified order.</p>
        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap justify-center gap-2.5">
          {LANGS.map(([k, v]) => (
            <Link key={k} to={`/start?new=1&lang=${k}`} lang={k} className="chip bg-surface text-[1rem] shadow-[inset_0_0_0_1px_var(--color-line)] hover:bg-brand hover:text-white hover:shadow-none">{v}</Link>
          ))}
        </div>
      </section>
    </div>
  )
}
