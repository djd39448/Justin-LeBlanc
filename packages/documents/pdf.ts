/**
 * Prints validated document HTML to private PDF files with Chromium.
 *
 * Dependencies:
 *   - Playwright: Browser-grade CSS layout and PDF generation.
 *   - node:fs/path: Creates private output directories and atomically renames results.
 *
 * Depended on by:
 *   - billing service: Materializes immutable invoice attachments.
 *   - scripts/render-documents: Produces visual QA fixtures.
 *
 * Why this exists:
 *   Browser printing keeps responsive email and PDF typography aligned while allowing page QA.
 */
import { mkdir, rename, rm } from 'node:fs/promises';
import { dirname } from 'node:path';

import { chromium } from 'playwright';

export interface PdfRenderResult {
  path: string;
  pagesEstimated: number;
}

/**
 * Prints trusted template HTML to a US Letter PDF using a temporary sibling file.
 *
 * Args: html - complete internally rendered document; outputPath - private destination.
 * Returns: Destination and a conservative page estimate from rendered page height.
 * Throws: Actionable browser/layout errors without exposing document content.
 */
export async function renderHtmlPdf(html: string, outputPath: string): Promise<PdfRenderResult> {
  await mkdir(dirname(outputPath), { recursive: true });
  const temporaryPath = `${outputPath}.partial`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 816, height: 1056 } });
    await page.setContent(html, { waitUntil: 'load' });
    await page.emulateMedia({ media: 'print' });
    const height = await page.locator('body').evaluate((body) => body.scrollHeight);
    await page.pdf({
      path: temporaryPath,
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
      displayHeaderFooter: false,
    });
    await rename(temporaryPath, outputPath);
    return { path: outputPath, pagesEstimated: Math.max(1, Math.ceil(height / 1056)) };
  } catch (error) {
    await rm(temporaryPath, { force: true });
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(
      `PDF render failed for ${outputPath}: ${message}. Install Playwright Chromium and retry.`,
    );
  } finally {
    await browser.close();
  }
}
