// Builds the 7-slide submission deck on the Airtel SYNC template backgrounds.
// node build_deck.cjs  ->  ../UdyamSync_Submission.pptx
const pptxgen = require('pptxgenjs')
const path = require('path')

const A = (p) => path.resolve(__dirname, '../assets', p)
const SHOT = (p) => path.resolve(__dirname, '../../docs/screenshots', p)
const REPO = 'https://github.com/ac265640/UdyamSync'
const SITE = 'https://ac265640.github.io/UdyamSync'
const VIDEO = `${SITE}/UdyamSync_Demo.mp4`

// Palette: Airtel red from the template as the one sharp accent, ink for text, peacock for product.
const INK = '1B1A17', MUTED = '5F584C', RED = 'E40000', PEACOCK = '0F5E6E', LEAF = '1E7B4E', PANEL = 'F5F2EC', LINE = 'E2DBCD', WHITE = 'FFFFFF', HALDI = 'B7791F'
const HEAD = 'Georgia', BODY = 'Arial'

const pres = new pptxgen()
pres.layout = 'LAYOUT_16x9' // 10 x 5.625 in
pres.title = 'Accel UdyamSync — Airtel SYNC 2026 submission'
pres.author = 'ac265640'
pres.subject = 'YTL Hackathon 2026 · Enterprise Track A · Project Udyam Digital'

pres.defineSlideMaster({
  title: 'CONTENT',
  background: { path: A('template-content.jpg') },
  objects: [
    { text: { text: 'Accel UdyamSync', options: { x: 0.45, y: 5.22, w: 3, h: 0.22, fontFace: BODY, fontSize: 8, color: MUTED, margin: 0 } } },
  ],
  slideNumber: { x: 2.0, y: 5.22, w: 0.6, h: 0.22, fontFace: BODY, fontSize: 8, color: MUTED },
})

const T = (slide, text, opts) => slide.addText(text, { isTextBox: true, fontFace: BODY, color: INK, margin: 0, valign: 'top', ...opts })
const title = (slide, text, sub) => {
  T(slide, text, { x: 0.45, y: 0.62, w: 9.1, h: 0.5, fontFace: HEAD, fontSize: 24, bold: false, valign: 'middle' })
  if (sub) T(slide, sub, { x: 0.45, y: 1.12, w: 9.1, h: 0.3, fontSize: 11, color: MUTED })
}
const panel = (slide, x, y, w, h, fill = PANEL) => slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w, h, fill: { color: fill }, line: { color: LINE, width: 0.75 }, rectRadius: 0.08 })
const shot = (slide, file, x, y, w, h) => {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: x - 0.02, y: y - 0.02, w: w + 0.04, h: h + 0.04, fill: { color: WHITE }, line: { color: LINE, width: 0.75 }, rectRadius: 0.05, shadow: { type: 'outer', color: '000000', opacity: 0.12, blur: 6, offset: 2, angle: 90 } })
  slide.addImage({ path: file, x, y, w, h, sizing: { type: 'cover', w, h } })
}

// ============================================================== 1. Cover
{
  const s = pres.addSlide()
  s.background = { path: A('template-cover.jpg') }
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 0.45, y: 2.85, w: 5.2, h: 2.25, fill: { color: '0D0A0A', transparency: 25 }, line: { color: '0D0A0A', transparency: 100 }, rectRadius: 0.08 })
  T(s, 'Accel UdyamSync', { x: 0.62, y: 2.95, w: 5.0, h: 0.62, fontFace: HEAD, fontSize: 36, color: WHITE })
  T(s, [
    { text: 'Ek baar mein vyapar digital. ', options: { italic: true, color: 'FFD6D6' } },
    { text: 'A small business goes from “what do I need?” to a verified, scheduled order in one ~10-minute sitting: on a phone, in its own language, with its local partner still in the deal.', options: {} },
  ], { x: 0.62, y: 3.6, w: 4.9, h: 0.95, fontSize: 11.5, color: WHITE, lineSpacingMultiple: 1.08 })
  T(s, 'Airtel SYNC 2026 · YTL Hackathon · Enterprise Track A · Project Udyam Digital', { x: 0.62, y: 4.58, w: 5.0, h: 0.2, fontSize: 8.5, color: 'F2C9C9' })
  T(s, [
    { text: 'Code  ', options: { bold: true } }, { text: 'github.com/ac265640/UdyamSync', options: { hyperlink: { url: REPO }, color: WHITE } },
    { text: '     Demo video  ', options: { bold: true } }, { text: 'watch (2 min 27 s)', options: { hyperlink: { url: VIDEO }, color: WHITE } },
  ], { x: 0.62, y: 4.8, w: 5.0, h: 0.22, fontSize: 9, color: WHITE })
  s.addNotes('Accel UdyamSync: digital-first acquisition and onboarding for MSMEs. Working prototype, business case, privacy design.')
}

// ============================================================== 2. Problem
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, '93 of every 100 interested businesses never get switched on', 'The case data (5,000 SMB leads, Apr–Jun 2026) shows the journey, not demand, is what breaks.')
  // Funnel as a native bar chart
  s.addChart(pres.charts.BAR, [{ name: 'Leads', labels: ['Lead', 'Contacted', 'Needs assessed', 'Quote accepted', 'KYC complete', 'Activated'], values: [5000, 3406, 1974, 861, 588, 368] }], {
    x: 0.4, y: 1.5, w: 4.3, h: 2.35, barDir: 'bar', catAxisOrientation: 'maxMin', chartColors: ['C9C1B3', 'C9C1B3', 'C9C1B3', 'C9C1B3', 'C9C1B3', RED], invertedColors: [], varyColors: true,
    showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 9, dataLabelColor: INK, dataLabelFontFace: BODY, dataLabelFormatCode: '#,##0',
    catAxisLabelFontSize: 9, catAxisLabelColor: MUTED, catAxisLabelFontFace: BODY, valAxisHidden: true, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: false, barGapWidthPct: 45, showTitle: true, title: 'SMB funnel, Apr–Jun 2026', titleFontSize: 10, titleColor: INK, titleFontFace: BODY,
  })
  const stats = [['17.6 days', 'from lead to live'], ['3 calls', 'customers chase status'], ['₹15,053', 'to win one customer'], ['9.6% vs 2.0%', 'activation with vs without a GSTIN']]
  stats.forEach(([n, l], i) => {
    const x = 4.95 + (i % 2) * 2.3, y = 1.5 + Math.floor(i / 2) * 1.15
    panel(s, x, y, 2.15, 1.0)
    T(s, n, { x: x + 0.15, y: y + 0.12, w: 1.9, h: 0.45, fontFace: HEAD, fontSize: 21, color: i === 2 ? RED : INK })
    T(s, l, { x: x + 0.15, y: y + 0.6, w: 1.9, h: 0.3, fontSize: 10, color: MUTED })
  })
  T(s, 'Where they leave, and what removes it', { x: 0.45, y: 3.92, w: 6, h: 0.25, fontSize: 11, bold: true })
  const leaks = [
    ['827', 'No time for a visit, or it was never scheduled', 'Self-serve advisor'],
    ['1,006', 'Price, a complex quote, or a slow one', 'OneBill: one line, instantly'],
    ['273', 'Missing or mismatched documents, paperwork, absent signatory', 'Smart KYC + remote e-sign'],
    ['56', 'Activations sold in breach of catalogue rules', 'Rules engine blocks them'],
  ]
  leaks.forEach(([n, why, fix], i) => {
    const x = 0.45 + i * 2.3
    T(s, [{ text: n + '  ', options: { fontFace: HEAD, fontSize: 15, color: RED } }, { text: why, options: { fontSize: 9, color: MUTED } }], { x, y: 4.2, w: 2.15, h: 0.62 })
    T(s, '→ ' + fix, { x, y: 4.84, w: 2.15, h: 0.25, fontSize: 9.5, bold: true, color: PEACOCK })
  })
}

// ============================================================== 3. Solution journey
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'From hello to a verified order in one sitting', 'Mobile-first web app (PWA), the same flow inside WhatsApp, and on a partner’s tablet. Every screen below is the working prototype.')
  const steps = [
    ['1  Discover', 'advisor.png', 'Three questions by text or voice in Hindi, Marathi, English (+7 via AI). A GSTIN fills half the answers from the registry.'],
    ['2  OneBill', 'onebill.png', 'Essential, Recommended or Pro on one monthly line. Add-ons toggle; branches get fibre or 5G AirFiber by pincode.'],
    ['3  Verify', 'kyc.png', 'Consent first, then photos read on our own server and checked against the GST and Udyam registries.'],
    ['4  Sign & track', 'tracker.png', 'Aadhaar e-sign (or a link to an absent signatory), UPI AutoPay, then a five-stage tracker with WhatsApp updates.'],
  ]
  steps.forEach(([h, img, body], i) => {
    const x = 0.45 + i * 2.3
    shot(s, A('crops/' + img), x + 0.05, 1.55, 2.05, 2.25)
    T(s, h, { x, y: 3.92, w: 2.15, h: 0.25, fontSize: 11.5, bold: true, color: INK })
    T(s, body, { x, y: 4.18, w: 2.15, h: 0.9, fontSize: 9, color: MUTED, lineSpacingMultiple: 1.05 })
  })
}

// ============================================================== 4. Smart KYC + privacy
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Smart KYC that explains itself, built for the DPDP Act', 'All 12 specimen applicants run through the real pipeline; every planted problem is caught and drawn where the OCR read it.')
  shot(s, A('crops/inspector.png'), 0.5, 1.55, 4.5, 3.5)
  T(s, 'What it caught', { x: 5.3, y: 1.52, w: 2.1, h: 0.25, fontSize: 11, bold: true })
  const caught = ['K01  cancelled GSTIN, blank Udyam no.', 'K02  7° tilted scan, auto-straightened', 'K04  blurred GST certificate', 'K05  Udyam certificate missing', 'K06  GSTIN typo (checksum), fix suggested', 'K07  business name edited vs registry', 'K11  utility bill 257 days old']
  T(s, caught.map((c, i) => ({ text: c, options: { bullet: false, breakLine: i < caught.length - 1 } })), { x: 5.3, y: 1.8, w: 2.15, h: 2.3, fontSize: 9, color: INK, paraSpaceAfter: 4 })
  T(s, '20+ checks: format, checksum, registry status, name and address match, 90-day bill, ID validity, signing authority, image quality.', { x: 5.3, y: 4.12, w: 2.1, h: 0.9, fontSize: 8.5, color: MUTED })
  panel(s, 7.6, 1.52, 1.95, 3.53, 'F2F7F7')
  T(s, 'Privacy by design', { x: 7.75, y: 1.62, w: 1.7, h: 0.25, fontSize: 11, bold: true, color: PEACOCK })
  const priv = ['Consent per purpose, hash-chained to the notice version', 'No Aadhaar number: DigiLocker and e-sign return yes + a reference', 'OCR on our server; no third-party AI sees documents', 'Encrypted at rest, purged 30 days after verification', 'Masked IDs in UI, API and logs', '“My Data”: view, export, withdraw, erase']
  T(s, priv.map((c, i) => ({ text: c, options: { bullet: { indent: 10 }, breakLine: i < priv.length - 1 } })), { x: 7.72, y: 1.92, w: 1.75, h: 3.05, fontSize: 8.5, color: INK, paraSpaceAfter: 5 })
}

// ============================================================== 5. Segments, bundles, partners
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Offices first, kirana at scale, partners in the deal', 'Segment economics from the case data decide the order; bundles below are priced live by the prototype’s engine.')
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK }, fontSize: 8.5 } })
  const rows = [
    [hdr('#'), hdr('Segment'), hdr('Share'), hdr('Conv.'), hdr('Bundle'), hdr('Churn'), hdr('Payback'), hdr('Play')],
    ['1', 'Professional offices', '25%', '11.1%', '₹6,575', '13.8%', '1.6 mo', 'Lead: self-serve + OneBill'],
    ['2', 'Micro retail', '54%', '4.1%', '₹2,470', '22.7%', '8.1 mo', 'Volume: WhatsApp, Essential'],
    ['3', 'Multi-site', '15%', '11.0%', '₹28,080', '10.8%', '0.6 mo', 'Advisor qualifies, field closes'],
    ['4', 'Manufacturers', '6%', '12.8%', '₹15,910', '8.1%', '1.0 mo', 'Experts + site survey'],
  ]
  s.addTable(rows, { x: 0.45, y: 1.52, w: 5.65, colW: [0.22, 1.18, 0.48, 0.5, 0.62, 0.5, 0.6, 1.55], fontFace: BODY, fontSize: 8.5, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.3, valign: 'middle', margin: [0.03, 0.05, 0.03, 0.05] })
  T(s, 'Example bundles from the engine', { x: 0.45, y: 3.38, w: 5, h: 0.25, fontSize: 11, bold: true })
  const b = [['Kirana, Nashik (Marathi)', '₹2,197', 'Fibre 100 · Postpaid · Cloud POS'], ['Dental clinic, Pune (Hindi)', '₹5,790', 'Fibre 300 · 2 lines · email, security, backup ×8'], ['3 restaurants, Pune', '₹11,376', '2 × fibre + 5G AirFiber · POS · CCTV · failover']]
  b.forEach(([n, p, d], i) => {
    const x = 0.45 + i * 1.9
    panel(s, x, 3.66, 1.78, 1.38)
    T(s, n, { x: x + 0.12, y: 3.74, w: 1.6, h: 0.3, fontSize: 9, bold: true })
    T(s, [{ text: p, options: { fontFace: HEAD, fontSize: 18, color: RED } }, { text: ' /mo + GST', options: { fontSize: 8, color: MUTED } }], { x: x + 0.12, y: 4.05, w: 1.6, h: 0.38 })
    T(s, d, { x: x + 0.12, y: 4.45, w: 1.6, h: 0.55, fontSize: 8, color: MUTED })
  })
  shot(s, A('crops/partner.png'), 6.3, 1.52, 3.25, 1.95)
  T(s, 'Partner Co-Pilot', { x: 6.3, y: 3.6, w: 3.2, h: 0.25, fontSize: 11, bold: true, color: PEACOCK })
  const pb = ['Leads the advisor can’t close arrive with the chat summary, ranked by a win-back model (AUC 0.73) and a next best action', 'Assisted mode on a tablet: the same flow at the counter, commission credited automatically', 'Partners fix KYC exceptions; the app never takes their customer']
  T(s, pb.map((c, i) => ({ text: c, options: { bullet: { indent: 10 }, breakLine: i < pb.length - 1 } })), { x: 6.3, y: 3.86, w: 3.25, h: 1.2, fontSize: 8.5, paraSpaceAfter: 4 })
}

// ============================================================== 6. Impact + metrics
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Replay the quarter: the same 5,000 leads, 2.4× the activations', 'Each drop reason is won back only by the feature that removes it, at cautious rates (10–50%). Every assumption is a slider in the app.')
  s.addChart(pres.charts.BAR, [
    { name: 'Today', labels: ['Contacted', 'Needs assessed', 'Quote accepted', 'KYC complete', 'Activated'], values: [68.1, 58.0, 43.6, 68.3, 62.6] },
    { name: 'UdyamSync', labels: ['Contacted', 'Needs assessed', 'Quote accepted', 'KYC complete', 'Activated'], values: [70.2, 72.7, 58.1, 80.1, 74.8] },
  ], {
    x: 0.4, y: 1.5, w: 4.6, h: 2.5, barDir: 'col', barGrouping: 'clustered', chartColors: ['C9C1B3', RED], showValue: true, dataLabelPosition: 'outEnd', dataLabelFontSize: 8, dataLabelColor: INK, dataLabelFormatCode: '0"%"',
    catAxisLabelFontSize: 8.5, catAxisLabelColor: MUTED, catAxisLabelFontFace: BODY, valAxisHidden: true, valAxisMaxVal: 100, valGridLine: { style: 'none' }, catGridLine: { style: 'none' },
    showLegend: true, legendPos: 't', legendFontSize: 9, legendFontFace: BODY, legendColor: INK, showTitle: true, title: 'Share of leads passing each stage', titleFontSize: 10, titleColor: INK, titleFontFace: BODY, barGapWidthPct: 60,
  })
  const hdr = (t) => ({ text: t, options: { bold: true, color: WHITE, fill: { color: INK } } })
  const m = [
    [hdr('Metric that matters'), hdr('Today'), hdr('Replayed'), hdr('Pilot target')],
    ['Lead → activation', '7.36%', '17.8%', '≥ 15%'],
    ['Days lead → live', '17.6', '8.6', '≤ 9'],
    ['Cost per activation', '₹15,053', '₹3,964', '≤ ₹5,000'],
    ['Status chase calls / customer', '3.0', '0.5', '≤ 0.5'],
    ['6-month churn', '15.2%', '5.9%', '≤ 8%'],
  ]
  s.addTable(m, { x: 5.25, y: 1.52, w: 4.3, colW: [1.75, 0.8, 0.85, 0.9], fontFace: BODY, fontSize: 9, color: INK, border: { type: 'solid', pt: 0.5, color: LINE }, fill: { color: WHITE }, rowH: 0.3, valign: 'middle' })
  const big = [['+521', 'more activations every quarter'], ['≈ ₹28 Cr', 'new annual recurring revenue'], ['56 → 0', 'rule-breaking sales']]
  big.forEach(([n, l], i) => {
    const x = 5.25 + i * 1.45
    panel(s, x, 3.48, 1.35, 1.0)
    T(s, n, { x: x + 0.1, y: 3.56, w: 1.2, h: 0.4, fontFace: HEAD, fontSize: 17, color: i === 2 ? LEAF : RED })
    T(s, l, { x: x + 0.1, y: 3.98, w: 1.2, h: 0.45, fontSize: 8.5, color: MUTED })
  })
  T(s, 'Churn falls because it tracks chase calls in the data: 1 call → 5.9% churn, 5 calls → 27.9%. The tracker removes the calls.', { x: 0.45, y: 4.12, w: 4.5, h: 0.4, fontSize: 9, color: MUTED })
  T(s, 'Unit economics: platform cost ≈ ₹40 per lead (AI, OCR, hosting); field and partner effort refocuses on leads the advisor hands over.', { x: 0.45, y: 4.56, w: 9.1, h: 0.4, fontSize: 9, color: MUTED })
}

// ============================================================== 7. Architecture, rollout, risks, links
{
  const s = pres.addSlide({ masterName: 'CONTENT' })
  title(s, 'Built to ship: architecture, rollout and risks', 'The AI talks, the rules engine decides. Mocks sit behind production interfaces, so the pilot swaps adapters, not logic.')
  s.addImage({ path: path.resolve(__dirname, '../../docs/architecture.png'), x: 0.45, y: 1.5, w: 4.75, h: 2.67 })
  T(s, 'Rollout', { x: 5.45, y: 1.48, w: 4.1, h: 0.25, fontSize: 11, bold: true })
  const ro = [['0–90 days', 'Pilot in Pune and Jaipur: professional offices on web, 20 partners in assisted mode, real DigiLocker and e-sign'], ['3–6 months', 'Six cities; micro retail on WhatsApp; GSP registry APIs, NPCI AutoPay'], ['6–12 months', 'All tier 1–2 cities; multi-site and manufacturing routed to field sales via the Co-Pilot']]
  ro.forEach(([w, d], i) => {
    T(s, [{ text: w + '  ', options: { bold: true, color: RED } }, { text: d, options: { color: INK } }], { x: 5.45, y: 1.74 + i * 0.42, w: 4.1, h: 0.4, fontSize: 8.5 })
  })
  T(s, 'Risks and how the design handles them', { x: 5.45, y: 3.04, w: 4.1, h: 0.25, fontSize: 11, bold: true })
  const rk = ['Wrong AI answer → prices and eligibility only from the catalogue; 30-scenario eval in CI', 'Partner pushback → leads and commission flow to them', 'Document fraud → registry checks + human exception queue', 'Data breach → minimisation, encryption, 30-day purge, audit log']
  T(s, rk.map((c, i) => ({ text: c, options: { bullet: { indent: 10 }, breakLine: i < rk.length - 1 } })), { x: 5.45, y: 3.3, w: 4.1, h: 0.95, fontSize: 8.5, paraSpaceAfter: 2 })
  panel(s, 0.45, 4.32, 9.1, 0.72, 'F2F7F7')
  T(s, [
    { text: 'Code  ', options: { bold: true } }, { text: 'github.com/ac265640/UdyamSync', options: { hyperlink: { url: REPO }, color: PEACOCK } },
    { text: '      Demo video  ', options: { bold: true } }, { text: 'watch (2 min 27 s)', options: { hyperlink: { url: VIDEO }, color: PEACOCK } },
    { text: '      Showcase  ', options: { bold: true } }, { text: 'ac265640.github.io/UdyamSync', options: { hyperlink: { url: SITE }, color: PEACOCK } },
  ], { x: 0.6, y: 4.4, w: 8.8, h: 0.25, fontSize: 9 })
  T(s, 'Stack: FastAPI · React + Vite · GSAP · RapidOCR (ONNX) · scikit-learn · SQLite · Docker · GitHub Actions. ₹0 to run: offline rules and templates by default, optional free Gemini/Groq key.', { x: 0.6, y: 4.68, w: 8.8, h: 0.3, fontSize: 8.5, color: MUTED })
}

pres.writeFile({ fileName: path.resolve(__dirname, '../UdyamSync_Submission.pptx') }).then((f) => console.log('wrote', f))
