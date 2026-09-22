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
    'Private-event music with Justin LeBlanc. Start planning your gathering, celebration, reception, or wedding inquiry.',
  canonicalOrigin: 'https://justinleblancmusic.50by50.dev',
  currentSite: 'https://justinleblancmusic.com/',
  instagram: 'https://instagram.com/jus10sense',
  youtube: 'https://youtube.com/@jus10sense',
  facebook: 'https://facebook.com/250866058945459',
  // Retained solely for the dormant, non-public voice component's isolated integration contract.
  demoPhone: '+18325013799',
  demoPhoneDisplay: '(832) 501-3799',
} as const;

export const faqs = [
  {
    question: 'Can I reach out before every detail is settled?',
    answer:
      'Absolutely. Tell me the date or mark it flexible, your city, and the feeling you want. We can sort out the rest together.',
  },
  {
    question: 'Does an inquiry reserve the performance date?',
    answer:
      'No. Your inquiry starts our conversation. I confirm a performance only after we have talked through the details and agreed on the plan.',
  },
  {
    question: 'Can I request a song or a particular event moment?',
    answer:
      'Yes. Add the songs or moments you are imagining to your inquiry, and I will talk through what fits your event.',
  },
  {
    question: 'What details should I share about the room?',
    answer:
      'I will ask about the room, timing, and what support is already in place so we can make a thoughtful plan.',
  },
  {
    question: 'What does my budget tell you?',
    answer:
      'It is simply helpful planning context. It is not a quote, a charge, or a commitment on either side.',
  },
] as const;
