# Public form simplification specification

> **Superseded for conflicting details (2026-09-24):** The approved
> [round-three specification](INQUIRY_ROUND_THREE_SPEC.md) now controls phone/date rules,
> equipment/outdoors controls, receipt copy, idempotency, inquiry notifications, and follow-up
> behavior. This document remains historical context for the simplification direction and for
> all non-conflicting brand, privacy, accessibility, and backend-preservation requirements; it is
> not deployment evidence.

Status: implemented, verified, and live
Date: 2026-09-23
Owner: Dave Dobbins
Client: Justin LeBlanc

## 1. Authority and scope

This specification supersedes the public-form requirements in
[ROUND_TWO_BUILD_SPEC.md](ROUND_TWO_BUILD_SPEC.md), [BUILD_SPEC.md](BUILD_SPEC.md), and
[KICKOFF.md](../KICKOFF.md) only where they conflict with the direction below. All non-conflicting
brand, responsive-layout, public-show, accessibility, privacy, security, inquiry, pricing-boundary,
backend booking, Calendar, email, invoice, outbox, authentication, allowlist, and
provider-isolation requirements remain in force.

This is a public-browser simplification. It does not decommission or redesign the private booking
workflow. The existing consultation, tentative-hold, availability, Calendar, operator, voice, and
chat capabilities remain protected backend resources for later human or explicitly authorized
channel use.

Implementation and deployment evidence is recorded in
[public-form-simplification-2026-09-23.md](evidence/public-form-simplification-2026-09-23.md).

## 2. Public journey

The public website captures an inquiry and stops there. A visitor can submit or resume the planner,
read a clear confirmation, and wait for human follow-up. The browser must not offer, imply, or
perform consultation selection, availability checking, tentative-hold creation, or booking.

After a successful inquiry submission:

- show a concise success state and the inquiry reference needed for support or resume;
- explain that Justin or his team will follow up using the selected reply method; and
- do not reveal a next-step, reserve, consultation, availability, schedule, or tentative-hold card.

The public browser must not call the availability or booking endpoints as part of submission,
resume, or the success state. Removing those browser calls does not change the reachability,
authentication, authorization, idempotency, or tests of the preserved backend endpoints.

## 3. Two-step planner

Keep the planner resumable, keyboard accessible, progressively validated, and visible in the
homepage opening experience. Replace the former three-step flow with exactly two public steps.

### Step 1 — Contact

Retain the existing contact and preferred-reply controls:

- Name
- Email
- Preferred Reply: Email, Text, or Phone Call
- Phone, optional for Email and required for Text or Phone Call
- Company or planning role (optional)

`Text` remains a request for human follow-up, not a promise of automated SMS. Email remains required
for the canonical inquiry record.

### Step 2 — Event planning

Retain the existing event-page controls:

- Event type
- **Location of the event**
- Event date, including the existing flexible/not-chosen option
- Venue name (optional)
- Setting
- Approximate guest count (optional)

The visible **Location of the event** label replaces **Event city**. Keep the stable `city` property
and existing validation/storage contract; this is a public label change, not a schema migration or
permission to collect a private street address.

After those event controls, render only these planning-detail fields:

- **Performance time** using the existing approximate-duration control and stable
  `durationMinutes` property
- **Sound / equipment needs** using the existing `equipment` property and choices
- **Budget (optional)** using the existing numeric input and `budgetCents` contract
- **Special requests (optional)** using the existing `musicRequests` property

Do not render separate public controls for atmosphere, timing notes, catch-all additional notes,
booking timezone, or venue access. Continue to use the existing hidden/default timezone and access
behavior where the inquiry contract requires them.

### Recap and consent

End step 2 with a readable, screen-reader-friendly recap of the current public answers. Preserve
edit/back behavior without reintroducing a third step or a standalone review page.

Keep the required contact consent and the separate optional, unchecked marketing consent. These
are submission controls, not additional event-planning fields.

## 4. Budget label and money boundary

The public label is exactly **Budget (optional)**; do not include `USD` in the visible label. This is
a copy change only. The existing demo currency, strict decimal grammar, upper bound, exact
integer-cent normalization, `budgetCents: number | null`, legacy-budget read compatibility, private
brief formatting, and quote/invoice isolation remain unchanged.

The visitor-entered amount remains non-binding planning context. It is never an estimate, quote,
deposit, invoice amount, price promise, or authorization to charge.

## 5. Compatibility and preserved data

The public UI no longer exposes controls for `atmosphere`, `scheduleNotes`, or the catch-all `notes`
field. Their removal from the visible form must not make older records unreadable and must not erase
stored values when a legacy inquiry is resumed or resubmitted. Because the current `InquiryInput`
schema requires legacy properties and inquiry updates use replacement semantics, those property
keys and their preservation/default logic may remain in the client bundle and payload even though
their retired controls and labels do not.

- Shared schemas and private/admin/assistant readers continue accepting legacy values.
- When a legacy inquiry is resumed, the browser carries its stored removed-field values through the
  replacement payload unchanged rather than clearing them.
- A new public inquiry supplies only schema-approved neutral defaults for required retired keys; it
  must not fabricate a customer preference.
- Existing resume tokens, legacy budget strings, `budgetCents`, preferred-reply values, timezone,
  access value, and stable field names remain backward compatible.
- Removed public scheduling state must not delete or alter an existing consultation, hold, show,
  Calendar link, quote, or outbox effect.

## 6. Preserved private booking capabilities

Keep the existing private and backend implementation intact, including:

- consultation and performance availability checks;
- consultation plus tentative-hold creation and reconciliation;
- conflict buffers, recipient/attendee gates, idempotency, durable effects, and provider adapters;
- operator confirmation, quote, reschedule, cancellation, expiry, and invoicing workflows;
- dormant voice/chat tools, routes, signatures, limits, allowlists, KB identity, and tests; and
- Calendar, email, Retell, OpenAI, SQLite, and private-storage resources.

No public-form simplification authorizes provider reprovisioning, Calendar/event mutation, broader
OAuth access, customer communication, or changes to unrelated resources.

## 7. Acceptance and evidence

Implementation is complete only when automated and browser evidence proves all of the following:

1. The planner exposes exactly two progress steps on the homepage and `/plan-your-event/`.
2. Step 1 retains the contact and preferred-reply behavior, including phone requirements.
3. Step 2 shows **Location of the event** and no **Event city** label while submitting the stable
   `city` property.
4. Step 2 contains the retained event controls and only the four specified planning-detail fields.
5. The visible budget label is **Budget (optional)**, while exact-cent parsing, resume behavior, and
   quote/invoice isolation continue to pass.
6. The former atmosphere, timing-notes, catch-all-notes, consultation, availability,
   tentative-hold, and standalone-review controls and user-facing labels are absent from the
   rendered public form. Required legacy property keys and default/preservation logic may remain in
   the client bundle and payload; their presence alone is not a public-output failure.
7. The recap is readable and editable, required contact consent remains enforced, and optional
   marketing consent remains unchecked by default.
8. Successful submission ends in human-follow-up confirmation and exposes no reserve, next-step,
   consultation, schedule, or tentative-hold card.
9. Public browser code contains no consultation-scheduling, availability-check, or booking-creation
   endpoint logic, and browser tests prove inquiry submission and resume make no availability or
   booking request.
10. Resuming and updating an older inquiry preserves stored removed-field values and legacy budget
    context without displaying those retired controls.
11. Existing backend booking, Calendar, assistant, billing, auth, recipient, idempotency, and
    provider-isolation tests remain passing.
12. Responsive, keyboard, focus, validation, reduced-motion, public-output, secret-scan, and live
    route/header checks pass before any deployment is reported.

The verified implementation commit is `c6abf12015bcb6ef179985a08919cd3319026915`. Production Pages
deployment `73a78aec-f10a-4b95-b494-fd191ecccbd6` is live, with
`a3152e61-ed47-41a7-9595-ebd42e694245` retained as the immediate rollback target. See the dated
evidence record above for tests, responsive screenshots, and read-only live smoke. Historical
round-two and provider evidence remains unchanged.

## 8. Non-goals

- Removing or weakening backend scheduling and booking capabilities.
- Deleting consultations, holds, shows, Calendar links, or historical inquiry data.
- Changing quote, invoice, payment, pricing, or currency policy.
- Adding automated SMS, public chat, public voice, or browser microphone features.
- Enabling the dedicated Public Shows Calendar or changing its separate release gate.
- Treating read-only live smoke as evidence that a real inquiry was submitted.
