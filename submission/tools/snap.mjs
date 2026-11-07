// Screenshot a local HTML file: node snap.mjs in.html out.png [w] [h]
import { chromium } from 'playwright'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
const [, , input, out, w = '1920', h = '1080'] = process.argv
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH })
const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: 1.5 })
await p.goto('file://' + resolve(input))
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(400)
await p.screenshot({ path: out })
await b.close()
console.log('saved', out)
