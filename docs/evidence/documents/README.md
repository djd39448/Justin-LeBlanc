# Synthetic Document Visual QA

Verified: 2026-09-21

These artifacts were generated from the repository's synthetic fixtures with:

```powershell
npx tsx scripts/render-documents.ts --json
```

The PDFs were reopened with Poppler, checked with `pdfinfo`, rendered at 120 DPI, and every rendered page was inspected at original resolution. All pages are US Letter (`612 x 792` points). The fixtures use only synthetic names, addresses, identifiers, and `example.test` email addresses.

| Artifact                                                 | Pages | SHA-256                                                            | Visual result                                                                                                                                                                 |
| -------------------------------------------------------- | ----: | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Event brief PDF](synthetic-event-brief.pdf)             |     1 | `5b1f9897d87cda9fce987de8bbe6078fb5f2da7e7c3681f622578841d3d3a6c2` | Pass: all sections fit on one page; long venue, company, schedule, access, and commercial values wrap within their cards; footer and `/admin?show=` operator link are visible |
| [Ordinary invoice PDF](synthetic-invoice.pdf)            |     1 | `fcbdf824fb28b91fa64849b408918feccb72b4b631d5ef7a2798631e43ffaa75` | Pass: header, disclosure, billing blocks, line items, totals, terms, and footer fit on one page with no collision or clipping                                                 |
| [Long-edge invoice PDF](synthetic-invoice-long-edge.pdf) |     2 | `f939c31e92428369694cd63794321205f5a0d5406189b49c5cf49c0ae9e1219b` | Pass: 18 long line items wrap cleanly; the table header repeats on page 2; totals, terms, and footer remain together and readable                                             |

Original rendered-page evidence:

- [event brief page 1](event-brief-page-1.png)
- [ordinary invoice page 1](invoice-page-1.png)
- [long invoice page 1](invoice-long-page-1.png)
- [long invoice page 2](invoice-long-page-2.png)

Inspection found no overlapping text, clipped content, broken table boundaries, missing glyphs, black rendering blocks, orphaned totals, or unreadable footer text. These artifacts verify template layout only; they do not prove live customer data, payment terms, invoice delivery, or provider acceptance.
