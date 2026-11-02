// Reload saved drafts only when the configured CMS parent requests it.
/** @param {Window} browser Preview window.
 * @param {string[]} allowedOrigins Exact trusted CMS editor origins.
 * @returns {() => void} Listener cleanup.
 */
export function installPreviewRefresh(browser, allowedOrigins) {
  if (browser.parent === browser || allowedOrigins.length === 0) return () => {};
  const origins = new Set(allowedOrigins);
  const handleMessage = (event) => {
    if (event.source !== browser.parent || !origins.has(event.origin)) return;
    if (!event.data || typeof event.data !== 'object' || event.data.type !== 'strapiUpdate') return;
    browser.location.reload();
  };
  browser.addEventListener('message', handleMessage);
  for (const origin of origins) browser.parent.postMessage({ type: 'previewReady' }, origin);
  return () => browser.removeEventListener('message', handleMessage);
}

const config = typeof document === 'undefined' ? null : document.querySelector('meta[name="preview-cms-origins"]');
if (config && typeof window !== 'undefined') {
  installPreviewRefresh(window, config.content.split(',').filter(Boolean));
}
