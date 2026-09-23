# Decisions and provisional demo policies

These defaults let the build proceed. Justin must approve real business terms before launch.

## Round-two owner decisions — 2026-09-22

These decisions supersede earlier public-site placement and assistant-presentation decisions. They
are implemented and verified on `main`. The corrected conversion frontend is live. Dave explicitly
authorized one manually curated public-date exception for this release and deferred the dedicated
Public Shows Calendar to the next QA pass.

| Topic                   | Current decision                                                                                                                                                             | Status                                                            |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Conversion priority     | The homepage opening experience renders the usable booking form itself; no CTA, modal, route change, or preliminary reveal is required to begin                              | User approved                                                     |
| Navigation              | The primary navigation remains pinned to the viewport top throughout scrolling and uses safe anchor/focus offsets                                                            | User approved                                                     |
| Homepage order          | Persistent header → hero/inline planner → category rail → live public dates → Listen → Follow → FAQ → return-to-planner prompt → footer                                      | User approved                                                     |
| Public performances     | Temporarily show a manually curated verified public date; move to an exact dedicated Public Shows Google Calendar after the next QA pass                                     | Static exception user-approved and live; dedicated source pending |
| Public Calendar privacy | A separate read-only server adapter returns a sanitized projection only; never read/fallback to the private booking, free/busy, primary, discovered, or mixed-use Calendars  | Reader live disabled-first; existing mixed/private feed rejected  |
| Public event display v1 | Temporary entry may show title, date/time, controlled venue and city, plus its public source link; omit the street address; filter at build and expire client-side after end | User-approved static exception live                               |
| Public-event gate       | Reader defaults disabled and returns the fixed 503 until exact ID, existing access, ID secret, and owner-reviewed locations are all present                                  | Live with `PUBLIC_EVENTS_ENABLED=false`; fixed 503 verified       |
| Preferred reply         | Public choices are Email, Text, and Phone Call; Text and Phone Call require a phone number; Text is a human follow-up preference, not automated SMS                          | User approved                                                     |
| Budget                  | Replace fixed ranges with an optional visitor-entered numeric USD amount; it is planning context only and never controls quote/invoice math                                  | User approved                                                     |
| Public AI               | Remove every chatbot/voice surface, dormant voice-agent number, and assistant reference; show only the human business phone **(832) 303-9116**                               | User approved and live                                            |
| Assistant backend       | Preserve Retell/OpenAI resources, number, KB/tools, routes, webhooks, configuration, limits, allowlists, and backend tests for possible later re-enable                      | User approved                                                     |
| Public pricing          | Do not publish package/demo prices. Visitor-entered budget is not a price or offer                                                                                           | User approved                                                     |

See [ROUND_TWO_BUILD_SPEC.md](ROUND_TWO_BUILD_SPEC.md) for the complete contract and acceptance
requirements.

| Topic                    | Selected demo default                                                                                                                                                | Status                                                                                                                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Objective                | More private-event bookings, less qualification/admin effort                                                                                                         | User approved                                                                                                                                                                           |
| Theme                    | Optimize existing blue musician identity                                                                                                                             | User approved                                                                                                                                                                           |
| Hosting                  | Isolated `justinleblancmusic.50by50.dev`                                                                                                                             | User approved                                                                                                                                                                           |
| Voice                    | Existing Retell account, separate managed number and agent                                                                                                           | Houston (832) 501-3799; same protected agent/LLM published at v3; fourth call proved inquiry, availability, follow-up, and lifecycle tools; booking and native hangup remain unverified |
| Calendar/email           | Dave's verified TrustCore accounts, isolated records                                                                                                                 | Limited Calendar consent granted; live booking and actual reply-driven $700 demo invoice verified                                                                                       |
| Chat credential          | Reuse existing OpenAI API key securely                                                                                                                               | Reuse configured; four real qualification cases passed                                                                                                                                  |
| Consultation             | 20 minutes, Mon–Fri 10am–4pm Central Time (`America/Chicago`), no minimum advance notice for future times                                                            | User approved; live read-only same-day availability verified; respect actual free/busy                                                                                                  |
| Booking timezone         | Customer-facing consultation and event inputs/displays use Central Time (`America/Chicago`)                                                                          | User approved; DST-aware IANA conversion                                                                                                                                                |
| Buffers                  | 60 min setup + 30 min breakdown + 60 min each-side travel placeholder                                                                                                | Provisional, operator adjustable                                                                                                                                                        |
| Event hold               | Expires 48h after consultation end; requires scheduled consultation                                                                                                  | Provisional                                                                                                                                                                             |
| Confirmation             | Authenticated operator confirms after consultation and agreed quote                                                                                                  | User approved                                                                                                                                                                           |
| Contract/deposit         | Track statuses; not required in demo, no payment/contract automation                                                                                                 | Provisional                                                                                                                                                                             |
| Morning invoicing        | 08:00 America/Chicago; app-tagged confirmed performances with prior-local-day end time automatically invoice from the agreed quote when billing metadata is complete | User approved; Calendar-driven, DST-aware, seven-day catch-up                                                                                                                           |
| Invoice terms            | USD, due 14 calendar days after issue, no real payment link                                                                                                          | Provisional                                                                                                                                                                             |
| Performer reply/reminder | Not used for new invoices; retained only to reconcile old-policy records                                                                                             | Superseded by Calendar-driven invoicing                                                                                                                                                 |
| Taxes                    | Explicit demo tax=0 assumption; real tax treatment unresolved                                                                                                        | Provisional, not tax advice                                                                                                                                                             |
| Audience                 | Demo operator and allowlisted test clients only for external workflow effects                                                                                        | Demo boundary                                                                                                                                                                           |

## Historical internal demo pricing examples (not public website content)

These values remain only for synthetic records, deterministic backend tests, and historical
evidence. Round two removes them from public pages; it does not rewrite issued snapshots or dismantle
the dormant assistant implementation. Seed editable package configuration, not hardcoded public
prose:

- Private gathering: 2 performance hours, solo demo format, base $700.
- Extended celebration: 3 performance hours, solo demo format, base $1,000.
- Corporate reception: 2 performance hours, base $900.
- Wedding/custom production: consultation required; don't auto-price multiple locations/ensembles.
- Extra performance time: $175 per 30 minutes, only after explicit agreement.
- Local travel demo: first 30 one-way miles included, then $2 per excess one-way mile.
  Distance must be measured or operator-entered; don't guess venue distance from a city name.
- Sound equipment/setup inclusion is an assumption to confirm; complex production remains quote-only.

Every estimate lists inputs, included services, surcharges, currency, assumptions and version.
Integer cents, deterministic arithmetic, no tax/fee invention. These numbers illustrate the flow;
the research comparator rates are not proof of what Justin charges. Agreed quote replaces the
estimate at confirmation and is the only pricing basis for an invoice, plus approved amendments.

## Matters for Justin after the demo

Actual packages, formats/repertoire, radius/travel, technical rider, setup/breaks, payment methods,
deposits/contracts/cancellation terms, invoice legal identity/address/tax, response hours, hold
policy, privacy/recording, approved assets, existing client DB, calendar and mailing account.
Keep these in the handoff; don't block demonstration of reasonable marked defaults.
