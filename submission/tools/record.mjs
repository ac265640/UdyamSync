// Records the real running app (web :5173, api :8000) for each clip scene, paced to its voiceover.
// node record.mjs [sceneId]   ->  ../video/raw/<id>.webm + ../video/raw/meta.json (start offsets)
import { chromium } from 'playwright'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync, rmSync } from 'node:fs'

const V = resolve('../video'), WEB = 'http://localhost:5173', API = 'http://localhost:8000'
const W = 1920, H = 1080, ZOOM = 1.4 // page zoom: UI renders large and crisp at 1080p
const script = JSON.parse(readFileSync(`${V}/script.json`, 'utf8'))
const dur = JSON.parse(readFileSync(`${V}/durations.json`, 'utf8'))
const metaFile = `${V}/raw/meta.json`
mkdirSync(`${V}/raw`, { recursive: true })
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {}
const only = process.argv[2]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const j = async (path, body, method = body ? 'POST' : 'GET') => {
  const r = await fetch(API + path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  if (!r.ok) throw new Error(`${method} ${path} ${r.status} ${await r.text()}`)
  return r.json()
}
const say = (sid, text) => j(`/api/advisor/sessions/${sid}/messages`, { text })
async function session(lang, msgs) {
  const s = (await j('/api/advisor/sessions', { lang })).session_id
  for (const m of msgs) await say(s, m)
  return s
}

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH })

async function record(id, caption, run) {
  if (only && only !== id) return
  const target = (dur[id] + 0.9) * 1000
  const tmp = `${V}/raw/tmp_${id}`
  rmSync(tmp, { recursive: true, force: true })
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, recordVideo: { dir: tmp, size: { width: W, height: H } } })
  const born = Date.now()
  await ctx.addInitScript(([cap, zoom]) => {
    localStorage.setItem('udyamsync.demo', '0')
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.zoom = String(zoom)
      const d = document.createElement('div')
      d.textContent = cap
      d.style.cssText = 'position:fixed;left:24px;bottom:24px;z-index:9999;background:rgba(27,26,23,.92);color:#f6f1e7;font:600 16px/1 "Onest Variable",sans-serif;padding:11px 16px;border-radius:999px;letter-spacing:.01em;box-shadow:0 8px 24px -10px rgba(0,0,0,.5)'
      document.body.appendChild(d)
    })
  }, [caption, ZOOM])
  const page = await ctx.newPage()
  let start = null
  const mark = () => { start = Date.now() }
  await run(page, mark)
  const elapsed = Date.now() - start
  if (elapsed < target) await sleep(target - elapsed)
  const video = page.video()
  await ctx.close()
  const p = await video.path()
  renameSync(p, `${V}/raw/${id}.webm`)
  rmSync(tmp, { recursive: true, force: true })
  meta[id] = { offset: (start - born) / 1000, length: target / 1000 }
  writeFileSync(metaFile, JSON.stringify(meta, null, 2))
  console.log(id, 'recorded', ((Date.now() - start) / 1000).toFixed(1), 's, offset', meta[id].offset.toFixed(2))
}
const cap = (id) => script.scenes.find((s) => s.id === id).caption
const ready = (page) => page.waitForLoadState('networkidle')
async function hoverMain(page) {
  const b = await page.locator('main .card').first().boundingBox()
  await page.mouse.move(b.x + b.width / 2, b.y + b.height * 0.6)
}

// ---------------------------------------------------------------- scenes
await record('s03_landing', cap('s03_landing'), async (page, mark) => {
  await page.goto(WEB + '/'); await ready(page); await sleep(600); mark()
  await sleep(4500)
  await page.mouse.move(700, 500)
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 90); await sleep(120) }
})

await record('s04_advisor', cap('s04_advisor'), async (page, mark) => {
  await page.goto(WEB + '/start?new=1&lang=hi'); await ready(page); await sleep(500); mark()
  await sleep(900)
  const input = page.locator('input[placeholder^="लिखिए"]')
  await input.click()
  await input.pressSequentially('मेरी पुणे में डेंटल क्लिनिक है, 8 लोग काम करते हैं, 1 क्लिनिक', { delay: 32 })
  await sleep(250); await input.press('Enter')
  await page.getByRole('button', { name: 'डेटा बैकअप' }).waitFor(); await sleep(1300)
  await page.getByRole('button', { name: 'डेटा बैकअप' }).click(); await sleep(900)
  await page.getByRole('button', { name: /मेरा बंडल दिखाइए/ }).click()
})

const chain = await session('en', ['3 restaurants in Pune, 25 staff, need CCTV and UPI billing that never stops'])
await record('s05_onebill', cap('s05_onebill'), async (page, mark) => {
  await page.goto(`${WEB}/start?session=${chain}&step=quote`); await ready(page); await sleep(500); mark()
  await sleep(1400)
  const pins = page.locator('input[placeholder="Pincode"]')
  for (const [i, pin] of ['411038', '411014', '411001'].entries()) { await pins.nth(i).click(); await pins.nth(i).pressSequentially(pin, { delay: 70 }) }
  await sleep(300)
  await page.getByRole('button', { name: 'Check & update bundle' }).click()
  await sleep(2600)
  await page.getByRole('button', { name: '12 months' }).click(); await sleep(1400)
  await page.getByRole('button', { name: /24 months/ }).click(); await sleep(900)
  await hoverMain(page)
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 110); await sleep(140) }
})

const kycSid = await session('en', ['27XUIXG0767D1ZP', '12 workers, 1 workshop', 'need:security', 'need:none'])
await record('s06_kyc', cap('s06_kyc'), async (page, mark) => {
  await page.goto(`${WEB}/start?session=${kycSid}&step=kyc`); await ready(page); await sleep(400); mark()
  await sleep(2600)
  await page.getByRole('button', { name: /I agree/ }).click(); await sleep(1100)
  await page.getByText('Demo: load a specimen applicant').click(); await sleep(700)
  await page.getByRole('button', { name: 'K03', exact: true }).click()
  await page.getByText('Verification result').waitFor({ timeout: 20000 }); await sleep(500)
  await hoverMain(page)
  for (let i = 0; i < 8; i++) { await page.mouse.wheel(0, 120); await sleep(130) }
})

await record('s07_inspector', cap('s07_inspector'), async (page, mark) => {
  await page.goto(`${WEB}/kyc-inspector?k=K07`); await page.getByText('K07 · ').waitFor(); mark()
  await sleep(7300)
  await page.getByRole('button', { name: /K11/ }).click()
})

const paySid = await session('en', ['27XUIXG0767D1ZP', '12 workers, 1 workshop', 'need:security', 'need:none'])
await j(`/api/kyc/${paySid}/consent`, { purposes: { kyc_verification: true, service_updates: true } })
await j(`/api/kyc/${paySid}/use-sample/K03`, {})
await record('s08_track', cap('s08_track'), async (page, mark) => {
  await page.goto(`${WEB}/start?session=${paySid}&step=pay`); await ready(page); await sleep(400); mark()
  await sleep(1000)
  await page.getByRole('button', { name: /Send Aadhaar e-Sign OTP/ }).click(); await sleep(500)
  await page.getByPlaceholder('6-digit OTP').pressSequentially('482913', { delay: 70 }); await sleep(200)
  await page.getByRole('button', { name: 'Sign', exact: true }).click(); await sleep(600)
  await page.getByRole('button', { name: 'GPay' }).click(); await sleep(700)
  const handle = page.locator('[role="slider"]')
  const hb = await handle.boundingBox()
  const tr = await handle.evaluate((el) => { const r = el.parentElement.getBoundingClientRect(); return { x: r.x, w: r.width } })
  const y = hb.y + hb.height / 2
  await page.mouse.move(hb.x + hb.width / 2, y); await page.mouse.down()
  for (let i = 1; i <= 30; i++) { await page.mouse.move(hb.x + hb.width / 2 + ((tr.x + tr.w - 22 - (hb.x + hb.width / 2)) * i) / 30, y); await sleep(24) }
  await sleep(120); await page.mouse.up(); await sleep(900)
  if (!(await page.getByText('Updates sent to you').isVisible())) { await handle.focus(); await page.keyboard.press('End') }
  try { await page.getByText('Updates sent to you').waitFor({ timeout: 15000 }) } catch (e) { await page.screenshot({ path: '/tmp/s08_fail.png' }); throw e }
  await sleep(2600)
  await page.getByRole('button', { name: /move to next stage/ }).click(); await sleep(1400)
  await page.getByRole('button', { name: /move to next stage/ }).click()
})

await record('s09_whatsapp', cap('s09_whatsapp'), async (page, mark) => {
  await page.goto(`${WEB}/whatsapp?lang=mr&say=${encodeURIComponent('नाशिक मध्ये किराणा दुकान, फक्त मी, UPI बिलिंग')}`); await ready(page); mark()
})

await record('s10_partner', cap('s10_partner'), async (page, mark) => {
  await page.goto(`${WEB}/partner`); await ready(page); await sleep(500); mark()
  await sleep(2600)
  await page.getByText('Law office').first().click(); await sleep(3200)
  await page.getByText('Pearl Kitchens').first().click(); await sleep(1500)
  await page.getByRole('button', { name: /Earnings/ }).click()
})

await record('s11_insights', cap('s11_insights'), async (page, mark) => {
  await page.goto(`${WEB}/insights`); await ready(page); await sleep(800); mark()
  await sleep(3800)
  const slider = page.locator('input[type="range"]').nth(1)
  await slider.focus()
  for (let i = 0; i < 6; i++) { await page.keyboard.press('ArrowRight'); await sleep(260) }
  await sleep(1600)
  await page.mouse.move(700, 500)
  for (let i = 0; i < 9; i++) { await page.mouse.wheel(0, 130); await sleep(140) }
})

await browser.close()
