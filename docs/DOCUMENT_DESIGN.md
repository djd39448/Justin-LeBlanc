# Event brief and invoice design specification

Build both from typed records, not model-generated layout or arithmetic. Maintain templates as code.
Use shared Justin blue/navy brand, white background, dark text and light neutral separators.
Deliver responsive HTML email, plaintext alternative, print view and downloadable private PDF.
Use document/PDF skill render-and-inspect workflow when available.

## One-page event brief

US Letter portrait, 0.5-inch margins, clear 10–11pt minimum body type; no clipping or tiny text to
force a fit. Header: Justin LeBlanc / Event Brief, readable status badge, show ID and revision.
First row: date, performance time + timezone, venue/city, event type, guest count, agreed/estimated
price with explicit distinction. Next two-column sections:

- Client: host, company, contact method, email/phone, planner and on-site contact.
- Schedule: consultation, arrival/load-in, soundcheck, performance sets/breaks, finish/curfew.
- Music: atmosphere, requested genres/songs, key moments, format, MC requests.
- Venue: address, indoor/outdoor, stage/space, power/PA, parking/access, cover/weather, insurance.
- Commercial: package/quote version, itemized extras, deposit/remaining balance if applicable,
  billing contact/PO, hold expiry, questions requiring confirmation.

Footer: last updated, next action, private operator link. Unknowns are labeled **To confirm**.
Do not put raw transcripts into this brief. Bound free-text in intake so ordinary records fit one
page; preserve longer notes in the private record with a visible link and disclosure, never silent
truncation. Client-facing invitations contain only their necessary booking details.

## Invoice

Prominent INVOICE heading and invoice number. Seller and bill-to blocks, issued/due dates,
event/date/venue reference, clean item table (description, quantity, rate, amount), subtotal,
approved tax/discount/deposit rows and prominent amount due. Currency always visible.
Footer: payment instructions (demo placeholder, no fake live payment link), reply contact and terms.
Clear **DEMO — NOT A PAYMENT REQUEST** on demo PDF and email. Don't invent a legal entity,
tax registration, mailing address, bank account, payment status or invoice tax treatment.

Target one page for common invoices; long invoices may paginate with repeated header and totals
kept together. PDF filename uses invoice ID, not private customer name. BCC identity must not leak
in the visible recipient list or PDF. Use inline email styles, alt text, accessible tables and
test Gmail rendering at phone and desktop widths. No tracking pixel required.

## Visual QA evidence

Render synthetic brief, ordinary invoice and long-content edge cases. Inspect at full page and
100% scale for wrapping, totals alignment, page count, missing glyphs and visual hierarchy.
Store sanitized screenshots in `docs/evidence/`; private actual PDFs stay out of Git. Include
fixtures for long company/venue names, uncertain fields, deposits and one overtime amendment.
