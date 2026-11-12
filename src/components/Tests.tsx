import type { ReactNode } from "react";
import type { LogData, Plan } from "../lib/types";
import type { SaveFn } from "./Dashboard";

export default function Tests({ plan, logs, save }: { plan: Plan; logs: LogData; save: SaveFn }) {
  return (
    <section>
      <div className="sechead">
        <h2>Test board</h2>
        <span className="hint">Week 1 baseline vs. Week 4 result · type to save</span>
      </div>
      <div className="tbl">
        <table>
          <thead>
            <tr>
              <th>Test</th>
              <th>Unit</th>
              <th>Week 1 baseline</th>
              <th>Week 4 result</th>
              <th>Change</th>
            </tr>
          </thead>
          <tbody>
            {plan.tests.map((t) => {
              const v = logs.tests[t.id] ?? {};
              const b = v.baseline ?? "";
              const r = v.result ?? "";
              let ch: ReactNode = "—";
              if (/^-?[\d.]+$/.test(b) && /^-?[\d.]+$/.test(r)) {
                const d = parseFloat(r) - parseFloat(b);
                const better = t.lowerBetter ? d < 0 : d > 0;
                ch = (
                  <span className={d === 0 ? "" : better ? "ok" : "lo"}>
                    {d > 0 ? "+" : ""}
                    {d.toFixed(1).replace(/\.0$/, "")}
                  </span>
                );
              }
              const field = (f: "baseline" | "result", val: string) => (
                <input
                  className="cellinput"
                  aria-label={`${t.name} ${f}`}
                  defaultValue={val}
                  key={val}
                  inputMode={t.unit === "min:s" ? "text" : "decimal"}
                  placeholder={t.unit === "min:s" ? "m:ss" : ""}
                  onBlur={(e) => {
                    const nv = e.target.value.trim();
                    if (nv !== val) save("tests", t.id, { ...v, [f]: nv });
                  }}
                />
              );
              return (
                <tr key={t.id}>
                  <td>{t.name}</td>
                  <td>{t.unit}</td>
                  <td>{field("baseline", b)}</td>
                  <td>{field("result", r)}</td>
                  <td>{ch}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
