# Website design research

Reviewed 2026-09-21. Public claims below are observations of published pages, not independent
verification. Comparison sites informed layout decisions only; their copy, claims, assets, rates,
and code are not reused.

## Justin baseline

| Source                                                    | Desktop observations                                                                                                                                                                                                                                                                                               | Mobile/accessibility implications                                                                                                                                                                    | Decision                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Justin LeBlanc Music](https://justinleblancmusic.com/)   | Full-bleed electric-blue textured hero, cut-out portrait with acoustic guitar, centered uppercase name, thin letter-spaced supporting type. The phone and broad “Versatile live music” line appear over the image. Dark navigation has very low contrast and the booking action begins below the opening viewport. | Keep the recognizable cobalt field and guitar portrait, but place a high-contrast value statement and 48px booking action in the opening viewport. Use a solid navy header and visible focus styles. | Retain the visual identity; rebuild hierarchy and contrast.                           |
| [Contact](https://justinleblancmusic.com/contact)         | Blue reading field, generous spacing, contact and social links, “Old Fiery Soul” promotion further down the page. The current inquiry form is name/email/phone plus two free-text fields.                                                                                                                          | A shorter step at a time will reduce the dense form burden on phones. Do not treat album promotion as evidence of current event repertoire.                                                          | Use a three-step structured form, with optional details and explicit unknown choices. |
| [Instagram @jus10sense](https://instagram.com/jus10sense) | Public profile name and website link match Justin. The visible grid uses recurring performance flyers and guitar portraits. A login overlay limits reliable inspection.                                                                                                                                            | Social posts are useful outbound context, but not source material for current packages, schedule, testimonials, or rates.                                                                            | Link to the verified profile; do not redistribute post art.                           |
| [YouTube @jus10sense](https://youtube.com/@jus10sense)    | Public channel identity matches, with 11 videos visible. The channel mixes music and family recital videos; the newest visible music cover was two years old at review.                                                                                                                                            | Avoid embedding an arbitrary channel item as a definitive booking sample. Give visitors a clear outbound “visit channel” option pending Justin-approved media.                                       | Use an honest media placeholder and linked channel, never autoplay.                   |

Authentic hero asset observed at
`https://img1.wsimg.com/isteam/ip/1f0321c5-a636-4c34-aef3-cc4637de009d/jlsmf-43-structural-blue-responsive-hero.png/:/rs=w:1535,m`.
It is used on Justin's current site and retained only for this isolated demo, with final reuse
approval still required from Justin before launch.

## Comparable private-event musician sites

| Source                                                                   | Useful pattern                                                                                                                                             | Pattern rejected                                                                                               |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [Darian Hernandez](https://darianhernandez.com/)                         | Specific event categories next to real performer photography; social proof and booking are easy to locate; rates use visible units.                        | Large empty opening band and small dense body copy. No claims, reviews, rates, or assets transfer to Justin.   |
| [Ryan Pinnick](https://ryanpinnickmusic.com/epk-private-events-planners) | Planner-oriented detail covers song list, event information, equipment, and format questions before the inquiry. Strong performer-specific texture.        | Testimonial-led hierarchy, narrow decorative type, and distressed treatment reduce readability.                |
| [Charles Stewart Music](https://www.charlesstewartmusic.com/)            | Immediate event-use heading with equal “watch” and “request booking information” paths. Restrained two-tone palette and large editorial type feel premium. | A text-only hero would discard Justin's strongest existing visual asset.                                       |
| [Tave Sax](https://tavesax.com/)                                         | Short value proposition, paired rates/booking actions, and compact feature cards fit the opening viewport.                                                 | Generic dark product-card styling and an empty media frame feel more like a template than a musician identity. |

## Concrete design decisions

1. Use navy `#061744`, cobalt `#173eae`, bright blue `#315df5`, warm paper `#f5f0e7`, and
   coral `#ef6a56` as a small accent. These preserve the blue identity while meeting AA contrast.
2. Use a compact uppercase sans-serif wordmark with an editorial serif for large headings. Avoid
   script fonts and novelty display faces; the portrait and blue texture carry the personality.
3. Hero layout is a two-column blue stage at 768px+, with copy left and Justin/guitar image right.
   Phones crop from center-right and keep the CTA in the first 700px. Image has explicit dimensions.
4. Put `Check your date & plan your event` first and `Hear Justin` second. Never bury conversion
   behind chat. A fixed mobile action bar appears only below the hero and never covers form controls.
5. Explain event atmosphere and the three-step process before pricing examples. Demo prices are
   clearly labeled as workflow examples and never described as Justin's published rates.
6. Use authentic source links for listening until Justin approves a specific embedded sample.
   No autoplay and no redistributed comparison/social imagery.
7. Form steps are Contact, Event, and Details & review. Required fields stay minimal; date,
   production, access, and budget support explicit unknown states. Progress, errors, back/edit,
   save/resume, and final summary are keyboard operable.
8. Every public fact remains in initial semantic HTML. `/reference`, JSON-LD, sitemap, and
   `llms.txt` repeat the same scope and limitations. The demo emits `noindex, nofollow` globally.
9. Motion is limited to short opacity/translate reveals and disabled with `prefers-reduced-motion`.
   Controls are at least 44px, inputs 16px, and focus uses a thick coral/white double ring.

## Gaps before launch

- Justin must approve reuse of the current hero image and select current booking media.
- Justin's actual packages, pricing, repertoire, travel, production, and availability remain
  unverified. Demo examples stay labeled and editable.
- Current public show entries require venue-by-venue verification before reproduction. The demo
  links to Justin's live source and does not claim free admission.
