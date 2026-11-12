export const DAYNAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function parseKey(k: string): Date {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function key(d: Date): string {
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function short(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** The Monday on or after the given date. */
export function nextMonday(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (8 - d.getDay()) % 7;
  return addDays(d, diff);
}

/** The Monday on or before the given date. */
export function thisMonday(from = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const diff = (d.getDay() + 6) % 7;
  return addDays(d, -diff);
}

export function weekDates(start: string, w: number): Date[] {
  const s = addDays(parseKey(start), (w - 1) * 7);
  return [...Array(7)].map((_, i) => addDays(s, i));
}

export function weekOf(start: string, dateKey: string): number {
  const diff = Math.floor((parseKey(dateKey).getTime() - parseKey(start).getTime()) / 864e5);
  return Math.floor(diff / 7) + 1;
}

export const todayKey = () => key(new Date());
