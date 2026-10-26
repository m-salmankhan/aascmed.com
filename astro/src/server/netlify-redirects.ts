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
      if (!source || !destination || !Number.isInteger(code)) return undefined;
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
      const location = `${destination}${search}`;
      // Netlify's `/*` patterns can also match their directory root. Avoid
      // turning a canonical route into a redirect to itself (for example,
      // `/contact/*` matching `/contact/`).
      if (location === `${pathname}${search}`) continue;
      return { location, status: rule.status };
    }
  }
}
