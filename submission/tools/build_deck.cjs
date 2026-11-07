// Builds the 10-slide submission deck on the Airtel SYNC template backgrounds.
// node build_deck.cjs  ->  ../UdyamSync_Submission.pptx
const pptxgen = require('pptxgenjs')
const path = require('path')

const A = (p) => path.resolve(__dirname, '../assets', p)
const CROP = (p) => A('crops/' + p)
const TEAM = 'Team Softmax'
const REPO = 'https://github.com/ac265640/UdyamSync'
const SITE = 'https://ac265640.github.io/UdyamSync'
const VIDEO = `${SITE}/UdyamSync_Demo.mp4`
const ARCH = `${SITE}/UdyamSync_Architecture.pdf`
const PRIV = `${SITE}/UdyamSync_Privacy_Note.pdf`

// Airtel red from the template is the one sharp accent; ink for text; peacock for product.
const INK = '1B1A17', MUTED = '5F584C', RED = 'E40000', KHATA = 'B4232A', PEACOCK = '0F5E6E', LEAF = '1E7B4E', PANEL = 'F5F2EC', LINE = 'E2DBCD', WHITE = 'FFFFFF', HALDI = 'F2B53A'
const HEAD = 'Georgia', BODY = 'Arial'
const ASPECT = { 'mobile.png': 780 / 1540, 'inspector_docs.png': 1840 / 1230, 'insights.png': 2520 / 1640, 'partner.png': 2760 / 1660, 'whatsapp.png': 770 / 1560, 'architecture_slide.png': 1920 / 800, 'advisor.png': 910 / 1410, 'onebill.png': 910 / 1410, 'kyc.png': 910 / 1410, 'tracker.png': 1040 / 1500 }

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
  T(s, 'Working prototype  ·  65 tests  ·  12/12 KYC verdicts right  ·  3 + 7 GenAI languages', { x: 0.65, y: 4.08, w: 5.6, h: 0.22, fontSize: 9.5, bold: true, color: 'F7D9D9' })
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
  title(s, 'Built and live: hello to a verified order in one sitting', 'Every screen is the working prototype (mobile-first web); the same flow runs in a WhatsApp-style chat and on a partner tablet.')
  const steps = [
    ['advisor.png', '1  Discover', 'Hindi voice or text; a GSTIN fills in the business from the registry.'],
    ['onebill.png', '2  OneBill', 'One monthly price; add-ons re-price live; fibre or 5G AirFiber per branch pincode.'],
    ['kyc.png', '3  Verify', 'Consent first; documents read on our server and checked against GST and Udyam.'],
    ['tracker.png', '4  Sign & track', 'E-sign, UPI AutoPay, then an ETA per product: this order has a leased line (21 days).'],
  ]
  steps.forEach(([img, h, body], i) => {
    const cx = 0.45 + i * 2.3 + 1.075
    const ih = 2.5, iw = ih * ASPECT[img]
    shot(s, img, cx - iw / 2, 1.42, { h: ih })
    T(s, h, { x: 0.45 + i * 2.3, y: 3.97, w: 2.15, h: 0.24, fontSize: 12, bold: true })
    T(s, body, { x: 0.45 + i * 2.3, y: 4.2, w: 2.15, h: 0.5, fontSize: 9, color: MUTED })
  })
  panel(s, 0.45, 4.72, 9.1, 0.44, INK, INK)
  const proof = [['65', 'automated tests'], ['30/30', 'internal evals'], ['12/12', 'KYC verdicts right'], ['3 + 7', 'languages*'], ['3/3', 'stretch goals']]
  T(s, '* 3 built in (Hindi, Marathi, English; work offline) + 7 via the optional GenAI layer (Gemini / Groq)', { x: 3.6, y: 5.22, w: 4.6, h: 0.2, fontSize: 7.5, color: MUTED })
  proof.forEach(([n, l], i) => {
    T(s, [{ text: n + '  ', options: { fontFace: HEAD, fontSize: 15, color: HALDI, bold: true } }, { text: l, options: { fontSize: 10, color: WHITE } }], { x: 0.65 + i * 1.82, y: 4.77, w: 1.78, h: 0.36, valign: 'middle' })
  })
}

// ============================================================== 4. Smart KYC + privacy
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Smart KYC: all 12 specimen applicants judged correctly', 'Live KYC Inspector: on-server OCR + 20+ registry checks. 7 applicants had a planted problem, 5 were clean.')
  shot(s, 'inspector_docs.png', 0.48, 1.42, { w: 5.15 })
  T(s, '7 planted problems, all caught', { x: 5.95, y: 1.38, w: 3.6, h: 0.26, fontSize: 12, bold: true })
  const caught = [['K01', 'Cancelled GSTIN + blank Udyam number'], ['K02', '7° tilted scan, auto-straightened'], ['K04', 'Blurred GST certificate'], ['K05', 'Udyam certificate missing'], ['K06', 'GSTIN typo: checksum fails, fix suggested'], ['K07', 'Business name edited vs registry'], ['K11', 'Utility bill 257 days old (limit 90)']]
  caught.forEach(([k, t], i) => {
    const y = 1.68 + i * 0.29
    s.addText(k, { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.06, x: 5.95, y: y + 0.02, w: 0.48, h: 0.23, fill: { color: KHATA }, line: { color: KHATA }, fontFace: BODY, fontSize: 9, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0 })
    T(s, t, { x: 6.52, y, w: 3.05, h: 0.27, fontSize: 10, valign: 'middle' })
  })
  s.addText('5 clean', { shape: pres.shapes.ROUNDED_RECTANGLE, rectRadius: 0.06, x: 5.95, y: 3.74, w: 0.48, h: 0.23, fill: { color: LEAF }, line: { color: LEAF }, fontFace: BODY, fontSize: 7.5, bold: true, color: WHITE, align: 'center', valign: 'middle', margin: 0 })
  T(s, 'K03, K08–K10, K12 passed as clean', { x: 6.52, y: 3.72, w: 3.05, h: 0.27, fontSize: 9.5, valign: 'middle' })
  panel(s, 5.95, 4.1, 3.6, 1.04, 'EEF5F5', 'C9DFE2')
  T(s, 'DPDP Act by design', { x: 6.08, y: 4.16, w: 3.4, h: 0.24, fontSize: 11, bold: true, color: PEACOCK })
  T(s, 'Consent per purpose before upload · Aadhaar number never collected · OCR on our own server · images purged 30 days after verification · full 1-page privacy note filed separately', { x: 6.08, y: 4.4, w: 3.4, h: 0.7, fontSize: 9, color: INK })
}

// ============================================================== 5. Segments + bundles (Key question 1)
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Digital fit × volume decides who goes self-serve', 'Bundles: the advisor’s live pick for a typical business in each segment (prices ex-GST). Conversion and payback: smb_leads.csv.')
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  const pr = (t) => ({ text: t, options: { bold: true, color: RED, fontFace: HEAD, fontSize: 12.5 } })
  const ch = (t, c) => ({ text: t, options: { bold: true, color: c } })
  s.addTable([
    [hdr('Segment · share of base'), hdr('Recommended bundle (typical business)'), hdr('Price / mo'), hdr('Contract'), hdr('Conv. today'), hdr('Payback*'), hdr('Channel')],
    ['Professional offices · 25%\nClinic, CA firm, 14 staff', 'Biz Fibre 300 + 4 business SIMs + cloud email and endpoint security, 14 seats', pr('₹8,197'), '12 mo, no setup fee', '11.1%', '1.6 → 0.6 mo', ch('Self-serve web', PEACOCK)],
    ['Micro retail & services · 55%\nKirana, salon, pharmacy', 'Biz Fibre 100 + 2 business SIMs + WhatsApp Business (entry ₹1,448: fibre + SIM)', pr('₹3,046'), '12 mo, no setup fee', '4.1%', '8.1 → 1.6 mo', ch('WhatsApp + partner', PEACOCK)],
    ['Small multi-site · 15%\nRestaurant chain, 5 outlets', 'Fibre 300 + SIM per outlet, 20 cloud CCTV, 4G/5G failover per site, one bill', pr('₹16,965'), '24 mo, ₹21,750 setup', '11.0%', '0.6 mo', ch('Field sales', KHATA)],
    ['Small manufacturers · 5%\nAuto-parts unit, 85 staff', '20 Mbps leased line + 9 SIMs + email and security, 29 seats; IoT in Pro tier', pr('₹19,887'), '24 mo, ₹5,000 setup', '12.8%', '1.0 mo', ch('Field sales', KHATA)],
  ], { x: 0.45, y: 1.4, w: 9.1, colW: [1.9, 3.0, 0.82, 0.95, 0.66, 0.85, 0.92], fontFace: BODY, fontSize: 9, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: [0.3, 0.48, 0.48, 0.48, 0.48], valign: 'middle', margin: [0.03, 0.05, 0.03, 0.05] })
  T(s, '* Payback = acquisition cost ÷ monthly bundle revenue (revenue, not margin). Today’s cost per segment → UdyamSync blended ₹3,964, shown for the self-serve segments.', { x: 0.45, y: 3.68, w: 9.1, h: 0.22, fontSize: 8, color: MUTED })
  const tiles = [
    ['Self-serve where it fits', 'Offices and kirana are 80% of the base, single-site, with needs a 3-question advisor can price. Offices lead: 86% have a GSTIN, so KYC is instant.', 'EEF5F5', 'C9DFE2', PEACOCK],
    ['Kirana: volume, not margin', 'Worst conversion (4.1%) and payback (8.1 mo) today, so only the cheapest channel works: WhatsApp, Essential tier, partner-assisted KYC.', PANEL, LINE, INK],
    ['Field sales where it pays', 'Chains and factories convert well and pay back fastest, but need surveys, SD-WAN and leased lines. The advisor qualifies; a rep closes.', 'FBEAEA', 'F0C9C9', KHATA],
  ]
  tiles.forEach(([h, b, f, l, c], i) => {
    const x = 0.45 + i * 3.07
    panel(s, x, 3.98, 2.96, 1.16, f, l)
    T(s, h, { x: x + 0.14, y: 4.05, w: 2.7, h: 0.26, fontSize: 11.5, bold: true, color: c })
    T(s, b, { x: x + 0.14, y: 4.32, w: 2.7, h: 0.78, fontSize: 9.5, color: INK })
  })
}

// ============================================================== 6. Field force + partners (Key question 4)
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'The app adds to the field force and partners; it never competes', 'Live Partner Co-Pilot: leads the advisor can’t close go to the local partner (with the owner’s consent), ranked, with the chat summary.')
  shot(s, 'partner.png', 0.48, 1.42, { w: 4.9 })
  T(s, bullets(['4,632 dropped leads ranked by a win-back score: propensity model (AUC 0.73) × how recoverable the drop reason is', 'Assisted mode on a tablet; KYC exceptions fixed with the owner']), { x: 0.45, y: 4.48, w: 4.95, h: 0.68, fontSize: 9.5, paraSpaceAfter: 2 })
  T(s, 'Who does what', { x: 5.65, y: 1.38, w: 2.4, h: 0.26, fontSize: 12, bold: true })
  const roles = [
    ['Advisor (web, voice, chat)', 'Self-serve for offices and kirana: discovery, quote, KYC, e-sign, tracking'],
    ['Channel partners', 'Get every consented stalled lead in their area, plus commission on digital sales there'],
    ['Field sales', 'Multi-site and factory deals only; the advisor qualifies and books the survey'],
  ]
  roles.forEach(([h, b], i) => {
    const y = 1.66 + i * 0.75
    s.addShape(pres.shapes.OVAL, { x: 5.65, y: y + 0.04, w: 0.26, h: 0.26, fill: { color: [PEACOCK, RED, INK][i] }, line: { color: WHITE } })
    T(s, String(i + 1), { x: 5.65, y: y + 0.04, w: 0.26, h: 0.26, fontSize: 10, bold: true, color: WHITE, align: 'center', valign: 'middle' })
    T(s, [{ text: h, options: { bold: true, breakLine: true } }, { text: b, options: { color: MUTED, fontSize: 9 } }], { x: 6.0, y, w: 2.15, h: 0.72, fontSize: 10 })
  })
  shot(s, 'whatsapp.png', 8.38, 1.42, { h: 2.25 })
  T(s, 'WhatsApp-style chat (mock); production uses the WhatsApp Business API', { x: 8.2, y: 3.72, w: 1.4, h: 0.5, fontSize: 7.5, color: MUTED, align: 'center' })
  panel(s, 5.65, 4.25, 3.9, 0.9, 'EEF5F5', 'C9DFE2')
  T(s, [{ text: 'Why partners and reps say yes\n', options: { bold: true, color: PEACOCK, fontSize: 10.5 } }, { text: '827 leads drop today because no visit happened. These become warm, pre-qualified calls: fewer wasted visits, more closes, credit kept.', options: { fontSize: 9 } }], { x: 5.78, y: 4.31, w: 3.7, h: 0.8 })
}

// ============================================================== 7. Impact (Key question 5)
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Five metrics, conservative targets: same 5,000 leads replayed', 'Live Insights screen: each drop reason is won back only by the feature that removes it, at cautious 10–50% rates (all adjustable).')
  shot(s, 'insights.png', 0.48, 1.42, { h: 2.5 })
  const big = [['+521', 'activations a quarter (2.4×)'], ['≈ ₹18 Cr', 'ARR run-rate after year 1'], ['56 → 0', 'rule-breaking sales']]
  big.forEach(([n, l], i) => {
    const x = 0.45 + i * 1.32
    panel(s, x, 4.08, 1.24, 0.8)
    T(s, n, { x: x + 0.1, y: 4.13, w: 1.1, h: 0.36, fontFace: HEAD, fontSize: 16, color: i === 2 ? LEAF : RED })
    T(s, l, { x: x + 0.1, y: 4.5, w: 1.1, h: 0.36, fontSize: 8, color: MUTED })
  })
  T(s, '₹18 Cr = 521 × 4 qtrs × 94% kept × ₹7,771 avg bundle × 12', { x: 0.45, y: 4.92, w: 3.95, h: 0.24, fontSize: 7.5, color: MUTED })
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  const r = (t) => ({ text: t, options: { bold: true, color: RED } })
  s.addTable([
    [hdr('Metric'), hdr('Today'), hdr('Replayed'), hdr('Pilot target')],
    ['Lead → activation', '7.36%', r('17.8%'), '≥ 12%'],
    ['Days lead → live', '17.6', r('8.6'), '≤ 12'],
    ['Cost per activation', '₹15,053', r('₹3,964'), '≤ ₹7,500'],
    ['Chase calls / customer', '3.0', r('0.5'), '≤ 1.0'],
    ['6-month churn', '15.2%', r('5.9%'), '≤ 11%'],
  ], { x: 4.6, y: 1.4, w: 4.95, colW: [1.75, 0.95, 1.0, 1.25], fontFace: BODY, fontSize: 10, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.29, valign: 'middle', margin: [0.02, 0.06, 0.02, 0.06] })
  T(s, bullets([
    'Targets sit well under the replay, so the pilot is judged on a margin of safety, not on our own model.',
    'Days: quote, KYC and e-sign happen in one sitting, so only install time is left, and it depends on the product: AirFiber 2 days, fibre 5, leased line 21–30.',
    'Churn: 1 call → 5.9%, 5 calls → 27.9% is a correlation. If only half of it is causal, churn still falls to about 10.6%.',
    'Cost: field spend −40% on self-served leads, plus about ₹40 platform cost per lead (AI, OCR, hosting).',
  ]), { x: 4.6, y: 3.2, w: 4.95, h: 1.95, fontSize: 9, color: INK, paraSpaceAfter: 3 })
}

// ============================================================== 8. Architecture
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Architecture: the AI talks, the rules engine decides', 'Mocks sit behind production interfaces, so the pilot swaps adapters, not logic.')
  shot(s, 'architecture_slide.png', 0.5, 1.42, { w: 8.9 })
  button(s, 'Full diagram + data flows (PDF) ↗', ARCH, 6.75, 1.03, 2.8, 0.3, PEACOCK, WHITE, 9.5)
}

// ============================================================== 9. Rollout + risks
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Rollout in three gates, and the risks that could stop it', 'Each phase starts only when the previous one meets the pilot targets on slide 7.')
  const ro = [
    ['0–90 days', 'Pilot: Pune + Jaipur', 'Offices on web, kirana on WhatsApp, 20 partners. Real DigiLocker and e-sign; compliance sign-off on KYC retention first.'],
    ['3–6 months', '6 cities', 'GSP registry APIs, NPCI AutoPay, WhatsApp Business API. Field reps get advisor-qualified leads.'],
    ['6–12 months', 'All tier 1–2 cities', 'Multi-site and factory deals run through the Co-Pilot; LLM on an enterprise no-training tier.'],
  ]
  ro.forEach(([w, h, d], i) => {
    const y = 1.42 + i * 1.22
    panel(s, 0.45, y, 3.65, 1.12, i === 0 ? 'FBEAEA' : PANEL, i === 0 ? 'F0C9C9' : LINE)
    T(s, [{ text: w + '   ', options: { bold: true, color: RED } }, { text: h, options: { bold: true } }], { x: 0.6, y: y + 0.08, w: 3.4, h: 0.26, fontSize: 11 })
    T(s, d, { x: 0.6, y: y + 0.38, w: 3.4, h: 0.7, fontSize: 9.5, color: MUTED })
  })
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  const k = (t) => ({ text: t, options: { bold: true } })
  s.addTable([
    [hdr('Risk'), hdr('How we handle it')],
    [k('Technician capacity'), 'Faster sales can swamp install crews: city launches are gated on crew capacity, the SLA watch flags installs at risk of passing 21 days, and AirFiber (2 days) covers fibre backlogs.'],
    [k('Field force pushback'), 'Reps keep credit for advisor-qualified leads in their territory and focus on high-value multi-site and factory deals.'],
    [k('Partner pushback'), 'Stalled leads and commission flow to them; assisted mode makes them faster, not redundant.'],
    [k('Payment / AutoPay failure'), 'UPI mandate retry, then card or net-banking mandate; the order is held, not cancelled, with WhatsApp reminders.'],
    [k('Wrong AI answer'), 'Prices only from the catalogue; internal 30-scenario eval in CI (the judges’ scenarios will differ).'],
    [k('Document fraud'), 'Registry cross-checks, tamper and name-match flags, human exception queue.'],
  ], { x: 4.3, y: 1.42, w: 5.25, colW: [1.45, 3.8], fontFace: BODY, fontSize: 8.5, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: [0.26, 0.56, 0.45, 0.45, 0.45, 0.45, 0.4], valign: 'middle', margin: [0.02, 0.06, 0.02, 0.06] })
}

// ============================================================== 10. The brief, answered + links
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Everything the brief asked for, answered', 'Key questions, build challenge and the four deliverables from the case, each mapped to where it is shown.')
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  const ok = (t) => ({ text: '✓  ' + t, options: {} })
  s.addTable([
    [hdr('The brief asks'), hdr('Our answer'), hdr('Where')],
    ['Q1  Segments and bundles', ok('Digital fit × volume; 4 bundles with products, price, contract'), 'Slide 5'],
    ['Q2  Discovery without a salesperson', ok('Advisor: 3 languages built in + 7 via GenAI, voice or text, GSTIN pre-fill'), 'Slide 3, video'],
    ['Q3  Near-instant, DPDP-compliant KYC', ok('Registry lookup, on-server OCR, DigiLocker, e-sign; consent per purpose'), 'Slide 4, privacy note'],
    ['Q4  Role of field force and partners', ok('Partners get consented stalled leads + commission; reps keep big deals'), 'Slide 6'],
    ['Q5  Metrics and targets', ok('5 metrics: today, replayed, conservative pilot target'), 'Slide 7'],
    ['Build: advisor, quote, KYC, tracker', ok('All 4 built; stretch: voice, WhatsApp-style chat, partner view, propensity'), 'Slide 3, video'],
    ['Deliverables 1–4', ok('Video 2:27 + code · architecture PDF · this 10-slide case · 1-page privacy note'), 'Links below'],
  ], { x: 0.45, y: 1.4, w: 9.1, colW: [2.55, 5.15, 1.4], fontFace: BODY, fontSize: 9.5, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.3, valign: 'middle', margin: [0.02, 0.06, 0.02, 0.06] })
  panel(s, 0.45, 4.0, 9.1, 1.16, INK, INK)
  button(s, '▶  Watch the demo (2:27)', VIDEO, 0.62, 4.12, 2.45, 0.42, RED, WHITE, 12)
  button(s, 'GitHub repository', REPO, 3.17, 4.12, 1.95, 0.42, WHITE, INK, 12)
  button(s, 'Architecture (PDF)', ARCH, 0.62, 4.62, 2.45, 0.38, PEACOCK, WHITE, 11)
  button(s, 'Privacy note (PDF)', PRIV, 3.17, 4.62, 1.95, 0.38, PEACOCK, WHITE, 11)
  T(s, [{ text: TEAM, options: { bold: true, color: HALDI, fontSize: 13 } }, { text: '\nLive showcase: ', options: { color: 'D8D0C0', fontSize: 9.5 } }, { text: 'ac265640.github.io/UdyamSync', options: { hyperlink: { url: SITE }, color: WHITE, bold: true, fontSize: 9.5 } }, { text: '\ngithub.com/ac265640/UdyamSync', options: { color: 'D8D0C0', fontSize: 9.5 } }], { x: 5.4, y: 4.1, w: 4.0, h: 0.95, valign: 'middle' })
}

pres.writeFile({ fileName: path.resolve(__dirname, '../UdyamSync_Submission.pptx') }).then((f) => console.log('wrote', f))
