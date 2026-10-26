import { civilDateParts } from "./urls.ts";

/** Match the existing "Do MMMM YYYY" display while keeping the stored civil day stable in every timezone. */
export function formatContentDate(value: string | null | undefined): string {
  if (!value) return "";
  const parts = civilDateParts(value);
  if (!parts) return value;
  const date = new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00Z`);
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(date));
  const month = new Intl.DateTimeFormat("en-US", { month: "long", timeZone: "UTC" }).format(date);
  const dayOfCentury = day % 100;
  const suffix = dayOfCentury >= 11 && dayOfCentury <= 13 ? "th"
    : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix} ${month} ${parts.year}`;
}
