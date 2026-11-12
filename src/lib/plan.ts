import type { Equipment, Ex, Experience, Goal, Intake, MacroTarget, Plan, Session, TestDef } from "./types";

/* ------------------------------------------------------------------ *
 * Rule-based plan generator. Builds a 4-week block (3 progressive
 * weeks + a test week) from the intake answers. Pure functions only,
 * so the same intake always produces the same plan.
 * ------------------------------------------------------------------ */

type Tier = "power" | "main" | "secondary" | "accessory" | "finisher" | "core" | "conditioning" | "carry";

interface Slot {
  l: string;
  names: Record<Equipment, string | null>; // null = skip on that equipment
  tier: Tier;
  lower?: boolean;
  per?: string; // "/side", "/leg"
  min?: number; // only include when session is at least this many minutes
  rx?: [string, string, string]; // override
}

const N = (gym: string, dumbbells: string | null = gym, home: string | null = dumbbells): Record<Equipment, string | null> => ({
  gym,
  dumbbells,
  home,
});

// Exercise options per equipment setup
const EX = {
  bench: N("Barbell bench press", "DB bench press", "Deficit push-ups (add a backpack)"),
  incline: N("Incline DB press", "Incline DB press", "Feet-elevated push-ups"),
  inclineBar: N("Incline barbell bench", "Incline DB press", "Feet-elevated push-ups"),
  ohp: N("Seated DB shoulder press", "Standing DB shoulder press", "Pike push-ups"),
  landmine: N("Landmine press", "Half-kneeling one-arm DB press", "Pike push-ups"),
  csRow: N("Chest-supported DB row", "Chest-supported DB row", "Inverted row (table or rings)"),
  oneArmRow: N("One-arm DB row", "One-arm DB row", "Band row"),
  cableRow: N("Seated cable row", "DB seal row", "Band row"),
  pulldown: N("Lat pulldown", "Pull-ups (band-assisted if needed)", "Pull-ups or band pulldown"),
  pullups: N("Weighted pull-ups", "Pull-ups", "Pull-ups or band pulldown"),
  facePull: N("Cable face pull", "Band face pull", "Band pull-apart"),
  squat: N("Back squat", "Goblet squat", "Tempo split squat"),
  rdl: N("DB Romanian deadlift", "DB Romanian deadlift", "Single-leg RDL"),
  deadlift: N("Trap bar deadlift", "DB Romanian deadlift", "Single-leg RDL"),
  lunge: N("DB walking lunge", "DB reverse lunge", "Reverse lunge"),
  bss: N("Bulgarian split squat", "Bulgarian split squat", "Bulgarian split squat"),
  latLunge: N("Goblet lateral lunge", "Goblet lateral lunge", "Lateral lunge"),
  hamCurl: N("Seated hamstring curl", "Slider hamstring curl", "Slider hamstring curl"),
  legPress: N("Leg press", "DB step-up", "Step-up"),
  calf: N("Single-leg calf raise", "Single-leg calf raise", "Single-leg calf raise"),
  deadBug: N("Dead bug"),
  pallof: N("Pallof press", "Band Pallof press", "Band Pallof press"),
  sidePlank: N("Side plank"),
  kneeRaise: N("Hanging knee raise", "Hanging knee raise", "Lying leg raise"),
  pushdown: N("Triceps pushdown", "DB skull crusher", "Close-grip push-ups"),
  ohTri: N("Overhead triceps extension", "Overhead DB triceps extension", "Band overhead triceps extension"),
  curl: N("DB curl", "DB curl", "Band curl"),
  hammer: N("Hammer curl", "Hammer curl", "Band hammer curl"),
  lateral: N("DB lateral raise", "DB lateral raise", "Band lateral raise"),
  pushupFly: N("Push-ups / cable fly", "Push-ups", "Push-ups"),
  farmer: N("Farmer carry", "Farmer carry", null),
  suitcase: N("Suitcase carry", "Suitcase carry", null),
  boxJump: N("Box jump", "Squat jump", "Squat jump"),
  broadJump: N("Broad jump"),
  medBall: N("Med ball scoop toss", "Lateral bound", "Lateral bound"),
  bike: N("Bike sprints", "Hill or shuttle sprints", "Hill or shuttle sprints"),
  sled: N("Sled push", "Shuttle sprints", "Shuttle sprints"),
};

const TEMPLATES: Record<string, Slot[]> = {
  "Upper A": [
    { l: "A1", names: EX.bench, tier: "main" },
    { l: "A2", names: EX.csRow, tier: "secondary" },
    { l: "B1", names: EX.ohp, tier: "secondary" },
    { l: "B2", names: EX.pulldown, tier: "accessory" },
    { l: "C1", names: EX.incline, tier: "accessory", min: 60 },
    { l: "C2", names: EX.facePull, tier: "accessory", min: 60, rx: ["3 × 15", "3 × 15", "3 × 15"] },
    { l: "D", names: EX.pushdown, tier: "finisher" },
    { l: "D", names: EX.curl, tier: "finisher" },
    { l: "D", names: EX.farmer, tier: "carry", min: 75 },
  ],
  "Lower A": [
    { l: "P1", names: EX.boxJump, tier: "power", min: 60 },
    { l: "P2", names: EX.medBall, tier: "power", min: 75 },
    { l: "A1", names: EX.squat, tier: "main", lower: true },
    { l: "A2", names: EX.deadBug, tier: "core", per: "/side" },
    { l: "B1", names: EX.rdl, tier: "secondary", lower: true },
    { l: "B2", names: EX.pallof, tier: "core", per: "/side" },
    { l: "C1", names: EX.lunge, tier: "accessory", lower: true, per: "/leg", min: 60 },
    { l: "C2", names: EX.hamCurl, tier: "accessory" },
    { l: "D", names: EX.bike, tier: "conditioning", min: 75 },
  ],
  "Upper B": [
    { l: "A1", names: EX.pullups, tier: "main" },
    { l: "A2", names: EX.inclineBar, tier: "main" },
    { l: "B1", names: EX.oneArmRow, tier: "secondary", per: "/side" },
    { l: "B2", names: EX.landmine, tier: "secondary", per: "/side" },
    { l: "C1", names: EX.pushupFly, tier: "accessory", min: 60 },
    { l: "C2", names: EX.cableRow, tier: "accessory", min: 60 },
    { l: "D", names: EX.lateral, tier: "finisher", rx: ["2 rounds × 15", "3 rounds × 15", "3 rounds × 15"] },
    { l: "D", names: EX.ohTri, tier: "finisher" },
    { l: "D", names: EX.hammer, tier: "finisher", min: 75 },
  ],
  "Lower B": [
    { l: "P1", names: EX.broadJump, tier: "power", min: 60 },
    { l: "A1", names: EX.deadlift, tier: "main", lower: true },
    { l: "A2", names: EX.sidePlank, tier: "core", rx: ["3 × 30 s/side", "4 × 30 s/side", "4 × 40 s/side"] },
    { l: "B1", names: EX.bss, tier: "secondary", lower: true, per: "/leg" },
    { l: "B2", names: EX.latLunge, tier: "accessory", lower: true, per: "/side" },
    { l: "C1", names: EX.legPress, tier: "accessory", lower: true, min: 60 },
    { l: "C2", names: EX.calf, tier: "accessory", per: "/leg", min: 60 },
    { l: "C3", names: EX.kneeRaise, tier: "core", min: 75 },
    { l: "D", names: EX.sled, tier: "conditioning", min: 75, rx: ["4 rounds × 20 m", "6 rounds × 20 m", "8 rounds × 20 m"] },
  ],
  "Full Body A": [
    { l: "P1", names: EX.broadJump, tier: "power", min: 75 },
    { l: "A1", names: EX.squat, tier: "main", lower: true },
    { l: "A2", names: EX.bench, tier: "main" },
    { l: "B1", names: EX.rdl, tier: "secondary", lower: true },
    { l: "B2", names: EX.pulldown, tier: "secondary" },
    { l: "C1", names: EX.ohp, tier: "accessory", min: 60 },
    { l: "C2", names: EX.deadBug, tier: "core", per: "/side", min: 60 },
    { l: "D", names: EX.curl, tier: "finisher", min: 75 },
    { l: "D", names: EX.pushdown, tier: "finisher", min: 75 },
  ],
  "Full Body B": [
    { l: "P1", names: EX.boxJump, tier: "power", min: 75 },
    { l: "A1", names: EX.deadlift, tier: "main", lower: true },
    { l: "A2", names: EX.pullups, tier: "main" },
    { l: "B1", names: EX.bss, tier: "secondary", lower: true, per: "/leg" },
    { l: "B2", names: EX.incline, tier: "secondary" },
    { l: "C1", names: EX.csRow, tier: "accessory", min: 60 },
    { l: "C2", names: EX.pallof, tier: "core", per: "/side", min: 60 },
    { l: "D", names: EX.lateral, tier: "finisher", min: 75 },
    { l: "D", names: EX.farmer, tier: "carry", min: 75 },
  ],
  "Full Body C": [
    { l: "A1", names: EX.bench, tier: "main" },
    { l: "A2", names: EX.lunge, tier: "secondary", lower: true, per: "/leg" },
    { l: "B1", names: EX.oneArmRow, tier: "secondary", per: "/side" },
    { l: "B2", names: EX.hamCurl, tier: "accessory" },
    { l: "C1", names: EX.landmine, tier: "accessory", per: "/side", min: 60 },
    { l: "C2", names: EX.sidePlank, tier: "core", min: 60, rx: ["3 × 30 s/side", "3 × 40 s/side", "3 × 45 s/side"] },
    { l: "D", names: EX.bike, tier: "conditioning", min: 75 },
  ],
};

const MAIN_RX: Record<Goal, [string, string, string]> = {
  recomp: ["3 × 6", "4 × 6", "4 × 5"],
  cut: ["3 × 6", "4 × 6", "4 × 5"],
  build: ["3 × 8", "4 × 8", "4 × 6"],
  strength: ["4 × 5", "5 × 4", "5 × 3"],
};

function baseRx(tier: Tier, goal: Goal): [string, string, string] {
  switch (tier) {
    case "power": return ["3 × 3", "4 × 3", "4 × 3"];
    case "main": return MAIN_RX[goal];
    case "secondary": return goal === "strength" ? ["3 × 8", "4 × 8", "4 × 6"] : ["3 × 10", "4 × 10", "4 × 8"];
    case "accessory": return ["3 × 12", "3 × 12", "3 × 10"];
    case "finisher": return ["2 rounds × 12", "3 rounds × 12", "3 rounds × 12"];
    case "core": return ["3 × 8", "3 × 10", "3 × 12"];
    case "carry": return ["2 rounds × 40 m", "3 rounds × 40 m", "3 rounds × 40 m"];
    case "conditioning": return ["6 rounds · 15 s on / 45 s off", "8 rounds · 15 s on / 45 s off", "10 rounds · 15 s on / 45 s off"];
  }
}

function effort(tier: Tier, lower: boolean, xp: Experience): string {
  const isNew = xp === "new";
  switch (tier) {
    case "power": return "Max intent, never to fatigue · full rest";
    case "main":
      if (isNew) return "Leave 2–3 reps · never to failure · own the technique";
      return lower ? "W1 leave 2 · W2–3 leave 1–2 · never to failure" : "Leave 1, last set to failure (spotter)";
    case "secondary":
      if (isNew) return "Leave 2 reps";
      return lower ? "Leave 1–2 · never to failure · 3 s lower" : "Last set to failure";
    case "accessory":
      if (isNew) return "Leave 1–2 reps";
      return lower ? "W1 leave 1 · W2–3 last set to failure" : "Last set to failure";
    case "finisher":
      return isNew ? "Last round to failure" : "W1 last round to failure · W2–3 every round";
    case "core": return "Controlled · stop when form breaks";
    case "carry": return "Heaviest you can hold the full distance";
    case "conditioning": return isNew ? "Hard but repeatable" : "W1 ~85% · W2–3 all-out";
  }
}

function addPer(rx: [string, string, string], per?: string): [string, string, string] {
  if (!per) return rx;
  return rx.map((r) => (/[sm]$|\/\w+$/.test(r) || r.includes("rounds") ? r : r + per)) as [string, string, string];
}

export function buildSession(name: string, intake: Intake): Session {
  const slots = TEMPLATES[name];
  const ex: Ex[] = [];
  for (const s of slots) {
    if (s.min && intake.minutes < s.min) continue;
    const n = s.names[intake.equipment];
    if (!n) continue;
    let rx = s.rx ?? baseRx(s.tier, intake.goal);
    rx = addPer(rx, s.per);
    ex.push({ l: s.l, n, rx, e: effort(s.tier, !!s.lower, intake.experience) });
  }
  return { name, kind: "lift", ex: relabel(ex) };
}

/** After dropping slots, a lone "A2" should become "A" etc. Keep the original letters otherwise. */
function relabel(ex: Ex[]): Ex[] {
  const counts = new Map<string, number>();
  ex.forEach((x) => counts.set(x.l.charAt(0), (counts.get(x.l.charAt(0)) ?? 0) + 1));
  const seen = new Map<string, number>();
  return ex.map((x) => {
    const g = x.l.charAt(0);
    if (g === "D" || g === "E") return x;
    const c = counts.get(g)!;
    const i = (seen.get(g) ?? 0) + 1;
    seen.set(g, i);
    return { ...x, l: c === 1 ? g : g + i };
  });
}

/* Day-of-week layouts by number of lifting days (0 = Sun). */
const LAYOUTS: Record<number, [number, string][]> = {
  2: [[1, "Full Body A"], [4, "Full Body B"]],
  3: [[1, "Full Body A"], [3, "Full Body B"], [5, "Full Body C"]],
  4: [[1, "Upper A"], [2, "Lower A"], [4, "Upper B"], [5, "Lower B"]],
  5: [[1, "Upper A"], [2, "Lower A"], [4, "Upper B"], [5, "Lower B"], [6, "Full Body C"]],
  6: [[1, "Upper A"], [2, "Lower A"], [3, "Full Body C"], [4, "Upper B"], [5, "Lower B"], [6, "Full Body A"]],
};

/* ---------------- Tests ---------------- */

interface TestSpec extends TestDef {
  day: "upper" | "lower" | "engine";
  how: string;
}

function testSpecs(eq: Equipment): TestSpec[] {
  const T3 = "Work up to a 3-rep max · 3 attempts max";
  const common: TestSpec[] = [
    { id: "pushups", name: "Max push-ups", unit: "reps", day: "upper", how: "Chest to fist, no pauses" },
    { id: "pullups", name: "Max pull-ups", unit: "reps", day: "upper", how: "Dead hang, chin over bar" },
    { id: "vertical", name: "Vertical jump", unit: "in", day: "lower", how: "Best of 3, fresh" },
    { id: "broad", name: "Broad jump", unit: "in", day: "lower", how: "Best of 3, stick the landing" },
  ];
  if (eq === "gym")
    return [
      { id: "bench3rm", name: "Bench press 3RM", unit: "lb", day: "upper", how: T3 },
      ...common,
      { id: "squat3rm", name: "Back squat 3RM", unit: "lb", day: "lower", how: T3 },
      { id: "trapbar3rm", name: "Trap bar deadlift 3RM", unit: "lb", day: "engine", how: T3 },
      { id: "row2k", name: "2,000 m row", unit: "min:s", lowerBetter: true, day: "engine", how: "After 15 min rest, for time" },
    ];
  if (eq === "dumbbells")
    return [
      { id: "dbbench", name: "DB bench reps @ heaviest pair", unit: "reps", day: "upper", how: "Same dumbbells at baseline and retest" },
      ...common,
      { id: "goblet", name: "Goblet squat reps @ heaviest DB", unit: "reps", day: "lower", how: "Same dumbbell both times, full depth" },
      { id: "run1mi", name: "1-mile run", unit: "min:s", lowerBetter: true, day: "engine", how: "Flat route, for time" },
    ];
  return [
    ...common,
    { id: "squat60", name: "Bodyweight squats in 60 s", unit: "reps", day: "lower", how: "Thighs to parallel" },
    { id: "plank", name: "Plank hold", unit: "s", day: "engine", how: "Until hips sag" },
    { id: "run1mi", name: "1-mile run", unit: "min:s", lowerBetter: true, day: "engine", how: "Flat route, for time" },
  ];
}

const BODY_TESTS: TestDef[] = [
  { id: "weight", name: "Avg morning weight", unit: "lb" },
  { id: "waist", name: "Waist at navel", unit: "in" },
];

/* ---------------- Nutrition ---------------- */

const r5 = (n: number) => Math.round(n / 5) * 5;
const r50 = (n: number) => Math.round(n / 50) * 50;

export function maintenanceCalories(i: Intake): number {
  const kg = i.weightLb * 0.4536;
  const cm = i.heightIn * 2.54;
  const bmr = 10 * kg + 6.25 * cm - 5 * i.age + (i.sex === "male" ? 5 : -161);
  const activity = 1.35 + 0.05 * i.days;
  return r50(bmr * activity);
}

export function macrosFor(i: Intake, calories: number, deficit: boolean): MacroTarget {
  const half = deficit ? 50 : 100;
  const pLo = r5(Math.min(i.weightLb * 0.9, 240));
  const fatMid = Math.round((calories * (deficit ? 0.25 : 0.27)) / 9);
  const carbMid = Math.max(80, Math.round((calories - (pLo + 10) * 4 - fatMid * 9) / 4));
  return {
    cal: [calories - half, calories + half],
    p: [pLo, pLo + 20],
    c: [r5(carbMid - 20), r5(carbMid + 20)],
    f: [r5(fatMid - 7), r5(fatMid + 7)],
  };
}

export const GOAL_LABEL: Record<Goal, string> = {
  recomp: "Recomp (lose fat, keep/build muscle)",
  cut: "Fat loss",
  build: "Build muscle",
  strength: "Get stronger",
};

export function generatePlan(i: Intake): Plan {
  const tdee = maintenanceCalories(i);
  const phase: Record<Goal, [number, number, number, number]> = {
    recomp: [1, 1, 0.83, 0.83],
    cut: [0.8, 0.8, 0.8, 0.8],
    build: [1.1, 1.1, 1.1, 1.05],
    strength: [1, 1, 1, 1],
  };
  const names = ["Base", "Build", "Push", "Test"];
  const weeks = phase[i.goal].map((m, idx) => ({
    n: idx + 1,
    name: names[idx],
    macros: macrosFor(i, r50(tdee * m), m < 1),
  }));

  const days = Math.min(6, Math.max(2, Math.round(i.days)));
  const layout = LAYOUTS[days];
  const schedule: Record<number, Session> = {};
  for (let d = 0; d < 7; d++) schedule[d] = { name: "Rest", kind: "rest", ex: [] };
  layout.forEach(([dow, name]) => (schedule[dow] = buildSession(name, i)));
  if (days <= 4) {
    // One easy movement day between lifting days
    const free = [3, 6, 2, 0].find((d) => schedule[d].kind === "rest");
    if (free !== undefined) schedule[free] = { name: "Walk + mobility", kind: "recovery", ex: [] };
  }

  // Test week: up to three test days on the first lifting days
  const specs = testSpecs(i.equipment);
  const liftDays = layout.map(([d]) => d);
  const groups: TestSpec["day"][][] =
    liftDays.length >= 3 ? [["upper"], ["lower"], ["engine"]] : [["upper", "lower"], ["engine"]];
  const titles: Record<string, string> = { upper: "Upper test", lower: "Power + legs test", engine: "Hinge + engine test" };
  const testSchedule: Record<number, Session> = {};
  const testDays: number[] = [];
  liftDays.forEach((dow, idx) => {
    const g = groups[idx];
    if (!g) {
      testSchedule[dow] = { name: "Easy session (deload)", kind: "recovery", ex: [] };
      return;
    }
    const ex: Ex[] = specs
      .filter((s) => g.includes(s.day))
      .map((s, j) => ({ l: String(j + 1), n: s.name, rx: [s.how.includes("3-rep") ? "3RM" : "1 effort", "", ""], e: s.how }));
    testSchedule[dow] = { name: g.map((x) => titles[x].replace(" test", "")).join(" + ") + " test", kind: "test", ex };
    testDays.push(dow);
  });

  const notes = [
    `Estimated maintenance: ~${tdee.toLocaleString()} cal/day. Adjust by 100–200 if weight moves faster or slower than expected over two weeks.`,
    "Same letter = superset: alternate those exercises back to back, then rest.",
    "Week 1 baseline: run the test sessions (or note your first working weights) so Week 4 has something to beat.",
  ];
  if (i.experience === "new") notes.push("New to lifting: technique first. Nothing goes to failure on the big lifts this block.");

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    startDate: i.startDate,
    weeks,
    schedule,
    testSchedule,
    tests: [...specs.map(({ id, name, unit, lowerBetter }) => ({ id, name, unit, lowerBetter })), ...BODY_TESTS],
    liftDays,
    testDays,
    notes,
  };
}

/** Session planned for a given week and day of week. */
export function sessionFor(plan: Plan, week: number, dow: number): Session {
  if (week === 4 && plan.testSchedule[dow]) return plan.testSchedule[dow];
  return plan.schedule[dow] ?? { name: "Rest", kind: "rest", ex: [] };
}

export function rxFor(x: Ex, week: number): string {
  return week >= 4 ? x.rx[0] : x.rx[week - 1];
}

/** "1a", "1b", "2" style labels in order of appearance. */
export function labels(ex: Ex[]): Map<Ex, string> {
  const order: string[] = [];
  ex.forEach((x) => {
    const g = x.l.charAt(0);
    if (!order.includes(g)) order.push(g);
  });
  const out = new Map<Ex, string>();
  order.forEach((g, i) => {
    const mem = ex.filter((x) => x.l.charAt(0) === g);
    mem.forEach((x, j) => out.set(x, mem.length > 1 ? `${i + 1}${"abcdefgh"[j]}` : `${i + 1}`));
  });
  return out;
}

export function howText(x: Ex, ex: Ex[]): string {
  const lab = labels(ex);
  const group = ex.filter((o) => o.l.charAt(0) === x.l.charAt(0));
  if (group.length === 1) return x.l === "D" || x.l === "E" ? "Finisher · straight sets" : "Straight sets";
  const others = group.filter((g) => g !== x);
  if (group.length === 2) return `Superset with ${lab.get(others[0])} ${others[0].n}`;
  return `${group.length === 3 ? "Tri-set" : "Circuit"} with ${others.map((o) => lab.get(o) + " " + o.n).join(", ")}`;
}
