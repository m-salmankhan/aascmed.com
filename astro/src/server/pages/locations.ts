// Maps clinic summaries and dated route references for the shared location/update views.
import type { ClinicRecord } from '../../../../src/shared/content/models';
import type { PracticeSummary } from '../../../../src/components/practices/practice-archive';
import { clinicPath } from '../../../../src/shared/content/urls';
import { getPublishedRouteManifest } from '../content/routes';

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

/** Enumerate published dated update parameters without retaining expanded content.
 * @returns Year, month and relative slug for Astro static route generation.
 */
export async function serviceUpdatePaths() {
  const routes = await getPublishedRouteManifest('service-update');
  return routes.map(({ pathname }) => {
    const [, , year, month, ...segments] = pathname.replace(/\/$/, '').split('/');
    return { params: { year, month, slug: segments.join('/') } };
  });
}
