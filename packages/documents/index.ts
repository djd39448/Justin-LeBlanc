/** Public document surface. Dependencies: local templates/PDF renderer. Consumers: API and CLI. */
export {
  EventBriefSchema,
  renderEventBrief,
  renderInvoice,
  type EventBrief,
  type RenderedDocument,
} from './templates.js';
export { renderHtmlPdf, type PdfRenderResult } from './pdf.js';
