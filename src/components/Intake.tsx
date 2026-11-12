import { useMemo, useState } from "react";
import { GOAL_LABEL, generatePlan, maintenanceCalories } from "../lib/plan";
import { key, nextMonday, thisMonday, parseKey, short, addDays } from "../lib/dates";
import type { Equipment, Experience, Goal, Intake as IntakeT, Profile } from "../lib/types";
import { Disclaimer } from "./SignIn";

interface Props {
  initial?: IntakeT;
  hasLogs: boolean;
  onDone: (p: Profile, clearLogs: boolean) => Promise<void>;
  onCancel?: () => void;
}

const DEFAULTS: IntakeT = {
  name: "",
  sex: "male",
  age: 30,
  heightIn: 70,
  weightLb: 180,
  goal: "recomp",
  days: 4,
  minutes: 60,
  equipment: "gym",
  experience: "intermediate",
  startDate: key(nextMonday()),
};

function Choice<T extends string | number>(props: {
  label: string;
  value: T;
  options: [T, string, string?][];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset className="choice">
      <legend>{props.label}</legend>
      <div className="opts">
        {props.options.map(([v, l, sub]) => (
          <button key={String(v)} type="button" aria-pressed={props.value === v} onClick={() => props.onChange(v)}>
            <b>{l}</b>
            {sub && <span>{sub}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function Intake({ initial, hasLogs, onDone, onCancel }: Props) {
  const [f, setF] = useState<IntakeT>(initial ?? DEFAULTS);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [fresh, setFresh] = useState(false);
  const set = <K extends keyof IntakeT>(k: K, v: IntakeT[K]) => setF((x) => ({ ...x, [k]: v }));

  const ft = Math.floor(f.heightIn / 12);
  const inch = f.heightIn % 12;
  const preview = useMemo(() => generatePlan(f), [f]);
  const valid = f.age >= 14 && f.age <= 90 && f.weightLb >= 80 && f.weightLb <= 450 && f.heightIn >= 54 && f.heightIn <= 90;

  const mondays = [thisMonday(), nextMonday(addDays(new Date(), 1)), addDays(nextMonday(addDays(new Date(), 1)), 7)];
  if (initial && !mondays.some((d) => key(d) === initial.startDate)) mondays.unshift(parseKey(initial.startDate));

  const steps = [
    <section key="you" className="card form">
      <h2>About you</h2>
      <label>
        First name <span className="muted">(optional)</span>
        <input value={f.name} onChange={(e) => set("name", e.target.value)} autoComplete="given-name" />
      </label>
      <Choice label="Sex (for calorie estimate)" value={f.sex} options={[["male", "Male"], ["female", "Female"]]} onChange={(v) => set("sex", v)} />
      <div className="row3">
        <label>
          Age
          <input type="number" inputMode="numeric" value={f.age || ""} onChange={(e) => set("age", Number(e.target.value))} />
        </label>
        <label>
          Height
          <span className="pair">
            <input aria-label="Feet" type="number" inputMode="numeric" value={ft || ""} onChange={(e) => set("heightIn", Number(e.target.value) * 12 + inch)} />
            <span>ft</span>
            <input aria-label="Inches" type="number" inputMode="numeric" value={inch} onChange={(e) => set("heightIn", ft * 12 + Math.min(11, Number(e.target.value)))} />
            <span>in</span>
          </span>
        </label>
        <label>
          Weight (lb)
          <input type="number" inputMode="decimal" value={f.weightLb || ""} onChange={(e) => set("weightLb", Number(e.target.value))} />
        </label>
      </div>
      {!valid && <p className="err">Check age, height and weight.</p>}
    </section>,

    <section key="goal" className="card form">
      <h2>Your goal</h2>
      <Choice<Goal>
        label="Main goal for the next 4 weeks"
        value={f.goal}
        options={[
          ["recomp", "Recomp", "Lose fat, keep or build muscle"],
          ["cut", "Fat loss", "Steady deficit all block"],
          ["build", "Build muscle", "Small surplus, more volume"],
          ["strength", "Get stronger", "Heavier, lower reps"],
        ]}
        onChange={(v) => set("goal", v)}
      />
      <Choice<Experience>
        label="Lifting experience"
        value={f.experience}
        options={[
          ["new", "New", "Under 1 year"],
          ["intermediate", "Intermediate", "1–3 years"],
          ["advanced", "Advanced", "3+ years, consistent"],
        ]}
        onChange={(v) => set("experience", v)}
      />
    </section>,

    <section key="sched" className="card form">
      <h2>Schedule & equipment</h2>
      <Choice<number> label="Lifting days per week" value={f.days} options={[2, 3, 4, 5, 6].map((n) => [n, String(n)])} onChange={(v) => set("days", v)} />
      <Choice<number>
        label="Time per session"
        value={f.minutes}
        options={[
          [45, "45 min"],
          [60, "60 min"],
          [75, "75+ min"],
        ]}
        onChange={(v) => set("minutes", v)}
      />
      <Choice<Equipment>
        label="Where you train"
        value={f.equipment}
        options={[
          ["gym", "Full gym", "Barbells, machines, cables"],
          ["dumbbells", "Dumbbells", "Dumbbells, bench, pull-up bar"],
          ["home", "Home / minimal", "Bodyweight + bands"],
        ]}
        onChange={(v) => set("equipment", v)}
      />
      <Choice<string>
        label="Start week"
        value={f.startDate}
        options={mondays.map((d) => [key(d), "Mon " + short(d)])}
        onChange={(v) => set("startDate", v)}
      />
    </section>,

    <section key="review" className="card form">
      <h2>Your block</h2>
      <p className="muted">
        {GOAL_LABEL[f.goal]} · {f.days} days a week · {f.minutes === 75 ? "75+" : f.minutes} min · starts {short(parseKey(f.startDate))}
      </p>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Week</th>
              <th>Calories</th>
              <th>Protein</th>
              <th>Carbs</th>
              <th>Fat</th>
            </tr>
          </thead>
          <tbody>
            {preview.weeks.map((w) => (
              <tr key={w.n}>
                <td>
                  {w.n} · {w.name}
                </td>
                <td>
                  {w.macros.cal[0].toLocaleString()}–{w.macros.cal[1].toLocaleString()}
                </td>
                <td>{w.macros.p[0]}+ g</td>
                <td>
                  {w.macros.c[0]}–{w.macros.c[1]} g
                </td>
                <td>
                  {w.macros.f[0]}–{w.macros.f[1]} g
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="weekplan">
        {[1, 2, 3, 4, 5, 6, 0].map((d) => {
          const s = preview.schedule[d];
          return (
            <li key={d} className={s.kind}>
              <b>{["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]}</b> {s.name}
              {s.ex.length > 0 && <span className="muted"> · {s.ex.length} exercises</span>}
            </li>
          );
        })}
      </ul>
      <p className="fine">Estimated maintenance ~{maintenanceCalories(f).toLocaleString()} cal/day. Week 4 swaps lifting days for retests.</p>
      {hasLogs && (
        <label className="check">
          <input type="checkbox" checked={fresh} onChange={(e) => setFresh(e.target.checked)} />
          Start a fresh log (clears logged weights, food, lifts and tests)
        </label>
      )}
    </section>,
  ];

  const last = step === steps.length - 1;
  return (
    <div className="wrap narrow">
      <div className="brand">
        <img src="/icon.svg" alt="" width={36} height={36} />
        <h1>{initial ? "Update your plan" : "Build your block"}</h1>
      </div>
      <ol className="steps" aria-label="Progress">
        {["You", "Goal", "Schedule", "Review"].map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={i < step ? "done" : ""}>
            {s}
          </li>
        ))}
      </ol>
      {steps[step]}
      <div className="navrow">
        {step > 0 ? (
          <button className="btn ghost" type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
        ) : onCancel ? (
          <button className="btn ghost" type="button" onClick={onCancel}>
            Cancel
          </button>
        ) : (
          <span />
        )}
        {last ? (
          <button
            className="btn"
            type="button"
            disabled={saving || !valid}
            onClick={async () => {
              setSaving(true);
              try {
                await onDone({ intake: f, plan: generatePlan(f) }, fresh);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving…" : initial ? "Save plan" : "Create my plan"}
          </button>
        ) : (
          <button className="btn" type="button" disabled={step === 0 && !valid} onClick={() => setStep(step + 1)}>
            Next
          </button>
        )}
      </div>
      <Disclaimer />
    </div>
  );
}
