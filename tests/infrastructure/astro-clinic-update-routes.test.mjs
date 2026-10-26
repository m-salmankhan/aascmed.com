import assert from "node:assert/strict";
import test from "node:test";

import { formatContentDate } from "../../src/shared/content/dates.ts";
import { getClinicHoursForDisplay } from "../../src/shared/content/clinic-hours.ts";
import { sortByDateDescending } from "../../src/shared/content/urls.ts";
import { toClinicArchiveItems, toServiceUpdateArchiveItems } from "../../astro/src/server/content/clinic-update-items.ts";
import { matchesClinicRoute, matchesServiceUpdateRoute } from "../../astro/src/server/content/route-matching.ts";

test("clinic archive items keep the clinic-name fallback and selected contact details", () => {
  const [clinic] = toClinicArchiveItems([{
    id: "crest-hill", title: "Crest Hill", slug: null, clinicName: "Crest Hill",
    location: { address: "123 Main St", latitude: 41.2, longitude: -72.1 },
    contact: { phone: "555-0100", fax: "555-0101" },
  }]);
  assert.deepEqual(clinic, {
    slug: "/clinics/crest-hill/", clinic_name: "Crest Hill", latitude: 41.2, longitude: -72.1,
    address: "123 Main St", phone: "555-0100", fax: "555-0101",
  });
  assert.deepEqual(toClinicArchiveItems([{ id: "no-name", title: "", slug: null, clinicName: null }]), []);
});

test("clinic detail route matching accepts the captured slug and its fallback but rejects mismatches", () => {
  const clinic = { id: "crest-hill", title: "Crest Hill", slug: null, clinicName: "Crest Hill" };
  assert.equal(matchesClinicRoute("/clinics/crest-hill/", "crest-hill", clinic), true);
  assert.equal(matchesClinicRoute("/clinics/crest-hill", "crest-hill", clinic), true);
  assert.equal(matchesClinicRoute("/clinics/wrong-clinic/", "wrong-clinic", clinic), false);
  assert.equal(matchesClinicRoute("/clinics/crest-hill/", "crest-hill", null), false);
});

test("clinic hours tolerate missing opening and shot times", () => {
  assert.deepEqual(getClinicHoursForDisplay(), { openingTimes: [], shotTimes: [] });
  assert.deepEqual(getClinicHoursForDisplay([
    { day: "Monday", open: true, openingHours: { startTime: "09:00" }, shotHours: { startTime: "10:00", endTime: "13:00" } },
    { day: "Tuesday", open: false, openingHours: { startTime: "09:00", endTime: "17:00" }, shotHours: { startTime: "10:00", endTime: "13:00" } },
    { day: "Wednesday", open: true, openingHours: { startTime: "09:00", endTime: "17:00" } },
  ]), {
    openingTimes: [
      { day: "Monday", hours: "Closed", hours24: "Closed" },
      { day: "Tuesday", hours: "Closed", hours24: "Closed" },
      { day: "Wednesday", hours: "9:00 a.m. - 5:00 p.m.", hours24: "09:00 - 17:00" },
    ],
    shotTimes: [{ day: "Monday", hours: "10:00 a.m. - 1:00 p.m." }],
  });
});

test("service update dates display and route by their stored civil date, independent of local timezone", () => {
  const update = { id: "closure", title: "Closure", slug: "office/closure", date: "2025-02-14T00:30:00+14:00" };
  assert.equal(formatContentDate(update.date), "14th February 2025");
  assert.equal(matchesServiceUpdateRoute("/service-updates/2025/02/office/closure/", "2025", "02", update.slug, update), true);
  assert.equal(matchesServiceUpdateRoute("/service-updates/2025/02/office/closure", "2025", "02", update.slug, update), true);
  assert.equal(matchesServiceUpdateRoute("/service-updates/2025/03/office/closure/", "2025", "03", update.slug, update), false);
  assert.equal(matchesServiceUpdateRoute("/service-updates/2025/13/office/closure/", "2025", "13", update.slug, update), false);
  assert.equal(matchesServiceUpdateRoute("/service-updates/25/02/office/closure/", "25", "02", update.slug, update), false);
  assert.equal(matchesServiceUpdateRoute("/service-updates/2025/02/unknown/", "2025", "02", "unknown", update), false);
});

test("service update archive items omit unroutable dates and keep stable date sorting", () => {
  const sorted = sortByDateDescending([
    { id: "old", slug: "old", title: "Old", date: "2025-01-01", description: "" },
    { id: "new", slug: "new", title: "New", date: "2025-02-14", description: "Latest" },
  ]);
  const items = toServiceUpdateArchiveItems([...sorted, { id: "bad", slug: "bad", title: "Bad", date: "2025-02-30" }]);
  assert.deepEqual(items.map(({ slug, date }) => ({ slug, date })), [
    { slug: "/service-updates/2025/02/new/", date: "14th February 2025" },
    { slug: "/service-updates/2025/01/old/", date: "1st January 2025" },
  ]);
});
