// Connects Strapi Live Preview's saved-update message to a normal page reload.

/** Install the narrow Strapi preview message listener.
 * @param browser Window-like object; injectable so origin/source checks can be tested.
 * @param allowedOrigins Exact CMS admin origins allowed to message this preview.
 * @returns Listener cleanup function.
 */
export function installPreviewRefresh(
  browser: Pick<Window, 'parent' | 'location' | 'addEventListener' | 'removeEventListener'>,
  allowedOrigins: string[],
): () => void {
  if (browser.parent === browser) return () => {};
  const origins = new Set(allowedOrigins);
  if (origins.size === 0) return () => {};

  const handleMessage = (event: MessageEvent): void => {
    if (event.source !== browser.parent || !origins.has(event.origin)) return;
    if (!event.data || typeof event.data !== 'object' || event.data.type !== 'strapiUpdate') return;
    browser.location.reload();
  };
  browser.addEventListener('message', handleMessage);
  // Strapi's CMS admin host may differ from the REST API host. The readiness
  // message contains no content, so announce only to the configured exact origins.
  for (const origin of origins) browser.parent.postMessage({ type: 'previewReady' }, origin);
  return () => browser.removeEventListener('message', handleMessage);
}

const config = typeof document === 'undefined'
  ? null
  : document.querySelector<HTMLMetaElement>('meta[name="preview-cms-origins"]');
if (config && typeof window !== 'undefined') {
  const allowedOrigins = config.content.split(',').map((origin) => origin.trim()).filter(Boolean);
  installPreviewRefresh(window, allowedOrigins);
}
