// Dates are stored as wall-clock strings ("2026-11-24" or "2026-11-24 10:35:00"):
// format them without timezone conversion.

function parts(value: string) {
  const [d, t] = value.replace("T", " ").split(" ");
  const [y, m, day] = d.split("-").map(Number);
  return { date: new Date(Date.UTC(y, m - 1, day)), time: t?.slice(0, 5) ?? null };
}

const fmt = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", ...options });

export function formatDay(value: string) {
  return fmt({ weekday: "short", day: "numeric", month: "short" }).format(parts(value).date);
}

export function formatLongDay(value: string) {
  const s = fmt({ weekday: "long", day: "numeric", month: "long" }).format(parts(value).date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatShortDate(value: string) {
  return fmt({ day: "numeric", month: "short", year: "numeric" }).format(parts(value).date);
}

// Midnight means "date only" (see optionalDateTime in forms.ts).
export function formatTime(value: string) {
  const { time } = parts(value);
  return time === "00:00" ? null : time;
}

export function formatDateTime(value: string) {
  const time = formatTime(value);
  return time ? `${formatDay(value)} · ${time}` : formatDay(value);
}

export function formatRange(start: string | null, end: string | null) {
  if (start && end) return `${formatShortDate(start)} → ${formatShortDate(end)}`;
  if (start) return `À partir du ${formatShortDate(start)}`;
  return "Dates à définir";
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string) {
  return Math.round((parts(to).date.getTime() - parts(from).date.getTime()) / 86400000);
}

// Every day of the trip, inclusive.
export function eachDay(start: string, end: string) {
  const days: string[] = [];
  const cursor = parts(start).date;
  const last = parts(end).date;
  while (cursor <= last && days.length < 400) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

export function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
}

const euros = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });

export function formatEuros(amount: number) {
  return euros.format(amount);
}

export function formatEuroRange(min: number, max: number) {
  return min === max ? euros.format(min) : `${euros.format(min).replace(/\s€$/, "")} – ${euros.format(max)}`;
}
