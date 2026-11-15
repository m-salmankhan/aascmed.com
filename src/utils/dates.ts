const longDate = new Intl.DateTimeFormat('en-US', {
  timeZone: 'UTC',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function isoDate(value: string | null | undefined): Date | null {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(
      value,
    )
  )
    return null;
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const calendar = new Date(Date.UTC(year, month - 1, day));
  if (
    calendar.getUTCFullYear() !== year ||
    calendar.getUTCMonth() !== month - 1 ||
    calendar.getUTCDate() !== day
  )
    return null;
  const date = new Date(
    value.includes('T') && !/(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
      ? `${value}Z`
      : value,
  );
  return Number.isFinite(date.getTime()) ? date : null;
}

export function ordinal(day: number): string {
  const suffix =
    day % 100 >= 11 && day % 100 <= 13
      ? 'th'
      : ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ||
        'th';
  return `${day}${suffix}`;
}

export function formatOrdinalDate(value: string | null | undefined): string {
  const date = isoDate(value);
  if (!date) return '';
  const parts = longDate.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)!.value;
  return `${ordinal(Number(part('day')))} ${part('month')} ${part('year')}`;
}

export function formatReviewDate(value: string | null | undefined): string {
  const date = isoDate(value);
  return date ? longDate.format(date) : '';
}

// Service update URLs and display dates retain the CMS's written calendar day.
export function formatServiceUpdateDate(
  value: string | null | undefined,
): string {
  return isoDate(value) ? formatOrdinalDate(value!.slice(0, 10)) : '';
}
