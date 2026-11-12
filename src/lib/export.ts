import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import writeXlsxFile from "write-excel-file/browser";
import { parseKey, weekDates, key, weekOf } from "./dates";
import { dayTotals } from "./food";
import { howText, labels, rxFor, sessionFor } from "./plan";
import type { LogData, Profile } from "./types";

const pdfSafe = (s: unknown) => String(s ?? "").replace(/→/g, "->").replace(/[^\x00-\xFF–—]/g, "");

/** Printable session sheet with blank set boxes. */
export function sessionPdf(profile: Profile, dateKey: string) {
  const { plan } = profile;
  const d = parseKey(dateKey);
  const week = weekOf(plan.startDate, dateKey);
  const s = sessionFor(plan, week, d.getDay());
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "letter" });
  const W = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(pdfSafe(`${s.name} — Week ${week}`), 40, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(90);
  doc.text(
    pdfSafe(
      `${d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}   ·   Same letter = superset, back to back. F = to failure, L1/L2 = reps left.`,
    ),
    40,
    64,
  );
  doc.setTextColor(0);
  const nSets = week >= 4 ? 3 : 5;
  const lab = labels(s.ex);
  autoTable(doc, {
    head: [["", "Exercise", "How", "Target", "Effort", ...Array.from({ length: nSets }, (_, i) => `Set ${i + 1}`)]],
    body: s.ex.map((x) =>
      [lab.get(x), x.n, week >= 4 ? "" : howText(x, s.ex), rxFor(x, week), x.e, ...Array(nSets).fill("")].map(pdfSafe),
    ),
    startY: 78,
    margin: { left: 40, right: 40 },
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, valign: "middle", lineColor: [170, 170, 170], lineWidth: 0.5, textColor: [20, 20, 20], minCellHeight: 30 },
    headStyles: { fillColor: [235, 238, 242], textColor: [40, 40, 40], fontStyle: "bold", minCellHeight: 18 },
    columnStyles: {
      0: { cellWidth: 24, fontStyle: "bold", halign: "center" },
      1: { cellWidth: 110, fontStyle: "bold" },
      2: { cellWidth: 120, textColor: [90, 90, 90] },
      3: { cellWidth: 72 },
      4: { cellWidth: 110, textColor: [90, 90, 90] },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const yy = (doc as any).lastAutoTable.finalY + 26;
  doc.setFontSize(10);
  doc.text("Bodyweight: ________    Start: ______    End: ______", 40, yy);
  doc.text("Notes:", 40, yy + 22);
  doc.setDrawColor(170);
  [0, 1, 2].forEach((i) => doc.line(80, yy + 24 + i * 18, W - 40, yy + 24 + i * 18));
  doc.save(`${dateKey} ${s.name}.pdf`.replace(/[^\w .+-]/g, ""));
}

type Cell = { value: string | number; type?: StringConstructor | NumberConstructor; fontWeight?: "bold" } | null;
const hdr = (cols: string[]): Cell[] => cols.map((c) => ({ value: c, fontWeight: "bold" }));
const v = (x: unknown): Cell =>
  x === null || x === undefined || x === "" ? null : typeof x === "number" ? { value: x, type: Number } : { value: String(x), type: String };

export async function excelExport(profile: Profile, logs: LogData) {
  const { plan } = profile;
  const daily: Cell[][] = [hdr(["Date", "Week", "Session", "Weight (lb)", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)", "Notes"])];
  const food: Cell[][] = [hdr(["Date", "Week", "Meal", "What you ate", "Calories", "Protein (g)", "Carbs (g)", "Fat (g)"])];
  for (let w = 1; w <= 4; w++)
    weekDates(plan.startDate, w).forEach((d) => {
      const k = key(d);
      const r = logs.days[k] ?? {};
      const t = dayTotals(r);
      const s = sessionFor(plan, w, d.getDay());
      daily.push([v(k), v(w), v(logs.sessions[k]?.session || s.name), v(r.weight), v(t.cal), v(t.p), v(t.c), v(t.f), v(r.notes)]);
      (r.meals ?? []).forEach((m) => food.push([v(k), v(w), v(m.meal), v(m.food), v(m.cal), v(m.p), v(m.c), v(m.f)]));
    });
  const lifts: Cell[][] = [hdr(["Date", "Week", "Session", "Exercise", "Set", "Weight (lb)", "Reps", "Effort", "Note"])];
  Object.keys(logs.sessions)
    .sort()
    .forEach((k) => {
      const s = logs.sessions[k];
      (s.exercises ?? []).forEach((e) =>
        (e.sets ?? []).forEach((x, i) =>
          lifts.push([
            v(k), v(weekOf(plan.startDate, k)), v(s.session), v(e.name), v(i + 1), v(x.w), v(x.r),
            v(!x.e ? "" : x.e.toUpperCase() === "F" ? "Failure" : "Leave " + x.e), v(e.note),
          ]),
        ),
      );
    });
  const tests: Cell[][] = [hdr(["Test", "Unit", "Week 1 baseline", "Week 4 result"])];
  plan.tests.forEach((t) => tests.push([v(t.name), v(t.unit), v(logs.tests[t.id]?.baseline), v(logs.tests[t.id]?.result)]));

  const sheets = (
    [
      ["Daily", daily],
      ["Food", food],
      ["Lifts", lifts],
      ["Tests", tests],
    ] as const
  ).map(([sheet, data]) => ({ sheet, data, stickyRowsCount: 1 }));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await writeXlsxFile(sheets as any).toFile("training-log.xlsx");
}
