import { useEffect, useState } from "react";
import type { LogData, Meal, Plan } from "../lib/types";
import { DAYNAMES, key, todayKey, weekDates } from "../lib/dates";
import { SLOTS, dayTotals, num, planMeals } from "../lib/food";
import { uid } from "../lib/store";
import Sheet from "./Sheet";
import { fmt, type SaveFn } from "./Dashboard";

export default function Food({ plan, week, logs, save }: { plan: Plan; week: number; logs: LogData; save: SaveFn }) {
  const today = todayKey();
  const dates = weekDates(plan.startDate, week);
  const keys = dates.map(key);
  const [day, setDay] = useState(keys.includes(today) ? today : keys[0]);
  const [edit, setEdit] = useState<Meal | null>(null);
  useEffect(() => {
    if (!keys.includes(day)) setDay(keys.includes(today) ? today : keys[0]);
  }, [week]); // eslint-disable-line react-hooks/exhaustive-deps

  const T = plan.weeks[week - 1].macros;
  const r = logs.days[day] ?? {};
  const meals = r.meals ?? [];
  const t = dayTotals(r);
  const { rows, left } = planMeals(meals, t, T, day < today);

  const bars: [string, "cal" | "p" | "c" | "f", string, [number, number], string][] = [
    ["Calories", "cal", "", T.cal, "--accent"],
    ["Protein", "p", " g", T.p, "--w4"],
    ["Carbs", "c", " g", T.c, "--w3"],
    ["Fat", "f", " g", T.f, "--w2"],
  ];

  function saveMeal(m: Meal | null, id?: string) {
    const list = meals.filter((x) => x.id !== (m?.id ?? id));
    if (m) {
      const i = meals.findIndex((x) => x.id === m.id);
      if (i > -1) list.splice(i, 0, m);
      else list.push(m);
    }
    save("days", day, { ...r, meals: list });
  }

  return (
    <section>
      <div className="sechead">
        <h2>Food &amp; macros</h2>
        <span className="hint">
          Target: {T.cal[0].toLocaleString()}–{T.cal[1].toLocaleString()} cal · P {T.p[0]}+ g · C {T.c[0]}–{T.c[1]} g · F {T.f[0]}–{T.f[1]} g
        </span>
      </div>
      <div className="daypick" role="group" aria-label="Choose day">
        {dates.map((d, i) => {
          const k = keys[i];
          const has = (logs.days[k]?.meals ?? []).length > 0;
          return (
            <button key={k} type="button" aria-pressed={k === day} onClick={() => setDay(k)}>
              {DAYNAMES[d.getDay()]} {d.getDate()}
              {has && <span className="has" aria-label="logged" />}
            </button>
          );
        })}
      </div>
      <div className="macros">
        {bars.map(([label, k, u, [lo, hi], c]) => {
          const v = t[k];
          const max = hi * 1.3;
          const pct = v === null ? 0 : Math.min(100, (v / max) * 100);
          const st = v === null ? "" : k === "p" ? (v >= lo ? "ok" : "lo") : v >= lo && v <= hi ? "ok" : "lo";
          return (
            <div className="mac" key={k} style={{ ["--mc" as string]: `var(${c})` }}>
              <div className="row">
                <span className="k">{label}</span>
                <span className="t">
                  {k === "p" ? lo + "+" : lo.toLocaleString() + "–" + hi.toLocaleString()}
                  {u}
                </span>
              </div>
              <div className={"v " + st}>
                {fmt(v)}
                {v !== null && <small>{u}</small>}
              </div>
              <div className="bar" aria-hidden="true">
                <b style={{ left: `${(lo / max) * 100}%`, width: `${((k === "p" ? max - lo : hi - lo) / max) * 100}%` }} />
                <i style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Meal</th>
              <th>What you ate</th>
              <th>Calories</th>
              <th>Protein (g)</th>
              <th>Carbs (g)</th>
              <th>Fat (g)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) =>
              row.logged.length ? (
                row.logged.map((m, i) => (
                  <tr key={m.id} className="rowbtn" onClick={() => setEdit(m)}>
                    <td className="mealname">{i === 0 ? row.name : ""}</td>
                    <td className="wrapcell">
                      <button type="button" className="linkbtn" onClick={(e) => (e.stopPropagation(), setEdit(m))}>
                        {m.food || "(no description)"}
                      </button>
                    </td>
                    <td>{fmt(num(m.cal))}</td>
                    <td>{fmt(num(m.p))}</td>
                    <td>{fmt(num(m.c))}</td>
                    <td>{fmt(num(m.f))}</td>
                  </tr>
                ))
              ) : (
                <tr key={row.name}>
                  <td className="mealname">{row.name}</td>
                  <td className={"wrapcell" + (row.sug ? " sug" : "")}>{row.sug?.text}</td>
                  {(["cal", "p", "c", "f"] as const).map((k) => (
                    <td key={k} className="sug">
                      {row.sug && row.sug.cal ? "~" + fmt(row.sug[k]) : ""}
                    </td>
                  ))}
                </tr>
              ),
            )}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td />
              <td>{fmt(t.cal)}</td>
              <td>{fmt(t.p)}</td>
              <td>{fmt(t.c)}</td>
              <td>{fmt(t.f)}</td>
            </tr>
            {left && (
              <tr className="left">
                <td>Left to hit target</td>
                <td />
                <td>{fmt(left.cal)}</td>
                <td>{fmt(left.p)}</td>
                <td>{fmt(left.c)}</td>
                <td>{fmt(left.f)}</td>
              </tr>
            )}
          </tfoot>
        </table>
      </div>
      <div>
        <button
          className="btn"
          type="button"
          onClick={() => {
            const h = new Date().getHours();
            const next = day !== today ? "Breakfast" : h < 10 ? "Breakfast" : h < 14 ? "Lunch" : h < 17 ? "Snack" : "Dinner";
            setEdit({ id: "", meal: next, food: "" });
          }}
        >
          + Add food
        </button>
      </div>
      <MealEditor meal={edit} onClose={() => setEdit(null)} onSave={(m) => saveMeal(m)} onDelete={(id) => saveMeal(null, id)} />
    </section>
  );
}

function MealEditor({ meal, onClose, onSave, onDelete }: { meal: Meal | null; onClose: () => void; onSave: (m: Meal) => void; onDelete: (id: string) => void }) {
  const [m, setM] = useState<Record<string, string>>({});
  useEffect(() => {
    if (meal)
      setM({
        meal: meal.meal,
        food: meal.food,
        cal: meal.cal != null ? String(meal.cal) : "",
        p: meal.p != null ? String(meal.p) : "",
        c: meal.c != null ? String(meal.c) : "",
        f: meal.f != null ? String(meal.f) : "",
      });
  }, [meal]);
  const isNew = !meal?.id;
  const options = [...SLOTS.map((s) => s.name), "Other"];
  return (
    <Sheet title={isNew ? "Add food" : "Edit food"} open={!!meal} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ id: meal?.id || uid(), meal: m.meal, food: m.food.trim(), cal: num(m.cal), p: num(m.p), c: num(m.c), f: num(m.f) });
          onClose();
        }}
      >
        <label>
          Meal
          <select value={m.meal ?? ""} onChange={(e) => setM({ ...m, meal: e.target.value })}>
            {options.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label>
          What you ate
          <input value={m.food ?? ""} onChange={(e) => setM({ ...m, food: e.target.value })} placeholder="e.g. 3 eggs, 2 toast, banana" autoFocus={isNew} />
        </label>
        <div className="row4">
          {(
            [
              ["cal", "Calories"],
              ["p", "Protein g"],
              ["c", "Carbs g"],
              ["f", "Fat g"],
            ] as const
          ).map(([k, l]) => (
            <label key={k}>
              {l}
              <input type="number" inputMode="decimal" value={m[k] ?? ""} onChange={(e) => setM({ ...m, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="navrow">
          {!isNew ? (
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                onDelete(meal!.id);
                onClose();
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <button className="btn" type="submit">
            Save
          </button>
        </div>
      </form>
    </Sheet>
  );
}
