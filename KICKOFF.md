# Kickoff — Justin LeBlanc round-two brand and conversion build

Paste everything below the divider into a clean coding session.

---

Implement and verify the round-two Justin LeBlanc Music brand/conversion refresh in the private
repository `djd39448/Justin-LeBlanc`. The expected audited base is clean `origin/main` at
`5d664bb4e51b198ae3dc0768154a1a86a29817a4`; fetch first, and if `origin/main` has advanced,
inspect and reconcile the new commits before editing. Create a feature branch named
`codex/justin-round-two`; do not work directly on `main`.

Read `AGENTS.md` completely, including its Switchboard rule. Then read `README.md`, `PROGRESS.md`,
`docs/HANDOFF.md`, `docs/ROUND_TWO_BUILD_SPEC.md`, `docs/BUILD_SPEC.md`, `docs/DECISIONS.md`,
`docs/ARCHITECTURE.md`, `docs/WORKFLOWS.md`, `docs/INTEGRATIONS.md`, `docs/ACCEPTANCE.md`, and
`docs/RUNBOOK.md`. The round-two spec supersedes the older public information architecture,
assistant presentation, public pricing, and discovery-form details. It does not supersede the
existing booking, Calendar hold, email, invoice, outbox, authentication, noindex, allowlist, or
provider-isolation requirements. Treat dated evidence as historical; never rewrite it to claim the
new round is already live.

Run `npm run verify` before editing and record the baseline. The current documented baseline is 103
tests in 19 files, lint/typecheck clean, 20 Astro files with zero diagnostics, and nine built pages.

Submitting this kickoff authorizes local implementation, tests, feature-branch commits/pushes,
read-only verification of an exact owner-confirmed Public Shows Calendar, and reversible deployment
to the existing Justin demo API and Cloudflare Pages resources after the gates below pass. It
authorizes setting/enabling only the new public-events configuration when that Calendar and
sufficient existing read access are already confirmed. It does not authorize creating, sharing,
deleting, moving, copying, or editing Calendars/events; broadening OAuth scopes or granting new
credentials; merging to `main`; changing DNS, Retell, mail, billing, payment, or unrelated
resources; or sending real customer communications. If a new Calendar, consent grant, scope, or
credential is required, deploy the tested feature disabled and report the exact owner action.

## Primary outcome

The homepage must prioritize the visitor who is ready to pay for an event. That visitor must see
and be able to use the booking form immediately from the opening experience. Do not gate the form
behind a CTA, modal, accordion, menu choice, or route change.

“Immediate booking” means the visitor can submit the inquiry and continue through the existing
consultation/tentative-hold flow on the homepage. It does not bypass availability, personal review,
the consultation, agreed quote, or authenticated confirmation, and it does not collect payment.

## Homepage and navigation

Use this order:

1. Persistent top navigation.
2. Opening hero/conversion block with the inline event planner already visible.
3. Event-category rail.
4. Where I'm Playing, populated from the live public-performance Calendar feed.
5. Listen.
6. Follow / Meet Justin.
7. Personalized FAQ.
8. One short closing link/CTA back to the opening planner; do not render a duplicate form.
9. Footer.

The header must stay pinned to the viewport top at every scroll position on desktop and mobile. Use
a stable sticky/fixed implementation with safe-area handling, a reliable z-index, and an opaque or
sufficiently blurred dark background. Add scroll offsets so the header never covers anchor targets,
form errors, or focused controls. Verify it after scrolling more than two viewport heights.

Primary navigation:

- `LISTEN` → `/#listen`
- `FOLLOW` → `/#follow`
- `FAQ` → `/faq/`
- `PLAN YOUR EVENT` → the opening planner (`/#plan-your-event` from other routes)

Keep Plan Your Event visually distinct. Every navigation target needs a visible hover/focus/current
state and at least a 44px hit area. If links collapse into a mobile menu, expose `aria-expanded`,
close on Escape and link activation, restore focus appropriately, and prevent focus from entering
hidden links. Use a header-height-plus-16px offset for anchors, validation summaries, and controls
focused after an error. Remove the visible demo notice bar.

At 1440×900, the initial viewport must contain Justin's identity/value proposition, planner heading,
and first-step name/email controls. At 390×844, the planner heading and first labeled input must be
fully visible in the opening viewport with no intervening section or reveal action.

Keep `/plan-your-event/` as a focused campaign/direct-link route, using the same planner component
and contracts; its H1 is `Plan Your Event`. The closing homepage link scrolls to and focuses the
opening planner heading, without creating a second form or moving focus during ordinary page load.

## Hero and brand presentation

- The only H1 is `Justin LeBlanc`, visually displayed as `JUSTIN LEBLANC`.
- Use this exact line: “A polished, personable performance shaped around your room, your guests,
  and the moments they’ll remember.”
- Keep Justin/photo visually left and copy right-aligned/lower in the composition. His face must be
  unobstructed, and the top crop must sit slightly above—not through—his head.
- Remove `Hear Justin First` and the public image-source link.
- Blend the hero into a near-black/dark navy background without a visible seam.
- Use restrained static tonal texture. Disable optional motion under `prefers-reduced-motion`.
- Do not fabricate or show a placeholder logo. Wait for Justin's real static and animated assets.

Immediately after the opening conversion block, display:

`PRIVATE GATHERINGS · CELEBRATIONS · CORPORATE RECEPTIONS · WEDDING INQUIRIES`

Use four evenly distributed items on wide screens and a legible 2×2 mobile layout.

## Inquiry form

Preserve the accessible three-step/resume behavior, but place the beginning of the planner directly
in the opening conversion experience.

Preferred Reply must use:

- `email` → Email; phone optional.
- `text` → Text; phone required.
- `phone` → Phone Call; phone required.

Email remains required for every inquiry. Text is a stored human follow-up preference only; do not
implement or promise automated SMS.

On page three:

- Remove the visible Booking Time Zone field while continuing to submit `America/Chicago`.
- Keep concise Central Time guidance beside actual scheduling controls.
- Rename `Music or event-moment requests` to `Special Requests (optional)` while retaining the
  `musicRequests` key.
- Equipment choices must be `Not sure yet`, `Venue provides PA`, and `PA required`.
- Remove Venue Access from the UI while continuing to submit `access: "unknown"`.

Replace the budget-range dropdown with an optional numeric input labeled
`Estimated budget (USD, optional)`.

- Use `type="text"` with `inputmode="decimal"`. After trimming outer whitespace, accept only
  `^(?:0|[1-9][0-9]*)(?:\.[0-9]{1,2})?$` and at most `$99,999,999.99`. Accept `0`, `750`, `750.5`,
  and `750.50`; reject `.50`, `1.`, `+1`, commas, currency symbols, exponents, negatives, leading
  zeros, and over-limit values.
- Add `budgetCents: number | null` to the inquiry JSON contract, defaulting to `null`, and normalize
  dollars by splitting/padding decimal digits, never floating-point multiplication.
- Keep the legacy `budget` field readable for old records. A resumed legacy range appears as
  read-only context with the numeric field blank and remains unchanged if the visitor does not edit
  budget. Entering a number sets `budgetCents` and legacy `budget: "unsure"`; brand-new web
  submissions also set `budget: "unsure"`.
- A resumed record with `budgetCents` pre-fills its formatted number. Editing replaces the cents;
  intentionally clearing it stores `budgetCents: null` and legacy `budget: "unsure"`.
- Render a supplied amount naturally in the private event brief.
- Never use the visitor's budget as an estimate, agreed quote, deposit, invoice amount, or charge
  authorization.

Update shared contracts, form payload construction, assistant intake schemas that share the inquiry
type, brief formatting, admin display if applicable, fixtures, and tests. Existing `email`/`phone`
and legacy budget records must still parse and resume. No SQL migration should be needed because
the payload is stored as JSON.

Dormant voice/chat channels keep their legacy budget behavior and send `budgetCents: null` when
absent; do not change their prompts/tools. For `text` or `phone`, server and browser validation must
attach a missing-phone error to the phone control, including for resumed drafts.

Deploy the additive `text` and `budgetCents` API contract before any frontend that submits them. If
the frontend rolls back, retain the additive API schema.

## Live public-performance Calendar

Replace the external-link-only schedule with actual upcoming public venue performances pulled
server-side from a live Google Calendar.

Use a dedicated Calendar in Justin's working Google Calendar account, named approximately
`Justin LeBlanc — Public Shows`, configured by the exact private variable
`PUBLIC_EVENTS_CALENDAR_ID`. First determine whether the Calendar currently used by Justin's
existing `/events` page is already public-performance-only and addressable by exact ID. If it is,
use it. If it mixes public and private events, finish the code against an exact dedicated-calendar
configuration, leave the feature disabled, and report the owner action needed to create/select and
populate Public Shows. Never create or reclassify provider data under this kickoff.

Calendar membership is the public/private distinction:

- Public venue performances go on Public Shows.
- Consultations, weddings, corporate events, private gatherings, holds, and booking records stay
  on the existing private Calendar and are never read by this feature.
- If a public performance also needs private operational tracking, keep a canonical private record
  and create a separate sanitized public listing.
- Never infer publication from title text, description, color, attendees, location, event
  visibility, or keywords.

Do not read from or fall back to `SHOW_CALENDAR_ID`, `FREE_BUSY_CALENDAR_IDS`, `primary`, or a
discovered Calendar. Never accept a Calendar ID or arbitrary time window from the browser.

Build a separate read-only `PublicEventsCalendarReader` plus `GET /api/public-events`:

- Add `PUBLIC_EVENTS_ENABLED=false`, exact `PUBLIC_EVENTS_CALENDAR_ID`,
  `PUBLIC_EVENTS_TIMEZONE=America/Chicago`, and a backed-up random server-only
  `PUBLIC_EVENTS_ID_SECRET` of at least 32 bytes outside Git.
- Query only now through 180 days from the exact Calendar with `singleEvents=true`,
  `showDeleted=false`, chronological order, page size 250, no more than four pages, and at most 100
  published events. Publish the earliest 100 if more eligible events occur within four complete
  pages. A fifth page fails the refresh rather than publishing a silent partial result.
- Prefer the existing `calendar.app.created` grant if the selected secondary Calendar was created
  by this app and access is proven sufficient. Never broaden OAuth scopes silently. If different
  credentials/scopes are required, stop and report the exact approval needed.
- Coalesce refreshes, use an eight-second end-to-end provider timeout, retry 429/5xx once inside that
  deadline but never retry 401/403, cache a fully sanitized success for five minutes, and serve it
  stale for at most 24 hours. Replace atomically and never cache a partial failed fetch. Do not call
  Google once per visitor.
- HTTP 200 represents a fresh/stale projection; a successful zero-event fetch is fresh and empty.
  Disabled/missing config, no usable cache, expired stale data, or over-bound pagination returns
  HTTP 503 with `Cache-Control: no-store`, `Retry-After: 300`, and exactly
  `{ "error": "public_events_unavailable", "message": "Current dates are temporarily unavailable." }`.
  Never return provider diagnostics or fall back to unfiltered events.

Provider mapping is deliberately conservative:

- Accept only timed `confirmed` events with default/absent `eventType`, non-private/non-confidential
  visibility, valid later end, non-empty summary, and non-empty location. Exclude all-day,
  cancelled/tentative, out-of-horizon, and individually malformed events with redacted counts only.
  A malformed provider envelope or incomplete pagination fails the whole refresh.
- Map trimmed/whitespace-collapsed `summary` to a 1–120-character plain-text `title` and
  `location` to a 1–160-character plain-text `venue`. Calendar editors must put only a publishable
  venue-plus-city/region string in location; omit `city` in v1 instead of parsing an address.
- Before enabling, privately review every in-horizon location with the owner. A street address,
  residence, or ambiguous/private location blocks that event until its controlled Public Shows
  entry is corrected; do not automate address redaction.
- Use valid `start.timeZone`, otherwise `PUBLIC_EVENTS_TIMEZONE`; preserve RFC 3339 instants.
- Generate `id` as `pe_` plus the first 22 base64url characters of HMAC-SHA-256 using
  `PUBLIC_EVENTS_ID_SECRET` over the version, exact Calendar ID, and event identity/original
  recurrence start separated by NUL bytes. Never expose the inputs.
- Omit `sourceUrl` in v1; never derive it from Google `htmlLink`, descriptions, attachments, or
  extended properties.
- `lastUpdated` is the UTC instant of the most recent complete successful provider refresh and does
  not advance while serving stale data.

Return only this type of sanitized data:

```ts
type PublicEvent = {
  id: string; // opaque hash, not provider ID
  title: string;
  venue: string;
  city?: string;
  start: string;
  end: string;
  timezone: string;
};

type PublicEventsResponse = {
  events: PublicEvent[];
  status: 'fresh' | 'stale';
  lastUpdated: string;
};

type PublicEventsUnavailable = {
  error: 'public_events_unavailable';
  message: 'Current dates are temporarily unavailable.';
};
```

Never return or cache raw descriptions, attendees, organizer/email, conferencing, attachments,
Calendar IDs, Google event IDs/htmlLink, extended properties, customer/booking/show IDs, prices, or
internal notes. Cache only the sanitized DTO and cache metadata.

The homepage must render accessible loading, populated, empty, stale, and unavailable states with
semantic `<time>` values. Do not render the old external-events link as a substitute or API-failure
fallback.

Add a multi-calendar test where private wedding/corporate/consultation/hold events exist only on
forbidden sources and eligible/cancelled/malformed events exist on Public Shows. Prove only the exact
public ID is queried and only its eligible event is emitted. A valid event deliberately entered on
Public Shows is public regardless of its title; never pretend keyword filtering protects privacy.
Also cover recurrence, cancellation, cross-midnight/DST, bounds, sanitization, cache refresh/stale
expiry, timeout, 401/403/429/5xx, and proof that discovery/write endpoints are never called.

## Remove all public AI presentation; preserve the implementation

The public website must contain neither chatbot nor voice-assistant UI in this round.

Remove from rendered public pages and browser output:

- `ChatPanel` and `VoicePanel` markup/scripts.
- Chat/voice CTAs, help sections, phone number, `tel:` links, availability calls, and all explanatory
  or marketing references in Home, Plan, FAQ, Privacy, Reference, metadata, sitemap, and `llms.txt`.
- Any public health/config field that exposes the Retell phone number while the public UI is off.

Preserve every underlying pipe:

- Retell agent, LLM, number, tools, KB, webhooks, signatures, identities, limits, allowlists, private
  manifests, and provider configuration.
- Voice/chat routes, handlers, domain operations, environment variables, health checks needed by
  operations, and backend tests.
- Dormant UI component source if it does not enter public output.
- Internal estimate/pricing behavior used by dormant assistants and historical tests.

Do not reprovision Retell, change the voice KB/tool set, remove `estimate_event`, disable the voice
runtime, or delete the phone-number configuration. This is a website-presentation change only.

Keep public `/api/health`, but remove its `demoVoicePhoneNumber` field. Private config/manifests
remain the operational source for the number. Do not change the reachability, authentication, or
gates of preserved chat/voice API routes under this presentation-only change.

Add a built-output audit proving public HTML, JS, metadata, sitemap, `llms.txt`, and reference files
contain no voice-assistant wording, phone number, `tel:` URL, VoicePanel markup, chatbot UI, or
assistant marketing copy. Backend voice health, signed-webhook, tool, KB-identity, and provider
configuration tests must remain passing.

## Remaining public content

- Rename visible `Hear Justin` language to `Listen`; use only approved/authentic media and no
  autoplay.
- Combine `apps/web/src/assets/justin-portrait.png` and
  `apps/web/src/assets/justin-playing-guitar.png` with the existing verified social URLs in
  `apps/web/src/content.ts` under `Follow`.
- Rewrite FAQs in Justin's concise first-person voice without inventing policies, repertoire,
  prices, availability, response times, testimonials, production capabilities, or credentials.
- Remove public package/demo-price cards. A visitor-entered budget is not published pricing.
- Remove customer-facing engineering language while retaining this concise disclaimer:
  `Sending this form starts a conversation; it does not confirm your date.`
- Keep internal admin/runbook/evidence language, provider safety labels, noindex, and security
  headers accurate.
- Render three to five homepage FAQs from the same content data as `/faq/`; the full FAQ route is
  canonical, and answers must not diverge.

## Testing and evidence

Add or update automated coverage for:

- Immediate visible/useful homepage planner with no reveal action.
- Persistent navigation after long scroll and correct anchor/focus offsets.
- Exact hero/name/category/nav text and homepage section order.
- `text` and `budgetCents` contract validation, persistence/resume, backward compatibility, and
  brief output.
- Public Calendar privacy/filtering/recurrence/cache/failure behavior.
- Absence of all public chat/voice UI, phone-number, pricing-card, and banned engineering language.
- Existing booking, assistant backend, Calendar booking, billing, and provider-isolation tests.

Add Playwright coverage and screenshots at 360, 390, 768, 1280, and 1440 widths. Manually verify
hero face crop, initial form visibility, pinned header, mobile menu, keyboard order, form errors,
Calendar states, and no horizontal overflow. Verify one H1 per route, logical headings, visible
focus, 44px targets, 16px form text, AA contrast, and reduced motion.

Run `npm run verify`, the new browser tests, public-output privacy/copy audit, and secret scan. Record
commands and exact results.

## Deployment boundary

Finish and commit local code/tests first. The authoritative SQLite state, credentials, services,
worker, and provider manifests remain on the Windows host. Never copy private state to the Mac or
start a competing worker.

Before deployment, record the current runtime commit/config manifest and Pages deployment ID as
rollback targets. Do not mutate Calendar/provider resources. If another machine/session must be
contacted, read and follow the Switchboard playbook first.

Deploy in this order:

1. Deploy the additive inquiry contract and public-events code to the Windows runtime with
   `PUBLIC_EVENTS_ENABLED=false`.
2. Recheck existing web/booking/voice/chat/billing behavior.
3. If and only if the exact Calendar and sufficient existing access are owner-confirmed, configure
   its ID/timezone/ID secret privately, enable the reader, warm the cache, and verify sanitized
   fresh/stale/empty/503 states while the old frontend remains live. Otherwise leave it disabled and
   report the exact needed owner action.
4. Deploy the frontend to Cloudflare Pages project `50by50-justinleblancmusic` only after the enabled
   endpoint passes. Do not deploy a broken calendar dependency; keep the old frontend when disabled.
5. Verify routes, noindex/security headers, inline form, persistent nav, public-only events,
   protected admin, and absence of all public AI/phone output.

Do not modify Retell, its KB/tools/number, unrelated Google Calendars, DNS outside the existing
Justin host, TrustCore mail, or other provider resources.

If runtime/provider coordination is unavailable, finish the local implementation and return exact
deployment commands, expected checks, config names, and the precise external blocker. Never claim a
partial deployment as complete. Never send real customer email/invitations, place calls, issue real
invoices, or collect payment during acceptance.

Rollback restores the captured Pages deployment and prior runtime commit/config, or disables only
`PUBLIC_EVENTS_ENABLED` for a schedule incident. Retain the additive `text`/`budgetCents` schema, do
not delete a Calendar, and never reset SQLite.

## Deliverable

Return:

- Feature branch and commit SHAs.
- Concise changed-file and architecture summary.
- Baseline and final test results.
- Responsive screenshots and accessibility/performance evidence.
- Public-events fixture/privacy evidence.
- Deployment/API/Pages IDs only if deployment was explicitly authorized and performed.
- Rollback target and exact rollback procedure.
- Remaining genuine inputs: final logo, approved Listen media, authoritative Public Shows Calendar
  ID/access, and production business/privacy terms. Until Justin requests otherwise, publish only a
  controlled venue/city display string and never a street address.

Update `README.md`, `PROGRESS.md`, `HANDOFF.md`, `docs/HANDOFF.md`, `docs/RUNBOOK.md`,
`docs/resource-inventory.md`, and a new dated round-two evidence record factually. Do not rewrite
historical evidence. Persist through implementation, verification, review, and a clean handoff, but
do not cross an external authorization boundary.
