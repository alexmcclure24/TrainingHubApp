export type Goal = "recomp" | "cut" | "build" | "strength";
export type Equipment = "gym" | "dumbbells" | "home";
export type Experience = "new" | "intermediate" | "advanced";
export type Sex = "male" | "female";

export interface Intake {
  name: string;
  sex: Sex;
  age: number;
  heightIn: number;
  weightLb: number;
  goal: Goal;
  days: number; // lifting days per week, 2–6
  minutes: number; // 45 | 60 | 75
  equipment: Equipment;
  experience: Experience;
  startDate: string; // YYYY-MM-DD, a Monday
}

/** One prescribed exercise. `l` = block label: same letter = done back to back. */
export interface Ex {
  l: string;
  n: string;
  rx: [string, string, string]; // sets × reps for weeks 1, 2, 3
  e: string; // effort call
}

export interface Session {
  name: string;
  kind: "lift" | "test" | "conditioning" | "recovery" | "rest";
  ex: Ex[];
}

export interface MacroTarget {
  cal: [number, number];
  p: [number, number];
  c: [number, number];
  f: [number, number];
}

export interface WeekDef {
  n: number;
  name: string;
  macros: MacroTarget;
}

export interface TestDef {
  id: string;
  name: string;
  unit: string;
  lowerBetter?: boolean;
}

export interface Plan {
  version: 1;
  createdAt: string;
  startDate: string;
  weeks: WeekDef[];
  /** Keyed by day of week (0 = Sun … 6 = Sat). Used for weeks 1–3. */
  schedule: Record<number, Session>;
  /** Week 4 overrides, keyed by day of week. */
  testSchedule: Record<number, Session>;
  tests: TestDef[];
  liftDays: number[];
  testDays: number[];
  notes: string[];
}

export interface Profile {
  intake: Intake;
  plan: Plan;
}

export interface Meal {
  id: string;
  meal: string;
  food: string;
  cal?: number | null;
  p?: number | null;
  c?: number | null;
  f?: number | null;
}

export interface DayLog {
  weight?: number | null;
  notes?: string;
  meals?: Meal[];
}

export interface SetLog {
  w?: string;
  r?: string;
  e?: string; // "F" = failure, "1"/"2" = reps left
}

export interface ExerciseLog {
  name: string;
  sets: SetLog[];
  note?: string;
}

export interface SessionLog {
  session?: string;
  notes?: string;
  exercises: ExerciseLog[];
}

export interface TestLog {
  baseline?: string;
  result?: string;
}

export type Kind = "days" | "sessions" | "tests";

export interface LogData {
  days: Record<string, DayLog>;
  sessions: Record<string, SessionLog>;
  tests: Record<string, TestLog>;
}
