import type { ClinicRecord, ServiceUpdateRecord } from "../../../../src/shared/content/models.ts";
import { formatContentDate } from "../../../../src/shared/content/dates.ts";
import { clinicPath, serviceUpdatePath } from "../../../../src/shared/content/urls.ts";
import type { PracticeSummary } from "../../../../src/components/practices/practice-archive.tsx";

export function toClinicArchiveItems(clinics: ClinicRecord[]): PracticeSummary[] {
  return clinics.flatMap((clinic) => {
    const slug = clinicPath(clinic);
    if (!slug) return [];
    return [{
      slug,
      clinic_name: clinic.clinicName || "Untitled Clinic",
      longitude: clinic.location?.longitude ?? 0,
      latitude: clinic.location?.latitude ?? 0,
      address: clinic.location?.address || "",
      phone: clinic.contact?.phone || "",
      fax: clinic.contact?.fax || "",
    }];
  });
}

export function toServiceUpdateArchiveItems(updates: ServiceUpdateRecord[]) {
  return updates.flatMap((update) => {
    const slug = serviceUpdatePath(update);
    if (!slug) return [];
    return [{
      slug,
      title: update.title || "Untitled",
      date: formatContentDate(update.date),
      description: update.description || "",
    }];
  });
}

/** Convert a canonical dated route to Astro's catch-all parameter shape. */
export function getServiceUpdateRouteParams(update: ServiceUpdateRecord): { year: string; month: string; slug: string } | null {
  const pathname = serviceUpdatePath(update);
  if (!pathname) return null;
  const segments = pathname.slice("/service-updates/".length).replace(/\/$/, "").split("/");
  const [year, month, ...slug] = segments;
  if (!/^\d{4}$/.test(year || "") || !/^(0[1-9]|1[0-2])$/.test(month || "") || !slug.length) return null;
  return { year, month, slug: slug.join("/") };
}
