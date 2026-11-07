// Renders each card scene frame by frame from its paused GSAP timeline (the HyperFrames/Scrollstopper method).
import { chromium } from 'playwright'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { execSync } from 'node:child_process'
const V = resolve('../video'), FPS = 30, PAD = 0.7
const script = JSON.parse(readFileSync(`${V}/script.json`, 'utf8'))
const dur = JSON.parse(readFileSync(`${V}/durations.json`, 'utf8'))
const only = process.argv[2]
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH })
const page = await b.newPage({ viewport: { width: 1920, height: 1080 } })
mkdirSync(`${V}/clips`, { recursive: true })
for (const s of script.scenes.filter((x) => x.type === 'card' && (!only || x.id === only))) {
  const frames = `${V}/frames/${s.id}`
  rmSync(frames, { recursive: true, force: true }); mkdirSync(frames, { recursive: true })
  await page.goto(`file://${V}/cards/${s.card}.html`)
  await page.evaluate(() => document.fonts.ready)
  const n = Math.ceil((dur[s.id] + PAD) * FPS)
  for (let i = 0; i < n; i++) {
    await page.evaluate((t) => { window.seek(t) }, i / FPS)
    await page.screenshot({ path: `${frames}/${String(i).padStart(5, '0')}.jpg`, type: 'jpeg', quality: 92 })
  }
  execSync(`ffmpeg -loglevel error -y -framerate ${FPS} -i "${frames}/%05d.jpg" -c:v libx264 -pix_fmt yuv420p -crf 18 "${V}/clips/${s.id}.mp4"`)
  console.log(s.id, n, 'frames')
}
await b.close()
