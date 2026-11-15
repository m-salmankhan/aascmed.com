// Provides compact route parameters and display dates for shared content pages.
import { formatOrdinalDate } from '../../utils/dates';
import { getBlogs, getClinics, getConditions, getProviders } from '../content/loaders';
import { blogPath, clinicPath, conditionPath, providerPath } from '../../content/urls';
import type { BlogRecord, ClinicRecord, ConditionRecord, ProviderRecord } from '../../content/models';

type StaticRecords = { blog: BlogRecord; clinic: ClinicRecord; condition: ConditionRecord; provider: ProviderRecord };
const collections = { blog: getBlogs, clinic: getClinics, condition: getConditions, provider: getProviders };
const paths: { [K in keyof StaticRecords]: (record: StaticRecords[K]) => string | null } = {
  blog: record => blogPath(record.slug),
  clinic: clinicPath,
  condition: record => conditionPath(record.slug),
  provider: record => providerPath(record.slug),
};

/** Pass full published records to static routes so rendering needs no detail re-fetch. */
export async function contentPaths<K extends keyof StaticRecords>(kind: K, prefix: string) {
  const result: { params: { slug: string }; props: { record: StaticRecords[K] } }[] = [];
  const seen = new Set<string>();
  for await (const record of collections[kind]('published') as AsyncIterable<StaticRecords[K]>) {
    const pathname = paths[kind](record);
    if (!pathname || seen.has(pathname)) throw new Error(`Invalid or duplicate published ${kind} route`);
    seen.add(pathname);
    result.push({ params: { slug: pathname.slice(prefix.length).replace(/\/$/, '') }, props: { record } });
  }
  return result;
}

/** Format a CMS date as the ordinal day, full month and year.
 * @param value ISO calendar date from a blog record.
 * @returns Display date, or an empty string when the CMS supplied none.
 */
export function blogDate(value: string | null | undefined): string {
  return formatOrdinalDate(value);
}
