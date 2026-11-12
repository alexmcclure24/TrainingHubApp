import type { DayLog, MacroTarget, Meal } from "./types";

export type Totals = { cal: number | null; p: number | null; c: number | null; f: number | null };
const KEYS = ["cal", "p", "c", "f"] as const;

export function num(v: unknown): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

export function dayTotals(r: DayLog | undefined): Totals {
  const meals = r?.meals ?? [];
  const out: Totals = { cal: null, p: null, c: null, f: null };
  meals.forEach((m) =>
    KEYS.forEach((k) => {
      const v = num(m[k]);
      if (v !== null) out[k] = (out[k] ?? 0) + v;
    }),
  );
  return out;
}

export const SLOTS = [
  { name: "Pre-workout", re: /pre/i, w: 0.08 },
  { name: "Breakfast", re: /break|smoothie/i, w: 0.25 },
  { name: "Lunch", re: /lunch/i, w: 0.27 },
  { name: "Snack", re: /snack/i, w: 0.12 },
  { name: "Dinner", re: /dinner|supper/i, w: 0.28 },
];

const IDEAS: Record<string, { lean: string; norm: string }> = {
  "Pre-workout": { lean: "banana or 2 rice cakes with honey", norm: "banana or 2 rice cakes with honey" },
  Breakfast: { lean: "egg whites + 1 whole egg, oats, berries", norm: "eggs, toast, fruit, Greek yogurt" },
  Lunch: { lean: "grilled chicken breast, rice, veggies (go easy on oil, cheese, sauces)", norm: "chicken or steak bowl with rice, beans, salsa" },
  Snack: { lean: "Greek yogurt with berries, or a protein shake", norm: "Greek yogurt, granola, fruit" },
  Dinner: { lean: "lean ground turkey or white fish, potatoes, green veg", norm: "salmon or lean beef, potatoes or pasta, veg" },
};

export interface Suggestion {
  text: string;
  cal: number;
  p: number;
  c: number;
  f: number;
}
export interface MealRow {
  name: string;
  logged: Meal[];
  sug?: Suggestion;
}

/** Group logged meals into slots and suggest what to eat in the slots still open today. */
export function planMeals(meals: Meal[], t: Totals, T: MacroTarget, isPast: boolean) {
  const rows: (MealRow & { w: number })[] = SLOTS.map((s) => ({ name: s.name, w: s.w, logged: [] }));
  const extra: Meal[] = [];
  meals.forEach((m) => {
    const i = SLOTS.findIndex((s) => s.re.test(m.meal || ""));
    if (i > -1) rows[i].logged.push(m);
    else extra.push(m);
  });
  if (extra.length) rows.push({ name: "Other", w: 0, logged: extra });
  const target = { cal: (T.cal[0] + T.cal[1]) / 2, p: T.p[0] + 5, c: (T.c[0] + T.c[1]) / 2, f: (T.f[0] + T.f[1]) / 2 };
  const ate = { cal: t.cal ?? 0, p: t.p ?? 0, c: t.c ?? 0, f: t.f ?? 0 };
  const left = { cal: 0, p: 0, c: 0, f: 0 };
  KEYS.forEach((k) => (left[k] = Math.max(0, Math.round(target[k] - ate[k]))));
  if (isPast) return { rows, left: null };

  let last = -1;
  rows.forEach((r, i) => {
    if (r.logged.length && i < SLOTS.length) last = i;
  });
  const open = rows.filter((r, i) => i < SLOTS.length && i > last && !r.logged.length);
  const wsum = open.reduce((a, r) => a + r.w, 0) || 1;
  const fatUsed = ate.f >= target.f * 0.7;
  const protBehind = ate.cal > 300 && (ate.p * 4) / ate.cal < 0.2;
  open.forEach((r) => {
    const sh = r.w / wsum;
    const s = {
      cal: Math.round((left.cal * sh) / 10) * 10,
      p: Math.round(left.p * sh),
      c: Math.round(left.c * sh),
      f: Math.round(left.f * sh),
    };
    if (left.cal < 100) {
      r.sug = { text: "Calories are covered for today. If you're hungry, keep it to lean protein.", cal: 0, p: 0, c: 0, f: 0 };
      return;
    }
    const lean = fatUsed || s.f < 12;
    const idea = IDEAS[r.name][lean ? "lean" : "norm"];
    const tips: string[] = [];
    if (fatUsed) tips.push("fat is mostly used up, keep this one lean");
    if (protBehind) tips.push("protein is behind, build this around the protein");
    if (s.c >= 80) tips.push("go big on carbs");
    r.sug = { ...s, text: `Suggested: ${idea}${tips.length ? " · " + tips.join(" · ") : ""}` };
  });
  return { rows, left };
}
