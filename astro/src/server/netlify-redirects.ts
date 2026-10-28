export interface RedirectRule {
  source: string;
  destination: string;
  status: number;
}

/** Parse the existing static/_redirects file so preview and static hosting share rules. */
export function parseNetlifyRedirects(text: string): RedirectRule[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [source, destination, status = '301'] = line.split(/\s+/);
      const code = Number(status);
      if (!source || !destination || ![301, 302, 303, 307, 308].includes(code)) return undefined;
      return { source, destination, status: code };
    })
    .filter((rule): rule is RedirectRule => Boolean(rule));
}

export function findRedirect(pathname: string, rules: RedirectRule[], search = '') {
  for (const rule of rules) {
    const escaped = rule.source
      .split('*')
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('(.*)');
    const matcher = new RegExp(`^${escaped}$`);
    const match = pathname.match(matcher);
    if (match) {
      const splat = match[1] || '';
      const destination = rule.destination.replace(/:splat/g, splat);
      // Netlify serves existing files before non-forced wildcard rules. In SSR,
      // also avoid redirecting /contact/ back to itself through /contact/*.
      if (destination === pathname) continue;
      const separator = destination.includes('?') ? '&' : '?';
      return { location: search ? `${destination}${separator}${search.slice(1)}` : destination, status: rule.status };
    }
  }
}
