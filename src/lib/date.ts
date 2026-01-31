import { TIME_ZONE } from "@/lib/constants";

type DateParts = {
  year: number;
  month: number;
  day: number;
};

function getZonedParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(date);
  const lookup: Record<string, string> = {};

  for (const part of parts) {
    if (part.type !== "literal") {
      lookup[part.type] = part.value;
    }
  }

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
  };
}

function toIsoDate(parts: DateParts): string {
  const month = String(parts.month).padStart(2, "0");
  const day = String(parts.day).padStart(2, "0");
  return `${parts.year}-${month}-${day}`;
}

function dateFromIsoAtNoon(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

export function formatISODateInTZ(date = new Date(), timeZone = TIME_ZONE): string {
  return toIsoDate(getZonedParts(date, timeZone));
}

export function todayISO(timeZone = TIME_ZONE): string {
  return formatISODateInTZ(new Date(), timeZone);
}

export function addDaysISO(isoDate: string, delta: number, timeZone = TIME_ZONE): string {
  const date = dateFromIsoAtNoon(isoDate);
  date.setUTCDate(date.getUTCDate() + delta);
  return formatISODateInTZ(date, timeZone);
}

export function yesterdayISO(timeZone = TIME_ZONE): string {
  return addDaysISO(todayISO(timeZone), -1, timeZone);
}

function weekdayIndex(date: Date, timeZone: string): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);

  switch (weekday) {
    case "Mon":
      return 1;
    case "Tue":
      return 2;
    case "Wed":
      return 3;
    case "Thu":
      return 4;
    case "Fri":
      return 5;
    case "Sat":
      return 6;
    default:
      return 0;
  }
}

export function getPresetRange(preset: string, timeZone = TIME_ZONE): {
  start: string;
  end: string;
} {
  const today = todayISO(timeZone);
  const todayDate = dateFromIsoAtNoon(today);
  const yesterday = addDaysISO(today, -1, timeZone);

  if (preset === "yesterday") {
    return { start: yesterday, end: yesterday };
  }

  if (preset === "today") {
    return { start: today, end: today };
  }

  if (preset === "week") {
    const weekday = weekdayIndex(todayDate, timeZone);
    const delta = weekday === 0 ? -6 : 1 - weekday;
    return { start: addDaysISO(today, delta, timeZone), end: today };
  }

  if (preset === "month") {
    const { year, month } = getZonedParts(todayDate, timeZone);
    const start = `${year}-${String(month).padStart(2, "0")}-01`;
    return { start, end: today };
  }

  return { start: today, end: today };
}

export function getMonthKeys(count: number, timeZone = TIME_ZONE): string[] {
  const today = todayISO(timeZone);
  const todayDate = dateFromIsoAtNoon(today);
  const { year, month } = getZonedParts(todayDate, timeZone);

  const keys: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const monthIndex = month - 1 - i;
    const date = new Date(Date.UTC(year, monthIndex, 15, 12));
    const parts = getZonedParts(date, timeZone);
    keys.push(`${parts.year}-${String(parts.month).padStart(2, "0")}`);
  }
  return keys;
}

export function getMonthRange(key: string): { start: string; end: string } {
  const [year, month] = key.split("-").map(Number);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const nextMonth = new Date(Date.UTC(year, month, 1, 12));
  const end = formatISODateInTZ(new Date(nextMonth.getTime() - 86400000));
  return { start, end };
}

export function listISODateRange(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDaysISO(cursor, 1);
  }
  return dates;
}

export function isWeekday(isoDate: string): boolean {
  const date = dateFromIsoAtNoon(isoDate);
  const day = weekdayIndex(date, TIME_ZONE);
  return day >= 1 && day <= 5;
}
