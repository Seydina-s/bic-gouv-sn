import { closingOf } from "./closing";

const now = new Date(2026, 9, 1, 15, 0);

describe("closingOf", () => {
  it("says the last day, the days left within a week, or the date", () => {
    expect(closingOf(null, now)).toEqual({ kind: "none" });
    expect(closingOf("2026-10-01", now)).toEqual({ kind: "today" });
    expect(closingOf("2026-10-02", now)).toEqual({ kind: "soon", days: 1 });
    expect(closingOf("2026-10-08", now)).toEqual({ kind: "soon", days: 7 });
    expect(closingOf("2026-10-09", now)).toEqual({ kind: "on", date: new Date(2026, 9, 9) });
  });
});
