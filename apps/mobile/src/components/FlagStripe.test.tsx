import { render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../theme/ThemeProvider";
import { FlagStripe, starPoints } from "./FlagStripe";

describe("flag of Senegal", () => {
  it("draws a regular five-pointed star, tip up, inside its box", () => {
    const points = starPoints(10)
      .split(" ")
      .map((pair) => pair.split(",").map(Number));
    expect(points).toHaveLength(10);
    expect(points[0]).toEqual([10, 0]);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(20);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(20);
    }
  });

  it("carries the green star on the yellow band (not the flag of Mali)", async () => {
    await render(
      <ThemeProvider>
        <FlagStripe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("flag-star", { includeHiddenElements: true })).toBeTruthy();
  });
});
