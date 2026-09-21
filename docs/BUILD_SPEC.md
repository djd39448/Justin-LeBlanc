# Build specification — private event booking and invoicing demo

Version 1.0 | 2026-09-21 | Owner: Dave Dobbins | Client: Justin LeBlanc

## 1. Outcome

Deliver a working, polished demo at **https://justinleblancmusic.50by50.dev** in a separate
deployment. Preserve the blue musician/guitar identity of Justin's current website while
making private-event inquiries the main conversion. This is a complete implementation of
the agreed redesign and workflows, not a static concept or a replacement brand.

Prove one continuous journey: a visitor learns about Justin, asks questions through chat
or voice, supplies gig requirements, receives a provisional estimate, books a consultation
and tentative event hold, receives invitations, and triggers a one-page operator brief.
After the consultation the operator confirms the performance. At 08:00 America/Chicago, the
morning job treats an app-tagged confirmed Calendar performance that ended on the prior local
date as played, then issues the agreed invoice to the client with an operator BCC.

## 2. Settled constraints

- Independent private repo: `https://github.com/djd39448/Justin-LeBlanc`.
- Domain: exactly `justinleblancmusic.50by50.dev`; do not replace the 50by50 root site.
- Reuse Dave's TrustCore Gmail/calendar through isolated adapters and tagged records.
- New Retell-managed demo number + separate Justin agent in Dave's existing Retell account.
  No Telnyx setup or changes; no rebinding existing numbers.
- Chat uses an existing authorized OpenAI API key server-side. The user has selected reuse;
  don't ask reuse-versus-new again. Inspect available credentials without revealing them.
- Voice and chat use the same approved business KB and backend tools.
- Demo assumptions are allowed. They must never be presented as Justin-approved policies.
- Public performances are a secondary way to hear him before booking.
- No real customer campaigns, payment collection, contracts, or mass outreach in this build.
  Include campaign-ready landing copy, tracking and drafts, not ad buys or auto-posting.

## 3. Audiences and conversion

Primary: hosts of private parties, weddings, corporate gatherings, celebrations, and private
venue events in the Houston area. Main action: **Check your date & plan your event**.
Secondary assistance: **Ask a question** and **Talk to the booking assistant**. A visitor may
submit an inquiry without completing an AI conversation or knowing every technical detail.

Conversion means an accurate qualified inquiry and consultation, not an AI promise that a
performance is contracted. Separate tentative holds, confirmed bookings and delivered shows.

## 4. Required web design research before coding the page

The design worker MUST browse Justin's current site and 3–5 comparable musician/private-event
sites. Start with `docs/RESEARCH.md`, then inspect actual pages at mobile and desktop sizes.
Write `docs/design-research.md`: dated URLs, observations, useful patterns, patterns rejected,
and concrete decisions for this site. Gather evidence for hierarchy, sample media, packages,
CTA placement, form friction, trust elements and accessibility. Do not clone another site's
copy, brand, code or photography. Research is a design input, not permission to rebrand Justin.

Capture a baseline of Justin's blue palette, guitar image, name treatment and overall feel.
Prefer authentic existing assets with recorded provenance; don't invent performance footage.
If an asset cannot be retrieved or its reuse is unclear, use an honest placeholder in dev and
report the specific gap; don't substitute an unrelated musician. Social access failures are
research gaps, not evidence of inactivity.

## 5. Information architecture and visual requirements

Homepage order:
1. Compact header: Justin LeBlanc, private events, hear me live, FAQs, primary booking CTA.
2. Blue photographic hero with concise private-event value proposition, Houston service-area
   wording supported by sources, visible primary CTA above the fold, and readable text overlay.
3. What the music can add to an event; event categories without unsupported format claims.
4. Authentic listen/watch samples and credited evidence. No autoplay audio. Lazy-load embeds.
5. Demo package examples or estimate guidance, visibly provisional; never silently imply a quote.
6. How it works: tell us about your event -> consultation + tentative hold -> confirmation.
7. Discovery form with assisted chat/voice entry points.
8. Smaller **Hear Justin live before you book** schedule; link to current source, show dates,
   venue, time and timezone. Say free only for verified no-cover shows and explain venue terms.
9. FAQs, contact options, social links, privacy, small demo identification.

Supporting routes: `/plan-your-event` (conversion deep link), `/hear-live`, `/faq`, `/about`,
`/privacy`, `/reference` (human-readable agent reference), `/admin` (authenticated operator).
Reuse sections rather than duplicate facts. Keep navigation short. Do not add filler SEO articles.

Visual style: retained rich blue/navy + light neutral reading panels, restrained typography,
authentic portrait/guitar imagery, generous but efficient spacing. Restore strong navigation
contrast. Avoid enormous empty hero space, generic SaaS styling and intrusive floating widgets.
Keep the primary CTA reachable with one hand on phones; chat must not obscure form controls.

## 6. Discovery form and progressive qualification

Campaign-ready deliverables: draft three private-event messages (celebration, corporate reception,
wedding inquiry) with matching Facebook/Instagram caption and landing-page headline, CTA and UTM
scheme. Ground claims in the KB; distinguish demo prices. Save to `docs/campaign-drafts.md` during
build. No publication, account connection, budget spending or automatic social posting in this demo.
Track inquiry submitted, consultation scheduled, hold created and show confirmed without PII.

Three short steps with save/resume token, progress indicator, back navigation, inline validation,
and final summary edit. Accessible non-JavaScript inquiry fallback where feasible.

| Group | Required to submit | Optional / follow-up detail |
|---|---|---|
| Contact | Name, email, preferred reply method | Phone (required if phone consult), company, planner role |
| Occasion | Event type, date or flexible-date choice, city | Venue name, full address, indoor/outdoor, guest count |
| Timing | Approximate performance start/end or duration, timezone | Guest arrival, load-in, soundcheck, breaks, hard curfew |
| Music | Desired atmosphere | Genre/song requests, ceremony/cocktail/dinner moments, MC duties |
| Production | Known/unknown equipment needs | PA/microphone, venue sound contact, power, stage/space, weather cover |
| Access | Known/unknown access constraints | Stairs/elevator, parking, load-in distance, security/vendor check-in |
| Commercial | Budget range or unsure | Billing entity, billing email/address, PO, insurance/COI requirements |
| Other | Consent to requested follow-up | Special requests, accessibility, planning notes |

Do not require complete billing or venue technical information to capture a lead. Require missing
billing fields before an invoice can be issued. Marketing opt-in is separate and unchecked.
Store unknowns explicitly; never have an assistant fabricate answers to finish a form.

## 7. Voice and chat

Warm, concise booking assistants that discover the occasion, connect relevant verified benefits,
answer accurately, handle objections, and offer the next step without pressure. Identify as AI.
Use a dedicated voice identity, not a cloned Justin voice. Voice read-back of email/date/time and
price must allow correction. Recording/transcript policy must be explicitly configured and disclosed;
do not assume a generic sentence establishes legal compliance.

Both expose the tools in `docs/ARCHITECTURE.md`, sharing identity, pricing policy, availability,
booking state and KB release. Chat resumes an inquiry via secure token; phone attaches only after
verified association, not caller ID alone. No arbitrary inbox/calendar queries or public admin tools.
Answers unavailable in the KB become a captured question for Justin. Estimates carry demo caveats.
Never invent scarcity, satisfied clients, credentials, song repertoire, prices or confirmed dates.

## 8. Calendar and email

Implement `docs/WORKFLOWS.md`: consultation and separate tentative show hold, invited attendees,
manual post-consultation confirmation, status changes, reschedule/cancel, expiry, conflict checks,
and retry-safe email/calendar writes. Show customer-facing consultation and event times in Central
Time (`America/Chicago`) with daylight-saving-aware conversion.
Reuse existing TrustCore behavior after inspecting current source; old docs aren't live proof.
Never call the family-only calendar function or weaken its protections for public visitors.

Email operator a clean one-page brief, accessible HTML and PDF using the same data/template.
Required fields and visual rules are in `docs/DOCUMENT_DESIGN.md`.

## 9. Post-show invoicing

Implement the deterministic 08:00 America/Chicago Calendar reconciliation, prior-end-date and
seven-day catch-up rules, customer DB lookup, agreed-price snapshot, invoice generation and client
email with operator BCC. Only an app-tagged confirmed performance with matching canonical records,
an agreed quote and complete billing metadata is eligible. Skip consultations, tentative/cancelled,
all-day, untagged/unparseable, unknown-show and already-invoiced events. Route a known confirmed show
with missing billing/quote data or mismatched Calendar times/price to review without issue. See
`docs/WORKFLOWS.md`; reply email is not a prerequisite for current-policy invoicing.

## 10. Mobile and agentic discoverability

Semantic initial HTML with clear headings, real links and readable service/FAQ content. No essential
knowledge locked in canvas, images, client-only rendering or chat. Accurate title/description,
canonical, sitemap and verified structured data matching visible facts. Person/Service and verified
public MusicEvent entities as appropriate; no invented reviews, offers or private-calendar details.
`/reference` and optional `/llms.txt` summarize scope, area, booking process, limitations, sources and
last review date. These aid readability; they don't guarantee ranking or agent recall.

Demo is `noindex` (including PDFs/private routes) to avoid competing with Justin's real site while
showing the complete search-ready implementation. Indexability is a single documented launch switch.
Never place private records in sitemap, structured data, KB, public assets or analytics.

Test 360/390/768/1280/1440 px, keyboard and touch, readable 16px form text, >=44px touch targets,
WCAG AA contrast, focus visibility, reduced motion, loading and error states. Target mobile LCP
<=2.5s, CLS <=0.1 and Lighthouse accessibility >=95; record measured lab conditions, don't claim
field metrics. Optimize hero formats/sizes and defer third-party embeds.

## 11. Operator surface and demonstration

Authenticated dashboard: inquiries, pending holds/consultations, confirmed shows, invoices and
delivery errors. Each record has timeline and next action. Controls: confirm, reschedule, cancel,
amend agreed quote, preview brief, run morning invoicing now, inspect invoice, reconcile/retry.
Old performer-reply records may remain visible only as clearly labeled legacy reconciliation.
Feature-complete CLI for the same business operations with `--help`, `--json`, dry-run and audit IDs.
Seed a synthetic client and completed show to demonstrate billing immediately without waiting a day.
Time simulation must be demo-only and conspicuous; it must never alter real calendar history.

## 12. Definition of done

All acceptance rows in `docs/ACCEPTANCE.md` pass with evidence. Hosted HTTPS demo, mobile QA,
actual Retell and chat sessions, both calendar entries/invitations, delivered brief, calendar-driven
invoice received by test client and BCC operator, replay protection and no TrustCore
resource changes. Commit/push code, migrations, source manifest, agent config, tests, runbooks,
sanitized evidence, demo script and handoff. A mocked-only run is partial completion and must be
reported as such, with the specific live dependency and completed work clearly separated.
