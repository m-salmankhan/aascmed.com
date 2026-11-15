/** One JSON-LD entity, with schema.org properties supplied by the route. */
export type StructuredDataEntry = Record<string, unknown>;
/** JSON-LD for one entity or multiple entities on the same page. */
export type StructuredData = StructuredDataEntry | StructuredDataEntry[];
/** Serialize JSON-LD without allowing authored HTML to close its script element.
 * @param value One schema.org entity or an array of entities supplied by the route.
 * @returns JSON text with literal less-than signs escaped; parsing recovers the original data.
 */
export function serializeStructuredData(value: StructuredData): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
