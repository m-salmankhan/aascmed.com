// Parses legacy Netlify redirects and matches them to Astro request paths.
export interface RedirectRule {
  source: string;
  destination: string;
  status: number;
}
/** Resolved HTTP redirect target after wildcard and query-string substitution. */
export interface RedirectMatch {
  location: string;
  status: number;
}
/** Parse the existing Netlify redirect file for use by the SSR application.
 * @param text Contents of static/_redirects, including comments and blank lines.
 * @returns Valid redirect rules in file order; unsupported status codes and malformed lines are ignored.
 */
export function parseNetlifyRedirects(text: string): RedirectRule[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const [source, destination, status = "301"] = line.split(/\s+/);
      const code = Number(status);
      if (!source || !destination || ![301, 302, 303, 307, 308].includes(code)) {
        return undefined;
      }
      return { source, destination, status: code };
    })
    .filter((rule): rule is RedirectRule => Boolean(rule));
}
/** Find the first legacy redirect that does not point back to the requested path.
 * @param pathname Requested URL path, without its query string.
 * @param rules Parsed rules in precedence order, with optional wildcard sources.
 * @param search Original query string, including its leading question mark, or an empty string.
 * @returns Destination and HTTP status with the original query preserved, or undefined when no rule applies.
 */
export function findRedirect(
  pathname: string,
  rules: RedirectRule[],
  search = "",
): RedirectMatch | undefined {
  for (const rule of rules) {
    const escaped = rule.source
      .split("*")
      .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
      .join("(.*)");
    const matcher = new RegExp(`^${escaped}$`);
    const match = pathname.match(matcher);
    if (match) {
      const splat = match[1] || "";
      const destination = rule.destination.replace(/:splat/g, splat);
      // Netlify serves existing files before non-forced wildcard rules. In SSR,
      // also avoid redirecting /contact/ back to itself through /contact/*.
      if (destination === pathname) {
        continue;
      }
      const separator = destination.includes("?") ? "&" : "?";
      return {
        location: search ? `${destination}${separator}${search.slice(1)}` : destination,
        status: rule.status,
      };
    }
  }
}
