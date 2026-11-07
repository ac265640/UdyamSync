// Builds the 7-slide submission deck on the Airtel SYNC template backgrounds.
// node build_deck.cjs  ->  ../UdyamSync_Submission.pptx
const pptxgen = require('pptxgenjs')
const path = require('path')

const A = (p) => path.resolve(__dirname, '../assets', p)
const CROP = (p) => A('crops/' + p)
const TEAM = 'Team Softmax'
const REPO = 'https://github.com/ac265640/UdyamSync'
const SITE = 'https://ac265640.github.io/UdyamSync'
const VIDEO = `${SITE}/UdyamSync_Demo.mp4`

// Airtel red from the template is the one sharp accent; ink for text; peacock for product.
const INK = '1B1A17', MUTED = '5F584C', RED = 'E40000', KHATA = 'B4232A', PEACOCK = '0F5E6E', LEAF = '1E7B4E', PANEL = 'F5F2EC', LINE = 'E2DBCD', WHITE = 'FFFFFF', HALDI = 'F2B53A'
const HEAD = 'Georgia', BODY = 'Arial'
const ASPECT = { 'mobile.png': 780 / 1540, 'inspector_docs.png': 1840 / 1230, 'insights.png': 2780 / 1470, 'partner.png': 2760 / 1660, 'whatsapp.png': 770 / 1560, 'advisor.png': 910 / 1410, 'onebill.png': 910 / 1410, 'kyc.png': 910 / 1410, 'tracker.png': 1040 / 1500 }

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in
pres.title = 'Accel UdyamSync — Team Softmax — Airtel SYNC 2026'
pres.author = 'Team Softmax'
pres.subject = 'YTL Hackathon 2026 · Enterprise Track A · Project Udyam Digital'

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { path: A('template-content.jpg') },
  objects: [{ text: { text: `${TEAM} · Accel UdyamSync`, options: { x: 0.45, y: 5.22, w: 3, h: 0.22, fontFace: BODY, fontSize: 8, color: MUTED, margin: 0 } } }],
  slideNumber: { x: 3.0, y: 5.22, w: 0.5, h: 0.22, fontFace: BODY, fontSize: 8, color: MUTED },
})

const T = (slide, text, opts) => slide.addText(text, { isTextBox: true, fontFace: BODY, color: INK, margin: 0, valign: 'top', ...opts })
const title = (slide, text, sub) => {
  T(slide, text, { x: 0.45, y: 0.6, w: 9.1, h: 0.48, fontFace: HEAD, fontSize: 22, valign: 'middle' })
  if (sub) T(slide, sub, { x: 0.45, y: 1.06, w: 9.1, h: 0.26, fontSize: 11, color: MUTED })
}
const panel = (slide, x, y, w, h, fill = PANEL, line = LINE) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: line, width: 0.75 }, rectRadius: 0.08 })
// A live screenshot in a white frame with a soft shadow; w or h given, the other follows the image's aspect.
const shot = (slide, file, x, y, { w, h }) => {
  const a = ASPECT[file]
  w = w ?? h * a; h = h ?? w / a
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.03, y: y - 0.03, w: w + 0.06, h: h + 0.06, fill: { color: WHITE }, line: { color: LINE, width: 0.75 }, rectRadius: 0.05, shadow: { type: 'outer', color: '000000', opacity: 0.16, blur: 8, offset: 2, angle: 90 } })
  slide.addImage({ path: CROP(file), x, y, w, h })
  return { w, h }
}
const bullets = (items) => items.map((t, i) => ({ text: t, options: { bullet: { indent: 12 }, breakLine: i < items.length - 1 } }))
const button = (slide, label, url, x, y, w, h, fill, color, size = 13) => slide.addText([{ text: label, options: { hyperlink: { url, tooltip: url }, color, bold: true } }], {
  shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.12, x, y, w, h, fill: { color: fill }, line: { color: fill, width: 0.5 }, fontFace: BODY, fontSize: size, align: 'center', valign: 'middle', margin: 0,
})

// ============================================================== 1. Cover
{
  const s = pres.addSlide()
  s.background = { path: A('template-cover.jpg') }
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: 2.5, w: 5.75, h: 2.85, fill: { color: '0D0A0A', transparency: 18 }, line: { color: '0D0A0A', transparency: 100 }, rectRadius: 0.08 })
  T(s, 'TEAM SOFTMAX', { x: 0.65, y: 2.63, w: 5.3, h: 0.24, fontSize: 11, bold: true, color: HALDI, charSpacing: 4 })
  T(s, 'Accel UdyamSync', { x: 0.65, y: 2.88, w: 5.3, h: 0.6, fontFace: HEAD, fontSize: 34, color: WHITE })
  T(s, 'A small business goes online in one sitting: discover, price, verify and track on a phone, in its own language.', { x: 0.65, y: 3.5, w: 5.5, h: 0.5, fontSize: 12, color: WHITE, lineSpacingMultiple: 1.05 })
  T(s, 'Working prototype  ·  65 tests  ·  12/12 KYC traps caught  ·  10 languages  ·  ₹0 to run', { x: 0.65, y: 4.08, w: 5.6, h: 0.22, fontSize: 9.5, bold: true, color: 'F7D9D9' })
  button(s, '▶  Watch the demo (2:27)', VIDEO, 0.65, 4.42, 2.55, 0.5, RED, WHITE, 13.5)
  button(s, 'GitHub: ac265640/UdyamSync', REPO, 3.3, 4.42, 2.75, 0.5, WHITE, INK, 12.5)
  T(s, [{ text: 'Live showcase: ', options: {} }, { text: 'ac265640.github.io/UdyamSync', options: { hyperlink: { url: SITE }, color: WHITE, bold: true } }, { text: '   ·   Airtel SYNC 2026 · Enterprise Track A', options: {} }], { x: 0.65, y: 5.0, w: 5.4, h: 0.22, fontSize: 9.5, color: 'F2C9C9' })
  shot(s, 'mobile.png', 7.55, 0.95, { h: 4.05 })
  s.addNotes('Team Softmax — Accel UdyamSync. Demo video and code are linked on this slide.')
}

// ============================================================== 2. Problem
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, '93 of every 100 interested businesses never get switched on', 'Accel’s own data, 5,000 SMB leads in Apr–Jun 2026: demand is there; the journey loses them.')
  s.addChart(pres.charts.BAR, [{ name: 'Leads', labels: ['Lead', 'Contacted', 'Needs assessed', 'Quote accepted', 'KYC complete', 'Activated'], values: [5000, 3406, 1974, 861, 588, 368] }], {
    x: 0.35, y: 1.38, w: 4.5, h: 2.45, barDir: 'bar', catAxisOrientation: 'maxMin', chartColors: ['C9C1B3', 'C9C1B3', 'C9C1B3', 'C9C1B3', 'C9C1B3', RED], varyColors: true,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 10, dataLabelColor: INK, dataLabelFontFace: BODY, dataLabelFormatCode: '#,##0',
    catAxisLabelFontSize: 10, catAxisLabelColor: MUTED, catAxisLabelFontFace: BODY, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, barGapWidthPct: 40,
  })
  const stats = [['17.6 days', 'from lead to live'], ['3 calls', 'customers chase their order'], ['₹15,053', 'spent to win one customer'], ['9.6% vs 2.0%', 'activation with vs without GSTIN']]
  stats.forEach(([n, l], i) => {
    const x = 5.0 + (i % 2) * 2.3, y = 1.42 + Math.floor(i / 2) * 1.2
    panel(s, x, y, 2.18, 1.08)
    T(s, n, { x: x + 0.16, y: y + 0.12, w: 1.95, h: 0.48, fontFace: HEAD, fontSize: 23, color: i === 2 ? RED : INK })
    T(s, l, { x: x + 0.16, y: y + 0.64, w: 1.95, h: 0.36, fontSize: 11, color: MUTED })
  })
  T(s, 'Where they leave  →  what UdyamSync removes', { x: 0.45, y: 3.92, w: 6, h: 0.26, fontSize: 12, bold: true })
  const leaks = [['827', 'no time for a visit, or never scheduled', 'Self-serve advisor'], ['1,006', 'price, complex or slow quote', 'OneBill, instant'], ['273', 'documents, paperwork, absent signatory', 'Smart KYC + e-sign link'], ['56', 'activations that broke catalogue rules', 'Rules engine blocks them']]
  leaks.forEach(([n, why, fix], i) => {
    const x = 0.45 + i * 2.3
    T(s, [{ text: n + '  ', options: { fontFace: HEAD, fontSize: 18, color: RED } }, { text: why, options: { fontSize: 10, color: MUTED } }], { x, y: 4.2, w: 2.15, h: 0.52 })
    T(s, '→ ' + fix, { x, y: 4.78, w: 2.15, h: 0.26, fontSize: 11, bold: true, color: PEACOCK })
  })
}

// ============================================================== 3. Journey (live)
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Built and live: hello to a verified order in one sitting', 'Every screen below is the working prototype (owner app, mobile-first web; the same flow runs in WhatsApp and on a partner’s tablet).')
  const steps = [
    ['advisor.png', '1  Discover', 'Hindi voice or text; a GSTIN auto-fills the business from the registry.'],
    ['onebill.png', '2  OneBill', 'One monthly price; add-ons re-price live; fibre or 5G AirFiber per branch pincode.'],
    ['kyc.png', '3  Verify', 'Consent first; documents read on our server and checked against GST and Udyam.'],
    ['tracker.png', '4  Sign & track', 'Aadhaar e-sign, slide-to-pay UPI AutoPay, 5-stage tracker with WhatsApp updates.'],
  ]
  steps.forEach(([img, h, body], i) => {
    const cx = 0.45 + i * 2.3 + 1.075
    const ih = 2.42, iw = ih * ASPECT[img]
    shot(s, img, cx - iw / 2, 1.42, { h: ih })
    T(s, h, { x: 0.45 + i * 2.3, y: 3.9, w: 2.15, h: 0.26, fontSize: 12, bold: true })
    T(s, body, { x: 0.45 + i * 2.3, y: 4.14, w: 2.15, h: 0.5, fontSize: 9.5, color: MUTED })
  })
  panel(s, 0.45, 4.74, 9.1, 0.44, INK, INK)
  const proof = [['65', 'automated tests'], ['30/30', 'advisor scenarios'], ['12/12', 'KYC traps caught'], ['10', 'languages + voice'], ['₹0', 'to run (free tiers)']]
  proof.forEach(([n, l], i) => {
    T(s, [{ text: n + '  ', options: { fontFace: HEAD, fontSize: 15, color: HALDI, bold: true } }, { text: l, options: { fontSize: 10, color: WHITE } }], { x: 0.65 + i * 1.82, y: 4.77, w: 1.78, h: 0.36, valign: 'middle' })
  })
}

// ============================================================== 4. Smart KYC + privacy
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Smart KYC catches every planted problem, and shows where', 'Live KYC Inspector: 12 specimen applicants, on-server OCR + 20+ registry checks; boxes mark where each finding was read.')
  shot(s, 'inspector_docs.png', 0.48, 1.42, { w: 5.15 })
  T(s, 'Caught in the case’s specimens', { x: 5.95, y: 1.38, w: 3.6, h: 0.26, fontSize: 12, bold: true })
  const caught = [['K01', 'Cancelled GSTIN + blank Udyam number'], ['K02', '7° tilted scan, auto-straightened'], ['K04', 'Blurred GST certificate'], ['K05', 'Udyam certificate missing'], ['K06', 'GSTIN typo: checksum fails, fix suggested'], ['K07', 'Business name edited vs registry'], ['K11', 'Utility bill 257 days old (limit 90)']]
  caught.forEach(([k, t], i) => {
    const y = 1.7 + i * 0.32
    s.addText(k, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.06, x: 5.95, y: y + 0.02, w: 0.48, h: 0.24, fill: { color: KHATA }, line: { color: KHATA }, fontFace: BODY, fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0 })
    T(s, t, { x: 6.52, y, w: 3.05, h: 0.28, fontSize: 10.5, valign: 'middle' })
  })
  panel(s, 5.95, 4.02, 3.6, 1.12, 'EEF5F5', 'C9DFE2')
  T(s, 'DPDP Act by design', { x: 6.08, y: 4.09, w: 3.4, h: 0.24, fontSize: 11, bold: true, color: PEACOCK })
  T(s, 'Consent per purpose, hash-chained · no Aadhaar number ever stored · OCR on our own server · encrypted, purged 30 days after verification · “My Data”: view, export, erase', { x: 6.08, y: 4.34, w: 3.4, h: 0.76, fontSize: 9.5, color: INK })
}

// ============================================================== 5. Partners + go-to-market
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Partners stay in the deal. Offices first, kirana at scale', 'Segment order comes from the case economics; bundles are priced live by the prototype’s rules engine.')
  shot(s, 'partner.png', 0.48, 1.42, { w: 4.5 })
  T(s, bullets(['Every lead the advisor can’t close reaches a partner with the chat summary, a win-back score (model AUC 0.73) and the next best action', 'Assisted mode on a tablet; commission credited automatically, so the app never takes their customer']), { x: 0.45, y: 4.2, w: 4.6, h: 0.95, fontSize: 10, paraSpaceAfter: 3 })
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  s.addTable([
    [hdr('#'), hdr('Segment'), hdr('Conv.'), hdr('Bundle/mo'), hdr('Payback')],
    ['1', 'Professional offices', '11.1%', '₹6,575', '1.6 mo'],
    ['2', 'Micro retail (54% of leads)', '4.1%', '₹2,470', '8.1 mo'],
    ['3', 'Multi-site chains', '11.0%', '₹28,080', '0.6 mo'],
    ['4', 'Manufacturers', '12.8%', '₹15,910', '1.0 mo'],
  ], { x: 5.3, y: 1.42, w: 4.25, colW: [0.28, 1.72, 0.66, 0.86, 0.73], fontFace: BODY, fontSize: 10, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.3, valign: 'middle', margin: [0.02, 0.05, 0.02, 0.05] })
  shot(s, 'whatsapp.png', 5.33, 3.2, { h: 1.92 })
  T(s, 'Priced live by the engine', { x: 6.4, y: 3.18, w: 3.15, h: 0.25, fontSize: 11, bold: true })
  const b = [['Kirana, Nashik · WhatsApp, Marathi', '₹2,197'], ['Dental clinic, Pune · Hindi voice', '₹5,790'], ['3 restaurants, Pune · 3 branches', '₹11,376']]
  b.forEach(([n, p], i) => {
    T(s, [{ text: p, options: { fontFace: HEAD, fontSize: 15, color: RED } }, { text: ' /mo  ' + n, options: { fontSize: 9.5, color: MUTED } }], { x: 6.4, y: 3.47 + i * 0.36, w: 3.2, h: 0.32, valign: 'middle' })
  })
  T(s, 'Micro retail is reached on WhatsApp at near-zero cost to serve; field sales focus on multi-site and manufacturing.', { x: 6.4, y: 4.6, w: 3.15, h: 0.52, fontSize: 9.5, color: PEACOCK, bold: true })
}

// ============================================================== 6. Impact
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Replay the quarter: same 5,000 leads, 2.4× the activations', 'Live Insights screen: each drop reason is won back only by the feature that removes it, at cautious 10–50% rates.')
  shot(s, 'insights.png', 0.48, 1.42, { w: 4.6 })
  const big = [['+521', 'activations every quarter'], ['≈ ₹28 Cr', 'new annual recurring revenue'], ['56 → 0', 'rule-breaking sales']]
  big.forEach(([n, l], i) => {
    const x = 0.45 + i * 1.57
    panel(s, x, 4.07, 1.47, 1.05)
    T(s, n, { x: x + 0.12, y: 4.14, w: 1.3, h: 0.42, fontFace: HEAD, fontSize: 19, color: i === 2 ? LEAF : RED })
    T(s, l, { x: x + 0.12, y: 4.58, w: 1.3, h: 0.46, fontSize: 10, color: MUTED })
  })
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  s.addTable([
    [hdr('Metric that matters'), hdr('Today'), hdr('Replayed'), hdr('Pilot target')],
    ['Lead → activation', '7.36%', { text: '17.8%', options: { bold: true, color: RED } }, '≥ 15%'],
    ['Days lead → live', '17.6', { text: '8.6', options: { bold: true, color: RED } }, '≤ 9'],
    ['Cost per activation', '₹15,053', { text: '₹3,964', options: { bold: true, color: RED } }, '≤ ₹5,000'],
    ['Chase calls / customer', '3.0', { text: '0.5', options: { bold: true, color: RED } }, '≤ 0.5'],
    ['6-month churn', '15.2%', { text: '5.9%', options: { bold: true, color: RED } }, '≤ 8%'],
  ], { x: 5.35, y: 1.42, w: 4.2, colW: [1.7, 0.78, 0.86, 0.86], fontFace: BODY, fontSize: 10.5, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.34, valign: 'middle', margin: [0.02, 0.06, 0.02, 0.06] })
  T(s, bullets(['Churn follows chase calls in the data (1 call → 5.9%, 5 calls → 27.9%); the tracker removes the calls.', 'Platform cost ≈ ₹40 per lead (AI, OCR, hosting); field effort shifts to leads the advisor hands over.', 'Compliance re-run: all 56 historical rule breaches are blocked at quote time.']), { x: 5.35, y: 3.65, w: 4.2, h: 1.48, fontSize: 10, color: INK, paraSpaceAfter: 4 })
}

// ============================================================== 7. Architecture, rollout, risks, links
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Engineered to ship: architecture, rollout, risks', 'The AI talks, the rules engine decides. Mocks sit behind production interfaces, so the pilot swaps adapters, not logic.')
  s.addImage({ path: path.resolve(__dirname, '../../docs/architecture.png'), x: 0.45, y: 1.4, w: 5.0, h: 2.81 })
  T(s, 'Rollout', { x: 5.7, y: 1.36, w: 3.85, h: 0.25, fontSize: 12, bold: true })
  const ro = [['0–90 days', 'Pune + Jaipur pilot: offices on web, 20 partners, real DigiLocker and e-sign'], ['3–6 months', '6 cities; kirana on WhatsApp; GSP registry APIs, NPCI AutoPay'], ['6–12 months', 'All tier 1–2 cities; multi-site and factories via the Co-Pilot']]
  ro.forEach(([w, d], i) => T(s, [{ text: w + '  ', options: { bold: true, color: RED } }, { text: d }], { x: 5.7, y: 1.62 + i * 0.44, w: 3.85, h: 0.42, fontSize: 10 }))
  T(s, 'Risks, handled', { x: 5.7, y: 2.98, w: 3.85, h: 0.25, fontSize: 12, bold: true })
  T(s, bullets(['Wrong AI answer → prices only from the catalogue; 30-scenario eval in CI', 'Partner pushback → leads and commission flow to them', 'Document fraud → registry checks + human exception queue']), { x: 5.7, y: 3.24, w: 3.85, h: 0.95, fontSize: 10, paraSpaceAfter: 2 })
  panel(s, 0.45, 4.3, 9.1, 0.86, INK, INK)
  button(s, '▶  Watch the demo (2:27)', VIDEO, 0.62, 4.42, 2.45, 0.42, RED, WHITE, 12)
  button(s, 'GitHub repository', REPO, 3.17, 4.42, 2.05, 0.42, WHITE, INK, 12)
  button(s, 'Live showcase', SITE, 5.32, 4.42, 1.75, 0.42, PEACOCK, WHITE, 12)
  T(s, [{ text: TEAM, options: { bold: true, color: HALDI, fontSize: 12 } }, { text: '\nFastAPI · React · GSAP · RapidOCR · scikit-learn', options: { color: 'D8D0C0', fontSize: 9 } }], { x: 7.25, y: 4.38, w: 2.2, h: 0.72, valign: 'middle' })
  T(s, 'github.com/ac265640/UdyamSync   ·   ac265640.github.io/UdyamSync', { x: 0.62, y: 4.88, w: 6.5, h: 0.2, fontSize: 8.5, color: 'D8D0C0' })
}

pres.writeFile({ fileName: path.resolve(__dirname, '../UdyamSync_Submission.pptx') }).then((f) => console.log('wrote', f))
