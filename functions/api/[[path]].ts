/** Proxies only this site's API to the dedicated Node origin.
 * Dependencies: Cloudflare Pages fetch runtime. Consumers: browser forms and operator UI.
 * Why: same-origin requests keep deployment configuration server-side and fail visibly when absent. */
export async function onRequest(context: {
  request: Request;
  env: { API_ORIGIN?: string };
}): Promise<Response> {
  if (!context.env.API_ORIGIN)
    return Response.json(
      {
        error: 'api_not_configured',
        message: 'The demo API is being connected. Please try again shortly.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
    );
  const incoming = new URL(context.request.url);
  const base = new URL(context.env.API_ORIGIN);
  if (base.protocol !== 'https:')
    return Response.json({ error: 'invalid_api_origin' }, { status: 503 });
  const target = new URL(incoming.pathname + incoming.search, base);
  try {
    const response = await fetch(new Request(target, context.request), {
      redirect: 'manual',
      signal: AbortSignal.timeout(95000),
    });
    if (response.status >= 500) throw new Error('Upstream unavailable');
    return response;
  } catch {
    return Response.json(
      {
        error: 'api_unavailable',
        message:
          'The demo backend is currently unavailable. Your browser draft remains saved; please try again after service access is connected.',
      },
      { status: 503, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' } },
    );
  }
}
