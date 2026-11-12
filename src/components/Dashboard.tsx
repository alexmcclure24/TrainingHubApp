import { useCallback, useEffect, useState } from "react";
import type { Store } from "../lib/store";
import type { DayLog, Kind, LogData, Profile } from "../lib/types";
import { DAYNAMES, key, parseKey, short, todayKey, weekDates, weekOf } from "../lib/dates";
import { dayTotals, num } from "../lib/food";
import { GOAL_LABEL, sessionFor } from "../lib/plan";
import Sheet from "./Sheet";
import Food from "./Food";
import Sessions from "./Sessions";
import Tests from "./Tests";
import { Disclaimer } from "./SignIn";

export const fmt = (v: number | null | undefined, dp = 0) =>
  v === null || v === undefined || isNaN(v) ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: dp, minimumFractionDigits: dp });
const avg = (a: (number | null)[]) => {
  const x = a.filter((v): v is number => v !== null && !isNaN(v));
  return x.length ? x.reduce((s, y) => s + y, 0) / x.length : null;
};

export type SaveFn = (kind: Kind, k: string, data: unknown | null) => void;

const WEEK_COLORS = ["--w1", "--w2", "--w3", "--w4"];

interface Props {
  store: Store;
  profile: Profile;
  email?: string;
  onEditPlan: () => void;
  onSignOut?: () => void;
}

export default function Dashboard({ store, profile, email, onEditPlan, onSignOut }: Props) {
  const { plan, intake } = profile;
  const today = todayKey();
  const [logs, setLogs] = useState<LogData | null>(null);
  const [week, setWeek] = useState(() => Math.min(4, Math.max(1, weekOf(plan.startDate, today))));
  const [status, setStatus] = useState("");
  const [editDay, setEditDay] = useState<string | null>(null);

  useEffect(() => {
    store
      .loadLogs()
      .then(setLogs)
      .catch((e) => setStatus("Couldn't load your log: " + e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save: SaveFn = useCallback(
    (kind, k, data) => {
      setLogs((l) => {
        if (!l) return l;
        const next = { ...l, [kind]: { ...l[kind] } };
        if (data === null) delete next[kind][k];
        else next[kind][k] = data as never;
        return next;
      });
      (data === null ? store.remove(kind, k) : store.put(kind, k, data))
        .then(() => setStatus(""))
        .catch((e) => setStatus("Not saved — " + e.message + ". Check your connection and try again."));
    },
    [store],
  );

  if (!logs) return <div className="wrap"><p className="muted">{status || "Loading your log…"}</p></div>;

  const W = plan.weeks[week - 1];
  const dates = weekDates(plan.startDate, week);
  const keys = dates.map(key);
  const rows = keys.map((k) => logs.days[k] ?? {});
  const tots = rows.map(dayTotals);
  const wt = avg(rows.map((r) => num(r.weight)));
  const prev = week > 1 ? avg(weekDates(plan.startDate, week - 1).map((d) => num(logs.days[key(d)]?.weight))) : null;
  const delta = wt !== null && prev !== null ? wt - prev : null;
  const cal = avg(tots.map((t) => t.cal));
  const pro = avg(tots.map((t) => t.p));
  const liftDays = week === 4 ? plan.testDays : plan.liftDays;
  const done = dates.filter((d) => liftDays.includes(d.getDay()) && (logs.sessions[key(d)]?.exercises ?? []).some((e) => e.sets.length)).length;
  const calOk = cal === null ? "" : cal >= W.macros.cal[0] - 100 && cal <= W.macros.cal[1] + 100 ? "ok" : "lo";
  const proOk = pro === null ? "" : pro >= W.macros.p[0] - 10 ? "ok" : "lo";
  const end = weekDates(plan.startDate, 4)[6];

  return (
    <div className="wrap">
      {store.mode === "demo" && (
        <div className="banner">Demo mode: your log is saved only in this browser. Accounts and syncing switch on once the database is connected.</div>
      )}
      <div className="top">
        <div>
          <h1>{intake.name ? `${intake.name}'s training log` : "Training log"}</h1>
          <p className="sub">
            {short(parseKey(plan.startDate))} – {short(end)} · {GOAL_LABEL[intake.goal]} · {intake.days} lifts a week · Week 4 testing
          </p>
        </div>
        <div className="actions">
          <button className="btn" type="button" onClick={() => import("../lib/export").then((m) => m.excelExport(profile, logs)).catch((e) => setStatus("Export failed: " + e.message))}>
            Download Excel
          </button>
          <button className="btn ghost" type="button" onClick={onEditPlan}>
            Edit plan
          </button>
          {onSignOut && (
            <button className="btn ghost" type="button" onClick={onSignOut} title={email}>
              Sign out
            </button>
          )}
        </div>
      </div>
      {status && (
        <p className="err" role="status">
          {status}
        </p>
      )}

      <nav className="plates" aria-label="Choose week">
        {plan.weeks.map((w) => {
          const ds = weekDates(plan.startDate, w.n);
          return (
            <button key={w.n} type="button" className="plate" style={{ ["--pc" as string]: `var(${WEEK_COLORS[w.n - 1]})` }} aria-pressed={week === w.n} onClick={() => setWeek(w.n)}>
              <span className="dot">{w.n}</span>
              <span className="lbl">
                <b>
                  Week {w.n} · {w.name}
                </b>
                <span>
                  {short(ds[0])} – {short(ds[6])}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <div className="summary">
        <div className="stat">
          <div className="k">Avg morning weight</div>
          <div className="v">
            {fmt(wt, 1)}
            <small> lb</small>
          </div>
          <div className="t">{delta === null ? "Week-over-week change shows once two weeks are logged" : `${delta > 0 ? "+" : ""}${fmt(delta, 1)} lb vs. last week`}</div>
        </div>
        <div className="stat">
          <div className="k">Avg calories</div>
          <div className={"v " + calOk}>{fmt(cal)}</div>
          <div className="t">
            Target {W.macros.cal[0].toLocaleString()}–{W.macros.cal[1].toLocaleString()}
          </div>
        </div>
        <div className="stat">
          <div className="k">Avg protein</div>
          <div className={"v " + proOk}>
            {fmt(pro)}
            <small> g</small>
          </div>
          <div className="t">Target {W.macros.p[0]}+ g</div>
        </div>
        <div className="stat">
          <div className="k">{week === 4 ? "Tests done" : "Lifts done"}</div>
          <div className="v">
            {done}
            <small> / {liftDays.length}</small>
          </div>
          <div className="t">{liftDays.map((d) => DAYNAMES[d]).join(" · ")}</div>
        </div>
      </div>

      <section>
        <div className="sechead">
          <h2>Daily check-ins</h2>
          <span className="hint">Tap a day to log morning weight and notes</span>
        </div>
        <div className="tbl">
          <table className="clickable">
            <thead>
              <tr>
                <th>Day</th>
                <th>Session</th>
                <th>Weight (lb)</th>
                <th>Calories</th>
                <th>Protein (g)</th>
                <th>Carbs (g)</th>
                <th>Fat (g)</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {dates.map((d, i) => {
                const k = keys[i];
                const r = rows[i];
                const t = tots[i];
                return (
                  <tr key={k} className={k === today ? "today" : ""} onClick={() => setEditDay(k)}>
                    <td>
                      <button type="button" className="linkbtn" onClick={(e) => (e.stopPropagation(), setEditDay(k))}>
                        {DAYNAMES[d.getDay()]} {short(d)}
                      </button>
                    </td>
                    <td>{logs.sessions[k]?.session || sessionFor(plan, week, d.getDay()).name}</td>
                    <td>{fmt(num(r.weight), 1)}</td>
                    <td>{fmt(t.cal)}</td>
                    <td>{fmt(t.p)}</td>
                    <td>{fmt(t.c)}</td>
                    <td>{fmt(t.f)}</td>
                    <td className="wrapcell">{r.notes || <span className="empty">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <Food plan={plan} week={week} logs={logs} save={save} />
      <Sessions profile={profile} week={week} logs={logs} save={save} />
      <Tests plan={plan} logs={logs} save={save} />

      <section>
        <h2>Plan notes</h2>
        <ul className="notes">
          {plan.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      </section>
      <Disclaimer />

      <DayEditor k={editDay} log={editDay ? logs.days[editDay] : undefined} onClose={() => setEditDay(null)} save={save} />
    </div>
  );
}

function DayEditor({ k, log, onClose, save }: { k: string | null; log?: DayLog; onClose: () => void; save: SaveFn }) {
  const [weight, setWeight] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    setWeight(log?.weight != null ? String(log.weight) : "");
    setNotes(log?.notes ?? "");
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = k ? parseKey(k) : null;
  return (
    <Sheet title={d ? `${DAYNAMES[d.getDay()]} ${short(d)}` : ""} open={!!k} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          save("days", k!, { ...log, weight: num(weight), notes: notes.trim() });
          onClose();
        }}
      >
        <label>
          Morning weight (lb)
          <input type="number" inputMode="decimal" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} autoFocus />
        </label>
        <label>
          Notes
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sleep, energy, soreness…" />
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
    </Sheet>
  );
}
