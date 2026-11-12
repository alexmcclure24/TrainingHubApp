import { describe, expect, it } from "vitest";
import { generatePlan, sessionFor } from "./plan";
import type { Intake } from "./types";

const base: Intake = {
  name: "", sex: "male", age: 30, heightIn: 72, weightLb: 200, goal: "recomp", days: 4,
  minutes: 60, equipment: "gym", experience: "intermediate", startDate: "2026-11-16",
};

describe("generatePlan", () => {
  it("builds 4 lifting days for a 4-day intake with an upper/lower split", () => {
    const p = generatePlan(base);
    expect(p.liftDays).toEqual([1, 2, 4, 5]);
    expect(p.schedule[1].name).toBe("Upper A");
    expect(p.schedule[1].ex[0].n).toBe("Barbell bench press");
    expect(p.testDays).toHaveLength(3);
  });

  it("recomp drops calories in weeks 3–4 and keeps protein high", () => {
    const p = generatePlan(base);
    expect(p.weeks[2].macros.cal[0]).toBeLessThan(p.weeks[0].macros.cal[0]);
    expect(p.weeks[0].macros.p[0]).toBe(180);
  });

  it("every combination produces sessions with exercises and sane macros", () => {
    for (const equipment of ["gym", "dumbbells", "home"] as const)
      for (const days of [2, 3, 4, 5, 6])
        for (const minutes of [45, 60, 75])
          for (const goal of ["recomp", "cut", "build", "strength"] as const) {
            const p = generatePlan({ ...base, equipment, days, minutes, goal, sex: "female", weightLb: 140, heightIn: 64 });
            expect(p.liftDays).toHaveLength(days);
            p.liftDays.forEach((d) => expect(sessionFor(p, 1, d).ex.length).toBeGreaterThanOrEqual(4));
            p.testDays.forEach((d) => expect(sessionFor(p, 4, d).ex.length).toBeGreaterThan(0));
            p.weeks.forEach((w) => {
              expect(w.macros.cal[0]).toBeGreaterThan(1200);
              expect(w.macros.c[0]).toBeGreaterThan(50);
              expect(w.macros.f[0]).toBeGreaterThan(30);
            });
          }
  });

  it("home equipment never prescribes barbell or machine work", () => {
    const p = generatePlan({ ...base, equipment: "home", minutes: 75 });
    const names = Object.values(p.schedule).flatMap((s) => s.ex.map((x) => x.n)).join(" ");
    expect(names).not.toMatch(/barbell|machine|cable|leg press|trap bar|sled|lat pulldown/i);
  });
});
