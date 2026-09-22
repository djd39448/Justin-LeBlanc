# Booking and invoicing workflows

## Shared rules

One inquiry ID across form/chat/voice; customer ID across multiple shows. Every mutation records
actor, timestamp, source channel, prior/new state, request ID, and policy/version. Server enforces
transitions. External effects use a transactional outbox and provider IDs. Retries reconcile
uncertain outcomes before sending again; never promise universal exactly-once delivery.

All customer-facing consultation and event inputs and displays use Central Time
(`America/Chicago`), including daylight-saving transitions. Store UTC instants plus the IANA
timezone and original local input. Calendar event IDs are not customer IDs. Never treat subject
text as authorization or calendar creation time as performance time.

Round two renders the first inquiry step directly in the homepage opening experience. A visitor
does not need to follow a CTA, change routes, open a dialog, or start an assistant to submit the
form. The dedicated Plan Your Event route reuses the same state and contracts.

Preferred reply values are `email`, `text`, and `phone`; Text and Phone Call require a phone number.
Text records a human follow-up preference only. Optional visitor budget is normalized from USD input
to integer `budgetCents` and remains non-authoritative lead context. It never supplies or amends an
estimate, quote, deposit, invoice, or charge. Existing records with legacy budget strings remain
readable.

## Inquiry -> consultation -> hold -> booking

1. Answer sourced FAQs; create/update inquiry after consent and validate email/phone/timezone.
2. Produce provisional estimate if enough information, otherwise qualify for custom quote.
3. Offer actual free consultation slots through the verified TrustCore scheduling adapter.
4. Before committing, recheck consultation and performance conflicts with buffers. Lock the
   requested performer/time interval transactionally to prevent simultaneous double holds.
5. After visitor reviews both dates and tentative status, persist the booking intent and enqueue
   consultation + performance hold. Two calendar records with different roles and shared booking ID.
6. Invite client and Dave to consultation and tentative performance hold (unless Dave is already
   organizer). Never duplicate Dave as attendee. Use supported provider invitation behavior.
   Keep financial/internal notes out of attendee-visible descriptions. Calendar status is not the
   business status: use explicit title `[DEMO][TENTATIVE]` and private metadata.
7. Send client confirmation explaining consultation, non-guaranteed hold, expiry and next steps.
   Send Dave the full private one-page event brief. Do not attach it to the client invitation.
8. If one external write fails, record partial state, retry that effect only, and show accurate
   status. Cancel/compensate orphaned temporary entries if reservation cannot complete.
9. After consultation, authenticated operator sets agreed quote and confirms the performance.
   Update the existing hold to `[DEMO][CONFIRMED]`, preserving event ID and sending update notice.
   Only actual availability and required fields permit confirmation; no automatic approval by AI.
10. Expired holds release reservations and cancel/update only their own calendar records.
    Rescheduling checks new interval first; cancellation updates event and booking, sends notices,
    and blocks automatic invoice generation. Avoid repeated notification loops.

States: inquiry `new -> qualified -> consultation_scheduled -> consultation_completed`;
show `tentative -> confirmed -> performed` after the eligible Calendar end is reconciled.
Side exits: tentative -> expired/cancelled; confirmed -> cancelled or needs_review. Consultation and
show states remain separate. `awaiting_performance_reply` and `not_performed` are legacy states only.

## Live public-performance listing

The public schedule is a read-only projection from one exact dedicated Public Shows Google
Calendar. Calendar membership is the publish decision: public venue performances go on that
Calendar; consultations, private gatherings, weddings, corporate events, tentative holds, and
canonical booking records remain on the private booking Calendar.

The server never reads `SHOW_CALENDAR_ID`, `FREE_BUSY_CALENDAR_IDS`, `primary`, or a discovered
Calendar for public listings. It accepts no browser-supplied Calendar ID or provider time window.
If the Calendar currently used by Justin's existing events page contains mixed records, migrate
future public dates to an owner-confirmed dedicated Calendar instead of classifying by title,
description, color, attendees, visibility, location, or keywords. The kickoff does not authorize
creating or editing Calendar resources; leave the tested reader disabled and report the exact owner
action if no suitable source already exists.

`PublicEventsCalendarReader` performs the round-two spec's exact bounded, read-only future query with
expanded recurring instances, deleted events omitted, chronological order, pagination limits, and
explicit timeout/cache behavior.
The refresh is server-side and coalesced; visitors read a short-lived sanitized cache rather than
causing one Google request each. Only the strict public DTO is cached. Raw Google responses and
private/provider identifiers are never persisted for this feature.

Eligible output is a confirmed, timed event from the exact public Calendar with a bounded public
title, venue/general locality, start, end, and timezone. Optional source URLs must be HTTPS and
allowlisted. Cancelled, malformed, all-day when unsupported, out-of-horizon, or private-booking
metadata-bearing records are excluded. Responses never contain descriptions, attendees,
organizer/email, conferencing, attachments, Google links or IDs, extended properties,
customer/show/booking IDs, private addresses, or financial data.

On provider errors, missing configuration, invalid data, or expired last-known-good state, the API
returns a controlled unavailable/empty response. It never falls back to an unfiltered Calendar or a
broader OAuth scope. A cancelled or moved public event disappears or updates after the next bounded
refresh. Public listing reads cannot create, edit, invite, cancel, confirm, or invoice anything.

## Morning scan

Run a deterministic scheduled job at **08:00 America/Chicago**, not a model-based scheduler.
For UTC-only cron, use an hourly trigger with local-time/date gate and one policy-versioned run key
per local day; test DST. On startup/catch-up reconcile up to 7 unprocessed days, bounded and
deduplicated. A policy-version change must revisit dates completed under the superseded reply policy.

Read configured performer calendar(s), resolving recurring instances and events crossing midnight.
Select app-tagged confirmed Justin demo performances whose **end** fell on the prior local date. A
1am finish is included on the morning after that finish date. Reconcile up to seven overdue local
dates on startup/catch-up. Ignore consultations, tentative/cancelled/all-day/unrelated/untagged
records and already invoiced shows.

For this workflow, an eligible completed Calendar performance is assumed played. Each event must
carry private app metadata: tenant ID, show ID, customer ID, quote version, currency and agreed total
in minor units. The canonical show must still be confirmed, the event times/metadata must match,
the agreed quote must resolve exactly, and the customer must have complete billing identity, email
and address data. Untagged/unparseable events and events with no known canonical show are skipped
because no billing record can be identified safely. A known confirmed show with missing quote,
customer or billing data, or mismatched Calendar times/price, goes to operator review without issue.

Inside one transaction, mark the eligible show performed and snapshot the agreed quote and billing
record into one immutable approved invoice. A recoverable preparation step renders the PDF; a second
transaction then queues delivery so an interrupted render can resume without recreating the invoice.
Deliver the invoice **To the configured billing contact and BCC the configured performer/operator**
only after both pass the exact demo allowlist at the final mail boundary. Do not ask whether the show
was played and do not wait for a YES reply. Any charge change must be approved and reflected in the
agreed quote before the scan; the morning job never invents or infers amendments.

## Legacy reply records

The earlier demo policy created performer confirmation threads and `performance_checks`. Preserve
those records and their authenticated IMAP reconciliation for audit/history, but label their controls
as legacy. New confirmed performances do not create Did-you-play messages, unanswered reminders or
reply-gated invoices. A late legacy reply cannot create a second invoice for a show already processed
by the Calendar-driven workflow. A legacy show still awaiting a reply with no invoice routes to
operator review during the versioned catch-up; never silently migrate it into automatic issue.

## Invoice generation and delivery

Generate sequential unique number (`JLM-DEMO-2026-0001`), issue/due dates, seller identity,
customer billing identity/email/address/PO when required, event/date/location, itemized services,
quantity/rate, agreed extras/discounts, subtotal, tax policy, deposits already paid and balance due.
Validate integer cents, nonnegative payable amount and customer/address requirements. A missing
seller legal address remains a marked demo fixture; do not publish Justin's home address by default.

Current-policy invoice states are approved -> issuing -> sent; failures -> delivery_pending/needs_review.
Legacy records may retain earlier draft/approval states. After issue, the snapshot is immutable. Corrections create
an auditable revision/void-and-replacement, never silently edit an emailed document. No payment
collection or automatic paid status in this demo; paid is authenticated operator-entered evidence.

Render HTML email and PDF from one validated invoice model. Deliver **To billing contact, BCC
performer** (Dave's configured address in demo; Justin after migration), correct Reply-To, attachment
and accessible plaintext alternative. No public PDF URL; store privately with expiring access.

Unique constraints on tenant/show/invoice kind, one run key per Houston local date, and deterministic
outbox identities prevent duplicate invoice creation or delivery. Outbox tracks provider message IDs. If send times out after possible acceptance, query
sent records/correlating Message-ID before retry; if still uncertain stop in delivery_pending.
Do not claim delivered solely from API accepted; demo evidence includes inbox receipt/attachment.

## Demo controls

All effects have DEMO_MODE and recipient allowlist checks at the last external boundary, including
calendar attendees, email To/CC/BCC and outbound test call destinations. Real customer addresses
cannot escape via copied data. Use synthetic customers and nominated test inboxes.
Admin-only `run-morning-check --as-of` demonstrates the job instantly with a tagged synthetic past
show. It must run the same logic as the scheduled job. Global clock override forbidden in live mode.
Separate kill switches for AI, voice callbacks, booking writes, morning scan and invoice sending.
