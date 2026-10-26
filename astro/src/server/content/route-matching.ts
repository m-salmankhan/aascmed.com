import type { ClinicRecord, ServiceUpdateRecord } from "../../../../src/shared/content/models.ts";
import { clinicPath, serviceUpdatePath } from "../../../../src/shared/content/urls.ts";

function isPathnameFor(pathname: string, expectedWithSlash: string): boolean {
  return pathname === expectedWithSlash || pathname === expectedWithSlash.slice(0, -1);
}

export function matchesClinicRoute(pathname: string, slug: string, clinic: ClinicRecord | null | undefined): boolean {
  if (!clinic || !slug) return false;
  const expected = clinicPath(clinic);
  return expected !== null && expected === `/clinics/${slug}/` && isPathnameFor(pathname, expected);
}

export function matchesServiceUpdateRoute(
  pathname: string,
  year: string,
  month: string,
  slug: string,
  update: ServiceUpdateRecord | null | undefined,
): boolean {
  if (!update || !/^\d{4}$/.test(year) || !/^(0[1-9]|1[0-2])$/.test(month) || !slug) return false;
  const expected = serviceUpdatePath(update);
  const requested = `/service-updates/${year}/${month}/${slug}/`;
  return expected !== null && expected === requested && isPathnameFor(pathname, requested);
}
