const DEFAULT_TIME_ZONE = "Europe/Istanbul";

export function dateKey(date = new Date(), timeZone = DEFAULT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function daysFromToday(days: number) {
  return dateKey(new Date(Date.now() + days * 86_400_000));
}

export function nextMonthlyDate(requestedDay: number) {
  const [yearValue, monthValue, dayValue] = dateKey().split("-").map(Number);
  const safeDay = Math.min(Math.max(Math.trunc(Number(requestedDay) || 1), 1), 31);
  let year = yearValue;
  let month = monthValue;
  if (dayValue >= safeDay) {
    month += 1;
    if (month > 12) { month = 1; year += 1; }
  }
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(Math.min(safeDay, lastDay)).padStart(2, "0")}`;
}

export function monthInfo(offset = 0) {
  const [currentYear, currentMonth] = dateKey().split("-").map(Number);
  const anchor = new Date(Date.UTC(currentYear, currentMonth - 1 + offset, 15, 12));
  const year = anchor.getUTCFullYear();
  const month = anchor.getUTCMonth() + 1;
  const key = `${year}-${String(month).padStart(2, "0")}`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    key,
    start: `${key}-01`,
    end: `${key}-${String(lastDay).padStart(2, "0")}`,
    label: anchor.toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" }),
    shortLabel: anchor.toLocaleDateString("tr-TR", { month: "short", timeZone: "UTC" }),
  };
}

export function isValidDateKey(value: unknown) {
  const text = String(value || "");
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() + 1 === month && parsed.getUTCDate() === day;
}
