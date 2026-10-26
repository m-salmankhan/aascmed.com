import type { ClinicRecord } from "./models.ts";

function to12Hr(time: string): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const hour = Number.parseInt(hours, 10);
  if (!Number.isFinite(hour)) return "";
  if (hour <= 12) return hour === 12 ? `${hour}:${minutes} p.m.` : `${hour}:${minutes} a.m.`;
  return `${hour - 12}:${minutes} p.m.`;
}

function formatHours(startTime?: string, endTime?: string): string {
  if (!startTime || !endTime) return "Closed";
  const start = to12Hr(startTime);
  const end = to12Hr(endTime);
  return start && end ? `${start} - ${end}` : "Closed";
}

export function getClinicHoursForDisplay(hours: ClinicRecord["hours"] = []) {
  const openingTimes = hours.map((day) => ({
    day: day.day || "",
    hours: day.open && day.openingHours ? formatHours(day.openingHours.startTime, day.openingHours.endTime) : "Closed",
    hours24: day.open && day.openingHours?.startTime && day.openingHours?.endTime
      ? `${day.openingHours.startTime} - ${day.openingHours.endTime}` : "Closed",
  }));
  const shotTimes = hours.filter((day) => day.open && day.shotHours).map((day) => ({
    day: day.day || "",
    hours: day.shotHours ? formatHours(day.shotHours.startTime, day.shotHours.endTime) : "Closed",
  }));
  return { openingTimes, shotTimes };
}
