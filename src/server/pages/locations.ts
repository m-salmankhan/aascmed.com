// Maps clinic summaries and dated route references for the shared location/update views.
import type { ClinicRecord } from '../../content/models';
import type { PracticeSummary } from '../../components/practices/practice-archive';
import { clinicPath } from '../../content/urls';
import { getServiceUpdates } from '../content/loaders';
import { serviceUpdatePath } from '../../content/urls';
import type { ServiceUpdateRecord } from '../../content/models';

/** Map one normalized clinic to its archive/contact card values.
 * @param clinic Published or preview clinic with optional address/contact fields.
 * @returns Public clinic URL and display/map/contact values without content bodies.
 */
export function clinicSummary(clinic: ClinicRecord): PracticeSummary {
  return {
    slug: clinicPath(clinic) || '/clinics/',
    clinic_name: clinic.clinicName || 'Untitled Clinic',
    latitude: clinic.location?.latitude ?? 0,
    longitude: clinic.location?.longitude ?? 0,
    address: clinic.location?.address || '',
    phone: clinic.contact?.phone || '',
    fax: clinic.contact?.fax || '',
  };
}

/** Pass full published updates with their calendar route parameters to static pages. */
export async function serviceUpdatePaths() {
  const result: {
    params: { year: string; month: string; slug: string };
    props: { record: ServiceUpdateRecord };
  }[] = [];
  const seen = new Set<string>();
  for await (const record of getServiceUpdates('published')) {
    const pathname = serviceUpdatePath(record);
    if (!pathname || seen.has(pathname))
      throw new Error('Invalid or duplicate published service-update route');
    seen.add(pathname);
    const [, , year, month, ...segments] = pathname
      .replace(/\/$/, '')
      .split('/');
    result.push({
      params: { year, month, slug: segments.join('/') },
      props: { record },
    });
  }
  return result;
}
