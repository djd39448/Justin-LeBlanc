# Round-two brand and conversion build specification

Status: owner-approved requirements, not yet implemented
Date: 2026-09-22
Owner: Dave Dobbins
Client: Justin LeBlanc

This document supersedes the customer-facing information architecture, assistant presentation,
public pricing, and discovery-form details in [BUILD_SPEC.md](BUILD_SPEC.md). It does not supersede
the existing booking, Calendar hold, email, invoice, outbox, authentication, noindex, allowlist, or
provider-isolation requirements. Historical acceptance evidence remains historical and must not be
rewritten to imply this round has shipped.

## 1. Outcome and conversion priority

The homepage exists first to convert a visitor who is ready to pay for an event. That visitor must
be able to begin the booking process immediately from the opening experience. The form itself—not
only a CTA, modal, accordion, or link to another route—must be visible and usable without a
preliminary click.

“Immediate booking” means the visitor can submit the inquiry and continue into the existing
consultation/tentative-hold workflow from the homepage. It does not bypass availability, personal
review, the consultation, the agreed quote, or authenticated confirmation, and it does not collect
payment.

The public site should feel like Justin LeBlanc the performer. Booking technology should remain
quiet, direct, and dependable.

## 2. Homepage structure

Use this order:

1. Persistent top navigation.
2. Opening conversion experience: Justin's hero and the inline event planner.
3. Full-width event-category rail.
4. **Where I'm Playing**, populated from the live public-performances Calendar projection.
5. **Listen**.
6. **Follow**, including the current Meet Justin photography and verified social links.
7. Personalized FAQ.
8. A short closing prompt that returns focus to the opening planner; do not render a second form.
9. Footer.

The opening conversion experience may use a two-column desktop composition: photography on the
left and Justin's name, approved opening line, and the first planner controls on the right. On small
screens, use a concise hero followed immediately by the planner. The planner must not be hidden
behind a “start,” “book,” or “plan” button.

At 1440×900, the initial viewport must contain Justin's identity/value proposition, the planner
heading, and the first step's name and email controls. At 390×844, the planner heading and first
labeled input must be fully visible in the opening viewport, with no intervening content or reveal
action.

Keep `/plan-your-event/` as a focused campaign and direct-link route. Its H1 is **Plan Your Event**;
the homepage and dedicated route reuse the same component and contracts. The closing homepage link
scrolls to `#plan-your-event` and focuses the planner heading without creating a second form or
moving focus on ordinary page load.

## 3. Persistent navigation

The navigation remains attached to the viewport top throughout scrolling on desktop and mobile.
Implement a true sticky/fixed header with an opaque or sufficiently blurred dark background,
predictable height, safe-area handling, and a z-index above page content but below open dialogs.

Primary links remain:

- `LISTEN` → `/#listen`
- `FOLLOW` → `/#follow`
- `FAQ` → `/faq/`
- `PLAN YOUR EVENT` → `/#plan-your-event` from the homepage and the equivalent planner target from
  supporting pages

`PLAN YOUR EVENT` remains the distinct primary button. Every target has at least a 44px hit area and
visible hover/focus/current treatment. If the links collapse into a mobile menu, its toggle exposes
`aria-expanded`; Escape and link activation close it, focus returns to the toggle when appropriate,
and keyboard focus cannot enter hidden links. Anchor targets, validation summaries, and controls
focused after validation use a header-height-plus-16px scroll offset. After two or more viewport
heights of scrolling, the header must still be pinned.

## 4. Hero and visual direction

- Use one semantic H1: `Justin LeBlanc`, visually presented as `JUSTIN LEBLANC`.
- Use this exact opening line: “A polished, personable performance shaped around your room, your
  guests, and the moments they’ll remember.”
- Keep Justin visually left, the copy right-aligned and lower in the composition, his face
  unobstructed, and the top crop slightly above—not through—his head.
- Remove `Hear Justin First` and the public image-source link.
- Blend the image into the dark navy page background without a visible seam.
- Use restrained static tonal/radial texture. Any optional motion stops under
  `prefers-reduced-motion`.
- Do not fabricate or display a placeholder logo. Add the real static and animated assets only when
  Justin supplies them; any animation requires a static/reduced-motion fallback.

Immediately after the opening conversion block, display:

`PRIVATE GATHERINGS · CELEBRATIONS · CORPORATE RECEPTIONS · WEDDING INQUIRIES`

Use four evenly distributed items on wide screens and a legible 2×2 layout on narrow screens.

## 5. Inquiry form contract

Preserve the three-step, resumable, accessible planner, but render its first step directly in the
opening conversion experience.

### Preferred reply

Visible choices and canonical values:

| Label      | Value   | Phone requirement |
| ---------- | ------- | ----------------- |
| Email      | `email` | Optional          |
| Text       | `text`  | Required          |
| Phone Call | `phone` | Required          |

Email remains required for the inquiry record. `Text` records a requested human reply method only;
it does not implement or promise automated SMS.

### Page-three changes

- Remove the visible **Booking Time Zone** field while continuing to submit
  `America/Chicago`. Keep concise Central Time guidance beside actual scheduling controls.
- Rename `Music or event-moment requests` to **Special Requests (optional)** while retaining the
  stable `musicRequests` property.
- Use exactly these equipment choices: **Not sure yet**, **Venue provides PA**, **PA required**.
- Remove **Venue Access** from the UI while continuing to submit `access: "unknown"` for backward
  compatibility.

### Visitor-entered budget

Replace the budget-range select with one optional numeric input labeled
**Estimated budget (USD, optional)**.

- Use a text input with `inputmode="decimal"` so exponent notation cannot bypass validation. After
  trimming outer whitespace, accept only `0`, a positive whole-dollar number without leading zeros,
  or that same form followed by one or two decimal digits. Valid examples: `0`, `750`, `750.5`, and
  `750.50`. Reject `.50`, `1.`, `+1`, commas, exponent notation, negatives, and values above
  `$99,999,999.99`.
- Blank means unknown and remains valid.
- Normalize a supplied amount to an integer `budgetCents` value on the server without floating-point
  money arithmetic.
- Add `budgetCents: number | null` to the JSON inquiry input with a default of `null`; no SQL
  migration is required.
- Continue accepting legacy stored `budget` strings such as `unsure` and the old ranges when old
  records are read. A resumed legacy record shows its former range as read-only context and leaves
  the numeric input blank; it preserves that legacy value if the visitor makes no budget change.
  Entering a numeric amount sets `budgetCents` and replaces the legacy range with `unsure`. Brand-new
  web submissions set the legacy field to `unsure` and use `budgetCents`.
- A resumed record that already has `budgetCents` pre-fills the formatted numeric amount. Editing it
  replaces the cents value; deliberately clearing it stores `budgetCents: null` and legacy
  `budget: "unsure"`.
- Display the amount naturally in the private event brief.
- The visitor's budget is planning context only. It never becomes an estimate, agreed quote,
  deposit, invoice amount, or authorization to charge.

The additive `preferredReply: "text"` and `budgetCents` API contract must be deployed before the
new frontend. If the frontend is rolled back, retain the additive API schema so new records remain
readable. The dormant assistant channels keep their current legacy-budget behavior; shared parsing
accepts the additive field, but this round does not rewrite assistant prompts, tools, or pricing.
Server validation attaches a missing-phone error to the phone control whenever `text` or `phone` is
selected, including resumed drafts.

## 6. Live public-performance Calendar

The website must list actual upcoming public-venue performances from a live Google Calendar. It
must never expose private gatherings, corporate events, weddings, consultations, tentative holds,
customer identities, attendees, private locations, booking IDs, prices, or internal notes.

### Source and classification

Use a dedicated live Google Calendar in Justin's working Google Calendar account named along the
lines of **Justin LeBlanc — Public Shows**. The exact ID is configured privately as
`PUBLIC_EVENTS_CALENDAR_ID`; it is never supplied by a browser or returned to one.

Calendar membership is the publication decision:

- Public venue performances are entered on the Public Shows calendar.
- Consultations, weddings, corporate events, private gatherings, tentative holds, and other booking
  records remain on the existing private booking calendar and are never read by the public-events
  path.
- An operationally tracked public performance may retain its canonical private booking record while
  using a separate sanitized listing on the Public Shows calendar.
- Missing configuration or ambiguous source fails closed.

First determine whether the Calendar currently embedded by Justin's existing `/events` page is
already public-performance-only and can be addressed by exact ID. If so, use it. If it mixes public
and private events, finish the integration against an exact dedicated-calendar configuration but do
not create, copy, move, delete, or reclassify provider records without explicit owner confirmation.
Populate a future Public Shows calendar only from confirmed public-show information rather than
inferring classification from titles, descriptions, colors, attendees, venue names, or keywords.

Do not make `SHOW_CALENDAR_ID`, `FREE_BUSY_CALENDAR_IDS`, `primary`, or any discovered calendar a
fallback. Do not enumerate calendars from a public request. Keep the existing booking Calendar
adapter and its current authorization behavior isolated.

### Read boundary

Create a separate read-only `PublicEventsCalendarReader` and `GET /api/public-events` route.

- Configuration: `PUBLIC_EVENTS_ENABLED=false` by default, exact `PUBLIC_EVENTS_CALENDAR_ID`,
  `PUBLIC_EVENTS_TIMEZONE=America/Chicago`, and a backed-up random server-only
  `PUBLIC_EVENTS_ID_SECRET` of at least 32 bytes, all outside Git.
- Query only the configured calendar from the current instant through 180 days ahead, with
  `singleEvents=true`, `showDeleted=false`, chronological start order, page size 250, at most four
  pages, and at most 100 published events. If more than 100 eligible events appear within those four
  complete pages, publish the chronologically earliest 100. If a fifth page exists, fail the refresh
  rather than publishing a silent partial result.
- Prefer the existing `calendar.app.created` grant if the selected secondary calendar was created
  by this app and the grant is proven sufficient. Do not broaden OAuth scopes silently. If a
  separate credential is required, document and approve the narrowest read-only scope before use.
- Refresh server-side, not once per visitor. Coalesce concurrent refreshes, use an eight-second
  end-to-end provider timeout, retry 429/5xx once within that deadline but never retry 401/403,
  cache a successful sanitized projection for five minutes, and serve the last known
  good projection as `stale` for no more than 24 hours after its successful refresh. Replace cache
  entries atomically and never cache a partial failed refresh.
- A successful provider read with zero eligible events returns HTTP 200 with `status: "fresh"` and
  an empty array. Fresh or valid stale responses use HTTP 200. Disabled/missing configuration,
  provider failure without a usable cache, an expired cache, or pagination beyond the bounds uses
  HTTP 503, `Cache-Control: no-store`, `Retry-After: 300`, and only
  `{ "error": "public_events_unavailable", "message": "Current dates are temporarily unavailable." }`.
  It never returns provider diagnostics or falls back to an unfiltered calendar.

### Provider-to-public mapping

The dedicated Calendar is a controlled publication surface. For this first release:

- Accept only timed events with `status: "confirmed"`, default/absent `eventType`, non-private and
  non-confidential visibility, valid `start.dateTime`, valid later `end.dateTime`, non-empty
  `summary`, and non-empty `location`. Exclude all-day, cancelled/tentative, out-of-horizon, or
  individually malformed events and emit only redacted counts. One malformed event does not discard
  other valid events; a truncated/failed provider fetch discards the entire refresh.
- Map trimmed, whitespace-collapsed `summary` to a 1–120-character plain-text `title` and trimmed,
  whitespace-collapsed `location` to a 1–160-character plain-text `venue`.
  Calendar editors must place only a publishable venue name plus city/region—not a private address—
  in `location`. Omit `city` in v1 rather than guessing how to split the string.
- Before enablement, an owner must privately review every in-horizon `location` value. Any street
  address, residence, or ambiguous/private location blocks that event from publication until the
  controlled Public Shows entry is corrected; do not attempt automated address redaction.
- Use the event's valid IANA `start.timeZone`, otherwise the configured
  `PUBLIC_EVENTS_TIMEZONE`. Preserve the provider's RFC 3339 start/end instants.
- Generate `id` as `pe_` plus the first 22 base64url characters of HMAC-SHA-256 using
  `PUBLIC_EVENTS_ID_SECRET` over `jlm-public-event:v1`, the exact Calendar ID, and either the Google
  event ID or recurring-event ID plus original-start instant, separated by NUL bytes. This keeps IDs
  stable per instance without exposing provider identifiers.
- Omit `sourceUrl` in v1. Do not derive it from Google `htmlLink`, description, attachments, or
  extended properties. A future release may supply it only from a separate server-side curated
  allowlist.
- `lastUpdated` means the UTC instant when the complete sanitized projection was last refreshed
  successfully; it is not a provider modification time.

Return only a strict public projection:

```ts
type PublicEvent = {
  id: string; // opaque hash, never the Google event ID
  title: string;
  venue: string;
  city?: string;
  start: string; // RFC 3339
  end: string;
  timezone: string; // IANA timezone
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

Never return raw descriptions, attendees, organizer details, email addresses, conferencing data,
attachments, Calendar IDs, Google event IDs, extended properties, booking/customer/show IDs,
financial data, or Google `htmlLink` values. Persist/cache only the sanitized projection and cache
metadata, not the raw provider response.

The homepage renders responsive upcoming-event cards or rows with semantic `<time>` values and
clear loading, empty, stale, and unavailable states. Do not render the old external-events link as
a substitute or failure fallback; the live sanitized feed is the implementation.

## 7. Public AI removal with backend preservation

The public website must contain no chatbot or voice-assistant experience in this round.

Remove from rendered public pages and built browser assets:

- `ChatPanel` and `VoicePanel` markup and scripts.
- Chat/voice CTAs, help sections, explanatory copy, FAQ/privacy/reference copy, and structured data.
- The Retell phone number, any `tel:` link, and voice-availability calls.
- Public configuration or health payload fields that expose the phone number while the UI is off.

Preserve underneath:

- Retell agent, LLM, number, tools, KB release, webhooks, signatures, provider identities, limits,
  allowlists, and private manifests.
- Voice and chat API routes, handlers, domain operations, configuration, and backend tests.
- `ChatPanel.astro` and `VoicePanel.astro` source may remain as dormant implementation if they do not
  enter the public build.
- The internal pricing/estimate implementation used by dormant assistants and historical tests.

Do not reprovision Retell, change the KB/tool set, remove `estimate_event`, disable the protected
voice runtime, or delete the phone-number configuration in this round. Public presentation and
backend capability are separate gates. A future re-enable must be an explicit release that restores
the public UI and disclosure intentionally.

The existing public `/api/health` route remains available but no longer emits
`demoVoicePhoneNumber`; operational checks obtain the number from private configuration/manifests.
Do not change the reachability, authentication, or gates of preserved chat/voice API routes as part
of this presentation-only removal.

## 8. Supporting content

- Rename all visible `Hear Justin` language to **Listen**. Use only Justin-approved or clearly
  linked authentic media; no arbitrary embed or autoplay.
- Place `apps/web/src/assets/justin-portrait.png` and
  `apps/web/src/assets/justin-playing-guitar.png` with the existing verified Instagram, YouTube, and
  Facebook URLs from `apps/web/src/content.ts` under **Follow**.
- Rewrite FAQ content in Justin's concise first-person voice without inventing repertoire, prices,
  response time, availability, production capabilities, policies, testimonials, or credentials.
- Remove the public package-price cards and demo price ranges. The visitor-entered budget is not
  published pricing.
- Remove customer-facing engineering language such as `isolated demo`, `operator`,
  `reviewed booking facts`, `confirmation boundaries`, and `agent reference` while keeping one natural
  disclaimer: **Sending this form starts a conversation; it does not confirm your date.**
- Keep protected admin, runbooks, logs, internal identifiers, provider safety labels, and historical
  evidence accurate. Keep the preview noindex and retain all security headers.
- Render three to five concise homepage FAQ items from the same content data as `/faq/`; the full
  route is canonical, and the two surfaces must not contain conflicting answers.

## 9. Acceptance and evidence

In addition to [ACCEPTANCE.md](ACCEPTANCE.md), prove:

1. The form starts in the opening homepage experience and requires no CTA, modal, route change, or
   preliminary reveal.
2. The pinned header remains attached after long scrolling and never covers anchor targets, form
   errors, or focused controls.
3. The numeric budget accepts blank and valid nonnegative USD amounts, rejects invalid/negative
   input, persists exact cents, renders correctly in the brief, and never changes quote/invoice
   arithmetic.
4. A multi-calendar fixture puts private wedding, corporate, consultation, and tentative events on
   forbidden calendars and eligible/cancelled/malformed events on the exact Public Shows calendar.
   The provider spy proves only the exact public calendar was queried, and output contains only its
   eligible event. A valid event deliberately placed on Public Shows is public regardless of title;
   tests must not pretend keyword filtering is a privacy boundary.
5. Public-event responses and browser output contain none of the forbidden provider/private fields.
6. Recurrence, cancellation, cross-midnight, DST, pagination, cache refresh, stale, timeout, 401,
   403, 429, and 5xx behavior are bounded and fail closed.
7. Built public HTML, metadata, JS, sitemap, `llms.txt`, and reference content contain no voice UI,
   phone number, `tel:` URL, chat UI, or assistant marketing copy.
8. Existing backend voice health, signed webhook, tool, KB-identity, and provider configuration tests
   remain unchanged and passing.
9. Responsive and keyboard evidence covers 360, 390, 768, 1280, and 1440 widths, including hero
   crop, initial form visibility, sticky navigation, form steps, Calendar states, and no horizontal
   overflow.
10. `npm run verify`, browser tests, a public-output privacy/copy audit, and a secret scan pass before
    deployment.

## 10. Deployment boundary

Implement and verify locally first. The private API/runtime and authoritative state remain on the
Windows host. Follow the Switchboard playbook before coordinating with another machine/session.

Submitting the implementation kickoff authorizes local implementation, tests, feature-branch
commits/pushes, read-only verification of an exact owner-confirmed Public Shows Calendar, and
reversible deployment to the existing Justin demo API and Pages resources after the gates pass. It
authorizes setting/enabling only the new public-events configuration when that Calendar and
sufficient existing read access are already confirmed. It does not authorize creating, sharing,
deleting, moving, copying, or editing Calendars/events; broadening OAuth scopes or granting
credentials; merging to `main`; changing DNS, Retell, mail, billing, payment, or unrelated
resources; or sending real customer communications. If a new Calendar, consent grant, scope, or
credential is required, deploy the tested feature disabled and report the exact owner action.

Deploy in this order:

1. Capture the current runtime commit/config manifest and Pages deployment ID as rollback targets.
2. Deploy the additive inquiry contract and public-events code with
   `PUBLIC_EVENTS_ENABLED=false`.
3. After owner-confirmed Calendar/access resolution, configure the exact Calendar ID, timezone, and
   ID secret privately; enable the reader, warm its cache, and verify the sanitized endpoint plus
   negative privacy fixtures while the old frontend remains live.
4. Recheck booking, assistant-backend, and billing health, then deploy the dependent frontend to
   `50by50-justinleblancmusic` only.
5. Verify the live planner, pinned navigation, public dates, protected admin, noindex/security
   headers, and absence of every public AI/phone artifact.

If rollback is needed, restore the captured Pages deployment and prior runtime commit/config, or
set `PUBLIC_EVENTS_ENABLED=false` for an isolated schedule incident. Retain the additive inquiry
schema, do not delete the new Calendar, and never reset SQLite.

If runtime coordination is unavailable, finish the code and tests but stop before deployment. Hand
off exact commands, expected health checks, the required private configuration names, and the
remaining provider action. A frontend rollback must retain the additive `text` and `budgetCents`
schema. Never reset SQLite to roll back a website release.

## 11. Deferred inputs and non-goals

Still required from Justin or Dave when available:

- Final static and animated logo assets and reuse approval.
- Approved Listen media.
- Exact authoritative Public Shows Calendar ID. Until Justin requests otherwise, publish only the
  controlled venue/city display string described above, never a street address.
- Production privacy, recording, pricing, seller, tax, payment, contract, and retention policies.

Non-goals:

- Automated SMS.
- Browser microphone or voice widget.
- Retell/voice/KB reprovisioning or decommissioning.
- Publishing real prices or turning visitor budget into a quote.
- Exposing the private booking Calendar.
- Inventing public performance dates.
- Production indexing or DNS cutover.
- Reworking the booking, invoice, outbox, or operator state machines beyond the additive fields and
  isolated public-events reader described here.
