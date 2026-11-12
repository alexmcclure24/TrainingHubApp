import { useEffect, useState } from "react";
import type { ExerciseLog, LogData, Profile, SessionLog, SetLog } from "../lib/types";
import { DAYNAMES, key, short, todayKey, weekDates } from "../lib/dates";
import { labels, rxFor, sessionFor } from "../lib/plan";
import Sheet from "./Sheet";
import type { SaveFn } from "./Dashboard";

const effortText = (e?: string) => (!e ? "" : e.toUpperCase() === "F" ? "F" : "L" + e);

interface Target {
  day: string;
  name: string;
  rx?: string;
  effort?: string;
}

export default function Sessions({ profile, week, logs, save }: { profile: Profile; week: number; logs: LogData; save: SaveFn }) {
  const { plan } = profile;
  const today = todayKey();
  const [target, setTarget] = useState<Target | null>(null);
  const [notesFor, setNotesFor] = useState<string | null>(null);

  const cards = weekDates(plan.startDate, week)
    .map((d) => {
      const k = key(d);
      const s = sessionFor(plan, week, d.getDay());
      const log = logs.sessions[k];
      if (!s.ex.length && !log) return null;
      const logged = log?.exercises ?? [];
      const used = new Set<number>();
      const lab = labels(s.ex);
      const rows = s.ex.map((px) => {
        const nl = px.n.toLowerCase();
        const i = logged.findIndex((e, j) => !used.has(j) && e.name.toLowerCase() === nl);
        if (i > -1) used.add(i);
        return { name: px.n, lab: lab.get(px), ex: i > -1 ? logged[i] : null, rx: rxFor(px, week), effort: px.e };
      });
      logged.forEach((e, j) => {
        if (!used.has(j)) rows.push({ name: e.name, lab: "+", ex: e, rx: "", effort: "" });
      });
      const isLogged = logged.some((e) => e.sets.length);
      return (
        <article className="sess" key={k}>
          <header>
            <div>
              <h3>{log?.session || s.name}</h3>
              <div className="d">
                {DAYNAMES[d.getDay()]} {short(d)}
              </div>
            </div>
            <div className="hdr-r">
              {s.ex.length > 0 && (
                <button type="button" className="pdfbtn" onClick={() => import("../lib/export").then((m) => m.sessionPdf(profile, k))}>
                  Print sheet
                </button>
              )}
              <span className={"pill" + (isLogged ? " done" : "")}>{isLogged ? "Logged" : k < today ? "Not logged" : "Planned"}</span>
            </div>
          </header>
          <table>
            <thead>
              <tr>
                <th>Exercise</th>
                <th>Sets (lb × reps)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.name + i} className="rowbtn" onClick={() => setTarget({ day: k, name: r.name, rx: r.rx, effort: r.effort })}>
                  <td className="exname">
                    <div>
                      {r.lab && <span className="lab">{r.lab}</span>}
                      {r.name}
                    </div>
                    {(r.rx || r.effort) && <div className="rx">{[r.rx, r.effort].filter(Boolean).join(" · ")}</div>}
                  </td>
                  <td>
                    <div className="sets">
                      {r.ex?.sets.length ? (
                        r.ex.sets.map((x, j) => (
                          <span className="set" key={j}>
                            {[x.w, x.r].filter(Boolean).join("×")}
                            {x.e && <span className={"e" + (x.e.toUpperCase() === "F" ? " f" : "")}>{effortText(x.e)}</span>}
                          </span>
                        ))
                      ) : (
                        <span className="empty">—</span>
                      )}
                      <button
                        type="button"
                        className="addset"
                        aria-label={`Log sets for ${r.name}`}
                        onClick={(e) => (e.stopPropagation(), setTarget({ day: k, name: r.name, rx: r.rx, effort: r.effort }))}
                      >
                        + Log
                      </button>
                    </div>
                    {r.ex?.note && <div className="hint">{r.ex.note}</div>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="sessnote">
            {log?.notes ? <span>{log.notes}</span> : null}
            <button type="button" className="linkbtn" onClick={() => setNotesFor(k)}>
              {log?.notes ? "Edit notes" : "+ Session notes / extra exercise"}
            </button>
          </div>
        </article>
      );
    })
    .filter(Boolean);

  const tLog = target ? logs.sessions[target.day] : undefined;
  const tEx = target ? tLog?.exercises.find((e) => e.name.toLowerCase() === target.name.toLowerCase()) : undefined;

  function updateExercise(ex: ExerciseLog) {
    if (!target) return;
    const s: SessionLog = tLog ?? { exercises: [] };
    const others = s.exercises.filter((e) => e.name.toLowerCase() !== ex.name.toLowerCase());
    const idx = s.exercises.findIndex((e) => e.name.toLowerCase() === ex.name.toLowerCase());
    const list = [...others];
    if (ex.sets.length || ex.note) list.splice(idx > -1 ? idx : list.length, 0, ex);
    const next = { ...s, exercises: list };
    save("sessions", target.day, next.exercises.length || next.notes ? next : null);
  }

  return (
    <section>
      <div className="sechead">
        <h2>Sessions</h2>
        <span className="hint">Tap an exercise to log sets · F = to failure · L1/L2 = reps left in the tank</span>
      </div>
      <div className="sessions">{cards.length ? cards : <p className="empty">No sessions this week.</p>}</div>
      <SetLogger
        target={target}
        ex={tEx}
        onClose={() => setTarget(null)}
        onChange={updateExercise}
      />
      <SessionNotes
        k={notesFor}
        log={notesFor ? logs.sessions[notesFor] : undefined}
        onClose={() => setNotesFor(null)}
        onSave={(s, extra) => {
          const k = notesFor!;
          const base: SessionLog = logs.sessions[k] ?? { exercises: [] };
          const exercises = [...base.exercises];
          if (extra && !exercises.some((e) => e.name.toLowerCase() === extra.toLowerCase())) exercises.push({ name: extra, sets: [] });
          save("sessions", k, { ...base, notes: s, exercises });
          if (extra) setTarget({ day: k, name: extra });
        }}
      />
    </section>
  );
}

function SetLogger({ target, ex, onClose, onChange }: { target: Target | null; ex?: ExerciseLog; onClose: () => void; onChange: (e: ExerciseLog) => void }) {
  const [w, setW] = useState("");
  const [r, setR] = useState("");
  const [e, setE] = useState("");
  const [note, setNote] = useState("");
  useEffect(() => {
    const last = ex?.sets[ex.sets.length - 1];
    setW(last?.w ?? "");
    setR(last?.r ?? "");
    setE("");
    setNote(ex?.note ?? "");
  }, [target?.day, target?.name]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!target) return <Sheet title="" open={false} onClose={onClose}>{null}</Sheet>;
  const sets = ex?.sets ?? [];
  const write = (s: SetLog[], n = note) => onChange({ name: target.name, sets: s, note: n.trim() || undefined });
  return (
    <Sheet title={target.name} open onClose={onClose}>
      {(target.rx || target.effort) && <p className="muted small">{[target.rx, target.effort].filter(Boolean).join(" · ")}</p>}
      {sets.length > 0 && (
        <ol className="setlist">
          {sets.map((s, i) => (
            <li key={i}>
              <span>
                Set {i + 1}: <b>{[s.w && s.w + " lb", s.r && s.r + " reps"].filter(Boolean).join(" × ")}</b> {effortText(s.e)}
              </span>
              <button type="button" className="linkbtn danger" onClick={() => write(sets.filter((_, j) => j !== i))}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}
      <form
        className="form"
        onSubmit={(ev) => {
          ev.preventDefault();
          if (!w && !r) return;
          write([...sets, { w: w.trim(), r: r.trim(), e }]);
          setE("");
        }}
      >
        <div className="row3">
          <label>
            Weight (lb)
            <input value={w} onChange={(ev) => setW(ev.target.value)} inputMode="decimal" placeholder="185 or BW" />
          </label>
          <label>
            Reps
            <input value={r} onChange={(ev) => setR(ev.target.value)} inputMode="numeric" placeholder="6" />
          </label>
          <label>
            Effort
            <select value={e} onChange={(ev) => setE(ev.target.value)}>
              <option value="">—</option>
              <option value="F">Failure</option>
              <option value="1">1 left</option>
              <option value="2">2 left</option>
              <option value="3">3+ left</option>
            </select>
          </label>
        </div>
        <button className="btn" type="submit">
          Add set {sets.length + 1}
        </button>
        <label>
          Note <span className="muted">(optional)</span>
          <input value={note} onChange={(ev) => setNote(ev.target.value)} onBlur={() => (note.trim() || ex?.note) && write(sets, note)} placeholder="Felt easy, go up next week" />
        </label>
        <button type="button" className="btn ghost" onClick={onClose}>
          Done
        </button>
      </form>
    </Sheet>
  );
}

function SessionNotes({ k, log, onClose, onSave }: { k: string | null; log?: SessionLog; onClose: () => void; onSave: (notes: string, extra: string) => void }) {
  const [n, setN] = useState("");
  const [extra, setExtra] = useState("");
  useEffect(() => {
    setN(log?.notes ?? "");
    setExtra("");
  }, [k]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Sheet title="Session notes" open={!!k} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(n.trim(), extra.trim());
          onClose();
        }}
      >
        <label>
          Notes
          <textarea rows={3} value={n} onChange={(e) => setN(e.target.value)} placeholder="How it went, swaps, pain…" />
        </label>
        <label>
          Add an exercise not in the plan <span className="muted">(optional)</span>
          <input value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="e.g. Dips" />
        </label>
        <button className="btn" type="submit">
          Save
        </button>
      </form>
    </Sheet>
  );
}
