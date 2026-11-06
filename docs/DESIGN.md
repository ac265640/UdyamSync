# UdyamSync — Design brief

Written from the taste-skill and impeccable design principles, applied to this product.

## Who and where
A shop owner, clinic manager or partner agent in a tier-1/2 Indian city, on a mid-range Android phone, in daylight, between customers. Partners use a tablet at the counter. Judges see it on a laptop first.

## The world: the merchant's khata
Before apps, Indian business ran on the **bahi-khata** (cloth-bound ledger), the **rubber stamp**, the **counter receipt** and the **railway split-flap board**. These artefacts are what "trustworthy paperwork" already looks like to our audience, so the product borrows their grammar instead of a generic SaaS dashboard:

| Artefact | Where it shows up |
|---|---|
| Ledger page (ruled lines, red margin rule, tabular figures) | OneBill — the quote is a khata entry, one total line |
| Rubber stamp (*सत्यापित / VERIFIED*) | Smart KYC verdict — stamped, not toasted |
| UPI "slide to pay" | Placing the order |
| Split-flap station board | The before → after numbers (the page's one count) |
| WhatsApp thread | The advisor's natural home |

## Tokens
- **Ground** paper `#F6F1E7`, **surface** `#FFFDF8`, **line** `#E4DCCB`, **ink** `#1B1A17`, **muted** `#5F584C` (≥4.5:1 on paper).
- **Brand (Accel, case universe):** peacock `#0F5E6E` with haldi `#D9950B` for small highlights. **Airtel theme:** `#E40000`. Never violet.
- **Khata red** `#B4232A`, used only for the ledger margin rule and the stamp.
- **Type:** Fraunces (display, soft optical sizes) + Tiro Devanagari Hindi (Devanagari display); Onest (UI/body) + Mukta (Devanagari body). Tabular numerals for every price. All self-hosted.
- **Radius** 14px for cards, pills only for small controls. One shadow: `0 1px 2px rgb(27 26 23 / .06), 0 8px 24px -12px rgb(27 26 23 / .18)`.

## Motion (GSAP + Lenis + Motion)
- Hero text is present on the first frame. No loader, no fade-in on every section.
- **One timed loop:** the hero phone plays a real advisor conversation, cycling Hindi → Marathi → English, pausable.
- **Two scroll moments, each inside its own section:** a statement whose words ink in as you scroll (React Bits ScrollReveal), and pinned chapters where the phone swaps Discover → OneBill → Verify → Track (GSAP ScrollTrigger, sticky).
- **One count:** split-flap board for before → after.
- **Hover layer everywhere:** buttons step 1px and press 0.985, linked cards lift 2px, links draw an underline. Ease `cubic-bezier(.2,.8,.2,1)`, no bounce.
- **Delight only at real moments:** the stamp lands when KYC verifies; slide-to-pay commits the order.
- Lenis smooth scroll is on for fine pointers and off under `prefers-reduced-motion`. Every moment has a finished still for reduced motion and phones.

## Bans we hold ourselves to
No eyebrow labels, no gradient text, no glassmorphism, no identical icon-card grids, no hero metric tiles, no emoji as icons, no glow halos, and no grid or stripe backgrounds except the actual ledger page. Browser surfaces (selection, caret, scrollbar, focus ring) are themed.

## Modes
The landing page is **Persuade**: full commitment. The owner app, Partner Co-Pilot, Insights and Inspector are **Operate**: precision and restraint, with the same tokens.
