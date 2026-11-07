// Drives the real running app (web :5173, api :8000) and saves screenshots for the deck and README.
// Usage: node capture.mjs [outDir]
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { homedir } from 'node:os'

const OUT = process.argv[2] ?? '../../docs/screenshots'
const WEB = 'http://localhost:5173'
const API = 'http://localhost:8000'
const CHROME = process.env.CHROME_PATH
mkdirSync(OUT, { recursive: true })

const j = async (path, body, method = body ? 'POST' : 'GET') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`)
  return r.json()
}
const say = (sid, text) => j(`/api/advisor/sessions/${sid}/messages`, { text })
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

// ---------- prepare real states through the API
async function clinicHindi() {
  const s = (await j('/api/advisor/sessions', { lang: 'hi' })).session_id
  await say(s, 'मेरी पुणे में डेंटल क्लिनिक है, 8 लोग काम करते हैं, 1 क्लिनिक, घर का wifi 1500 रुपये महीना')
  await say(s, 'need:backup')
  await say(s, 'need:none')
  return s
}
async function chainWithSites() {
  const s = (await j('/api/advisor/sessions', { lang: 'en' })).session_id
  await say(s, '3 restaurants in Pune, 25 staff, need CCTV and UPI billing that never stops')
  await j(`/api/advisor/sessions/${s}/profile`, { site_list: [{ name: 'Kothrud', pincode: '411038' }, { name: 'Viman Nagar', pincode: '411014' }, { name: 'Camp', pincode: '411001' }] }, 'PATCH')
  return s
}
async function verifiedWithOrder() {
  const s = (await j('/api/advisor/sessions', { lang: 'en' })).session_id
  await say(s, '27XUIXG0767D1ZP')
  await say(s, '12 workers, 1 workshop')
  await say(s, 'need:security')
  await say(s, 'need:none')
  await j(`/api/kyc/${s}/consent`, { purposes: { kyc_verification: true, service_updates: true } })
  await j(`/api/kyc/${s}/use-sample/K03`, {})
  const o = await j('/api/orders', { session_id: s })
  await j(`/api/orders/${o.id}/advance`, {})
  return { s, order: o.id }
}
async function failingKyc() {
  const s = (await j('/api/advisor/sessions', { lang: 'en' })).session_id
  await say(s, 'bakery in Ludhiana, 6 people, 1 shop')
  await say(s, 'need:none')
  await j(`/api/kyc/${s}/consent`, { purposes: { kyc_verification: true } })
  await j(`/api/kyc/${s}/use-sample/K11`, {})
  return s
}
async function partnerLeads() {
  // a few live hand-offs so the Co-Pilot inbox shows today's leads too
  for (const [txt, end] of [['dental clinic in Chennai, 10 staff, 1 clinic', 'too expensive'], ['law office in Hyderabad, 6 people', 'please call me'], ['salon in Kochi, 3 people, 1 salon', 'I will decide later']]) {
    const s = (await j('/api/advisor/sessions', { lang: 'en', channel: 'partner', partner_id: 'P-PUN-007' })).session_id
    await say(s, txt)
    await say(s, 'need:none')
    await say(s, end)
  }
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true })
async function shot(name, url, { w = 1440, h = 900, scroll = 0, waitMs = 2500, before, full = false, mobile = false, clickText, locate, still = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, reducedMotion: still ? 'reduce' : 'no-preference' })
  await ctx.addInitScript(() => localStorage.setItem('udyamsync.demo', '0'))
  if (before) await ctx.addInitScript(before)
  const page = await ctx.newPage()
  await page.goto(WEB + url, { waitUntil: 'networkidle' })
  if (clickText) { await page.getByText(clickText, { exact: false }).first().click(); await wait(800) }
  if (scroll) { await page.mouse.wheel(0, scroll); await wait(1200) }
  if (locate) { await page.getByText(locate).first().evaluate((el) => el.closest('section').scrollIntoView({ block: 'start' })); await wait(800) }
  await wait(waitMs)
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full })
  console.log('saved', name)
  await ctx.close()
}

const clinic = await clinicHindi()
const chain = await chainWithSites()
const { s: verified, order } = await verifiedWithOrder()
const failing = await failingKyc()
await partnerLeads()

await shot('01-landing-hero', '/', { waitMs: 2500 })
await shot('02-advisor-hindi', `/start?session=${clinic}&step=advisor`, { waitMs: 2000 })
await shot('03-onebill-sites', `/start?session=${chain}&step=quote`, { waitMs: 2000 })
await shot('04-kyc-verified', `/start?session=${verified}&step=kyc`, { waitMs: 2500 })
await shot('05-kyc-fix', `/start?session=${failing}&step=kyc`, { waitMs: 2500 })
await shot('06-tracker', `/track/${order}`, { w: 520, h: 1000, waitMs: 1500 })
await shot('07-whatsapp-marathi', `/whatsapp?lang=mr&say=${encodeURIComponent('नाशिक मध्ये किराणा दुकान, फक्त मी, UPI बिलिंग')}`, { waitMs: 4500 })
await shot('08-kyc-inspector-k07', '/kyc-inspector?k=K07', { waitMs: 9000 })
await shot('09-partner-copilot', '/partner', { waitMs: 2500, clickText: 'Law office' })
await shot('10-insights-replay', '/insights', { waitMs: 3500 })
await shot('11-insights-compliance', '/insights', { waitMs: 3500, scroll: 1500 })
await shot('12-mobile-owner-app', `/start?session=${clinic}&step=advisor`, { w: 390, h: 844, mobile: true, waitMs: 2000 })
await shot('13-landing-board', '/', { waitMs: 1500, still: true, locate: 'The same quarter, replayed' })
await browser.close()
console.log(JSON.stringify({ clinic, chain, verified, order, failing }))
