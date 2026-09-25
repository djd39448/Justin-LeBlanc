# Booking inquiry round-three specification

Status: owner-approved implementation authority
Date: 2026-09-24
Owner: Dave Dobbins
Client: Justin LeBlanc

## 1. Authority and release boundary

This specification is the current authority for the public inquiry form, inquiry receipt,
Justin-only inquiry notifications, and the 24-hour follow-up lifecycle. It supersedes conflicting
public-form copy, field requirements, phone rules, date entry, equipment choices, success treatment,
and public scheduling mechanics in
[PUBLIC_FORM_SIMPLIFICATION_SPEC.md](PUBLIC_FORM_SIMPLIFICATION_SPEC.md),
[ROUND_TWO_BUILD_SPEC.md](ROUND_TWO_BUILD_SPEC.md), [BUILD_SPEC.md](BUILD_SPEC.md), and
[`KICKOFF.md`](../KICKOFF.md).

All non-conflicting brand, responsive, accessibility, noindex, security, backend booking, Calendar,
voice, chat, billing, durable-outbox, provider-isolation, and allowlist requirements remain in
force. This release does not remove or weaken protected booking, assistant, Calendar, invoice, or
operator capabilities merely because they are absent from the public journey.

The public website captures a two-step inquiry and stops. It must not offer or perform availability
checking, consultation selection, tentative holds, date reservation, booking, or a post-submit
reserve/next-step flow. `Chat` in this specification means an optional notification created in
Justin's own ChatGPT account from an authorized Gmail event trigger; it does not mean a public
website chatbot.

## 2. Shared planner and contact presentation

The homepage and `/plan-your-event/` reuse one planner. Its visible opening label is exactly
`BOOKING INQUIRIES`. The navigation CTA remains `PLAN YOUR EVENT`.

Remove the human business phone from the hero/opening booking area. Keep exactly one intended public
footer phone link for `(832) 303-9116`. The dormant voice-agent number remains private and unchanged.

The planner has exactly two steps. Fieldsets retain accessible, visually hidden legends even when
the former visible legends are removed. Required fields, validation summaries, focused controls,
recap, consent, and checked/unchecked states must remain keyboard, touch, and screen-reader usable
on dark and light surfaces.

## 3. Step 1 — contact details

The visible heading is `Tell me about your event`. Fields appear in this order:

1. `Your Name`
2. `Email`
3. `Phone Number`
4. `Preferred method of response`

Name and email are required. Phone is technically optional for every response preference and does
not display `(optional)`. Response choices appear as `Text`, `Email`, and `Phone Call`, in that
order, with Text selected by default. The button is `Last Step`.

Email is the canonical fallback. If Text or Phone Call is selected without a phone number, accept
the inquiry, retain the selected preference, and state the practical email fallback in Justin's
private alert.

### Phone validation

Client and server use the same rule:

- blank is valid for Email, Text, and Phone Call;
- ordinary spaces, parentheses, periods, and hyphens may be removed for validation;
- ten U.S. digits are valid;
- eleven digits are valid only when the leading digit is `1`, including an entered `+1`;
- alphabetic characters, extensions, incomplete/excess digit counts, misplaced `+`, and other
  characters are invalid; and
- validation does not rewrite historical stored formatting.

The exact field error is:

`Enter a complete 10-digit phone number or clear this field.`

An invalid phone keeps the visitor on step 1 and focuses the phone control. Clearing it makes the
step valid.

## 4. Step 2 — event details

Fields appear in this order:

1. `Event type`
2. `Location of Event`
3. `Event Date`
4. `Is it outdoors?`
5. `Approximate performance time`
6. `Sound or equipment needs`
7. `Estimated Budget (optional)`
8. `Special Requests (optional)`

Keep the stable `city`, `durationMinutes`, `budgetCents`, and `musicRequests` properties.

Remove public controls for flexible/not-chosen date, venue name, guest count, the old Setting
selector, booking timezone, atmosphere, timing notes, venue access, catch-all notes, and any
duplicate music-request field.

`Is it outdoors?` is a required, unselected Yes/No radio group. Yes maps to
`setting: "outdoor"`; No maps to `setting: "indoor"`.

Keep the approved duration choices. Equipment has exactly `PA required` and `PA is provided`, in
that order, with `PA required` selected by default.

The budget remains optional, strict decimal input with the existing maximum and exact integer-cent
normalization. It does not display `USD` and remains planning context only; it cannot become a
quote, invoice, deposit, price promise, or charge authorization.

## 5. Composite event date

Replace the single native date field with one visible text-capable input and a separately operable
calendar button. The visible guidance accepts `MM-DD-YY` or `MM-DD-YYYY`. Manual digit entry inserts
dashes, picker selection populates the same visible field, and keyboard and touch paths work.

Validation checks a real calendar date, including month lengths and leap years. Two-digit years
expand deterministically as `YY -> 20YY`. Valid dates normalize to the existing ISO
`YYYY-MM-DD` API contract. Focus must never clear an entered or resumed value.

Removing the flexible-date control affects new public entry only. Historical `date: "flexible"`
records remain readable and can be resumed without a destructive migration.

## 6. Replacement-update compatibility

The inquiry update path replaces its input JSON. A public resume/update therefore preserves every
compatible value whose control is no longer shown, including company/planning role, venue,
address, guest count, local timing, atmosphere, schedule notes, access, catch-all notes, legacy
budget context, and historical flexible date state. New public inquiries use schema-approved
neutral defaults and never fabricate customer preferences.

Protected consultation, show, Calendar, quote, invoice, and outbox records remain untouched by a
public inquiry update.

## 7. Recap, consent, submission, and receipt

Keep the readable final recap, required contact consent, and separate optional marketing consent.
Marketing consent is unchecked by default. The submit button is `That’s It`.

The first public creation uses a browser-generated high-entropy idempotency key that is saved before
the request. Repeated clicks, refreshes, transport uncertainty, and retries reuse that key. A replay
returns the same canonical inquiry and resume credential and must not create another inquiry or
initial alert. Resume/update operations likewise never enqueue another initial alert.

After canonical persistence, navigate to `/inquiry-received/`. The route is noindex and says:

`Your request has been received. I’ll contact you as soon as I’m available.`

It must not claim availability was checked, a date was held, a booking was created, a consultation
was scheduled, or pricing was approved. The URL contains no inquiry content, contact information,
reference, resume token, or admin token. If shown, an opaque inquiry reference is transferred only
through session-scoped browser state; a resume token is never transferred to the receipt page.
Refresh and back navigation must not resubmit.

## 8. Justin-only inquiry email

Runtime configuration adds protected `INQUIRY_NOTIFICATIONS_ENABLED` and
`INQUIRY_NOTIFICATION_EMAIL`. The real recipient exists only in protected runtime configuration
and the dedicated exact-recipient gate; the repository contains placeholders. These settings do not replace
or alter invoice, performer, operator, BCC, or customer-delivery identities.

After the first canonical creation, enqueue one deterministic `email.inquiry_received` effect in
the same transaction as persistence. Deliver it through the existing durable outbox, deterministic
Message-ID, Sent reconciliation, and final SMTP recipient gate. The configured Justin inquiry
address is the sole To recipient; CC and BCC are empty. A browser cannot select or override it.

Notification failure must not lose or duplicate the inquiry. Disabled or incomplete notification
configuration fails closed for delivery while canonical intake remains available. SMTP uncertainty
must reconcile by Message-ID before retry.

Subjects use the non-PII prefix `[JLM Inquiry]`. The private initial body includes the opaque
reference, server submission time, entered contact fields, response preference and fallback note,
event type/date/location/outdoors/duration/equipment, optional budget and special requests, and the
24-hour deadline. It includes no resume/admin credential. Ordinary logs, analytics, URLs,
exceptions, public evidence, and committed fixtures contain no customer PII.

## 9. Durable 24-hour follow-up lifecycle

Each new inquiry stores typed, durable follow-up state with the received time, due time, completion
time or explicit incomplete state, 20-hour reminder state, and 24-hour overdue state. Historical
records remain readable through schema defaults; no destructive rewrite is required.

A restart-safe job uses an injected clock in tests:

- at 20 elapsed hours, an incomplete inquiry atomically records and queues exactly one
  `email.inquiry_due_soon` message;
- at 24 elapsed hours, an incomplete inquiry atomically records and queues exactly one
  `email.inquiry_overdue` message;
- completion before 20 hours suppresses both;
- completion after the 20-hour alert but before 24 hours suppresses overdue; and
- replay/restart cannot duplicate either effect.

All subjects retain `[JLM Inquiry]`. This lifecycle is separate from legacy billing follow-ups.
Opening an email or acknowledging a ChatGPT notification is not customer follow-up.

Provide an authenticated operator action, admin control, and dedicated CLI command to mark an
inquiry followed up. The action requires the inquiry ID, expected revision, explicit audit identity,
useful `--help`, JSON output, and actionable errors.

## 10. ChatGPT account-side notification

Do not build a website-to-personal-ChatGPT push API. The supported route is:

1. the backend sends the authoritative Justin-only Gmail message;
2. Justin authorizes that Gmail account in his own eligible ChatGPT account;
3. an event-triggered ChatGPT Work task watches the stable `[JLM Inquiry]` subject prefix; and
4. ChatGPT uses the notification channel enabled on Justin's account.

Push-preview text contains no customer PII. New, due-soon, and overdue notifications direct Justin
to Gmail and, where applicable, to follow up. This layer remains pending until Justin's connector,
eligible feature, and notification permission are available and a synthetic notification is
observed. Dave's inbox is not a substitute, and no one requests Justin's password.

## 11. Deployment and rollback

Release in backward-compatible order:

1. back up persistent SQLite and inspect unresolved outbox effects;
2. deploy additive backend schema/config/job/operator support;
3. set and verify the protected Justin-only recipient and dedicated final gate, then enable inquiry
   notifications;
4. restart only the owned Justin API and worker and verify local, direct-tunnel, and site-proxy
   health;
5. deploy the frontend only after the backend contract is live;
6. merge or fast-forward the verified feature to `main`, push `main`, and deploy only Cloudflare
   Pages project `50by50-justinleblancmusic` with the pinned Wrangler version;
7. submit exactly one clearly synthetic production inquiry and verify one canonical record, one
   accepted Justin-only email effect, receipt behavior, and no booking/scheduling side effect; and
8. prove 20/24-hour behavior with injected time or an authenticated demo command, never by changing
   the system clock or waiting in real time.

Rollback uses the recorded prior runtime revision/config and prior Pages deployment. Preserve the
database, additive schema, recipient/outbox evidence, and uncertain delivery state. Never reset
SQLite or blindly resend an uncertain email.

## 12. Acceptance

Completion requires all focused phone, form, date, receipt, email, recipient-gate, idempotency,
follow-up, log/privacy, responsive, keyboard, screen-reader-semantic, contrast, reduced-motion,
public-output, and secret-scan checks in the owner kickoff. Run `npm run verify`,
`npm run test:e2e`, `npm run audit:public`, and `npm run scan:secrets -- --json` before release.

Live completion additionally requires the exact release SHA and Pages deployment, owned runtime
restart evidence, one synthetic reference, Justin-only delivery evidence, rollback target, and an
honest ChatGPT notification result. A locally mocked, disabled, or unobserved integration is not
reported as live.
