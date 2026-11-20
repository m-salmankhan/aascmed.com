/** Share the exact CMS origins used for iframe framing and saved-update messages. */
export function previewOrigins(): string[] {
  const configured = [process.env.STRAPI_API_URL, ...(process.env.PREVIEW_FRAME_ORIGINS || '').split(',')];
  const origins: string[] = [];
  for (const value of configured) {
    if (!value?.trim()) continue;
    try {
      const url = new URL(value.trim());
      const local = url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
      if ((url.protocol === 'https:' || local) && !url.username && !url.password && !url.search && !url.hash) origins.push(url.origin);
    } catch {
      // Invalid settings grant no framing or message access.
    }
  }
  return [...new Set(origins)];
}
