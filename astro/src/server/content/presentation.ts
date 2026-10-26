/** Preserve the existing Gatsby `Do MMMM YYYY` display format for archive dates. */
export function formatContentDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  const day = Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(date));
  const monthAndYear = new Intl.DateTimeFormat("en-US", {
    month: "long", year: "numeric", timeZone: "UTC",
  }).format(date);
  const suffix = day % 100 >= 11 && day % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[day % 10] ?? "th";
  return `${day}${suffix} ${monthAndYear}`;
}
