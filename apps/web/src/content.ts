/**
 * Defines reviewed public copy shared across the static website.
 *
 * Dependencies: None; this is a typed content module.
 * Depended on by: Public Astro pages and the shared footer.
 * Why this exists: Shared facts stay consistent across human and agent-readable surfaces.
 */
export const site = {
  name: 'Justin LeBlanc',
  title: 'Justin LeBlanc | Private Event Music in Houston',
  description:
    'Plan private-event music with Justin LeBlanc in Houston and beyond. Share your date, setting, and atmosphere, then request a consultation.',
  canonicalOrigin: 'https://justinleblancmusic.50by50.dev',
  currentSite: 'https://justinleblancmusic.com/',
  instagram: 'https://instagram.com/jus10sense',
  youtube: 'https://youtube.com/@jus10sense',
  facebook: 'https://facebook.com/250866058945459',
  reviewedAt: '2026-09-21',
} as const;

export const faqs = [
  {
    question: 'Can I ask about a date before every detail is settled?',
    answer:
      'Yes. Share the date or mark it flexible, the city, and the atmosphere you have in mind. Unknown venue, production, or access details can stay unknown for follow-up.',
  },
  {
    question: 'Does an inquiry reserve the performance date?',
    answer:
      'No. An inquiry starts the conversation. In the demo workflow, a tentative hold is created only with a scheduled consultation, and a person confirms the booking after the consultation and agreed quote.',
  },
  {
    question: "Are the prices on this demo Justin's published rates?",
    answer:
      "No. They are editable examples used to demonstrate estimation and invoicing. Justin's actual packages, rates, travel policy, and production inclusions must be approved before launch.",
  },
  {
    question: 'Can I ask for a specific song or part of the event?',
    answer:
      'Add requests and the moments you are planning to the inquiry. Repertoire, arrangements, MC duties, and performance format are discussed and confirmed rather than assumed.',
  },
  {
    question: 'Where can I hear Justin before I inquire?',
    answer:
      "Use the linked YouTube channel or Justin's current website. A current booking sample will be embedded only after Justin approves it. Public show details remain on the live source until each listing is verified.",
  },
] as const;

export const demoPackages = [
  {
    name: 'Private gathering',
    detail: 'Solo demo format · 2 performance hours',
    price: '$700 demo base',
  },
  {
    name: 'Extended celebration',
    detail: 'Solo demo format · 3 performance hours',
    price: '$1,000 demo base',
  },
  {
    name: 'Corporate reception',
    detail: '2 performance hours',
    price: '$900 demo base',
  },
  {
    name: 'Wedding or custom production',
    detail: 'Multiple moments, locations, or formats',
    price: 'Consultation required',
  },
] as const;
