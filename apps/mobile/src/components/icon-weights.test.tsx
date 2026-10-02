import { render, screen } from "@testing-library/react-native";
import { HouseIcon } from "phosphor-react-native/src/icons/House";

/*
 * The build keeps four weights of each icon (babel/strip-icon-weights.js, PERF-08);
 * the Icon component's type only accepts those (DrawnWeight in Icon.tsx).
 */
type Weight = "regular" | "fill" | "duotone" | "bold" | "thin" | "light";

async function strokesDrawn(weight: Weight): Promise<number> {
  await render(<HouseIcon weight={weight} />);
  return JSON.stringify(screen.toJSON()).split('"d":').length - 1;
}

describe("icon weights", () => {
  it("draws the weights the app uses", async () => {
    for (const kept of ["regular", "fill", "duotone", "bold"] as const) {
      expect(await strokesDrawn(kept)).toBeGreaterThan(0);
    }
  });

  it("leaves the unused weights out of the build", async () => {
    for (const removed of ["thin", "light"] as const) {
      expect(await strokesDrawn(removed)).toBe(0);
    }
  });
});
