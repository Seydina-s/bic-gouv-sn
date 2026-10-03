import { render, screen } from "@testing-library/react-native";
import { TestProviders } from "../../testing/TestProviders";
import { LaunchLayer } from "./LaunchLayer";

let mockReduceMotion: boolean | null = false;
jest.mock("../../theme/useSystemAccessibility", () => ({
  ...jest.requireActual<object>("../../theme/useSystemAccessibility"),
  useReduceMotion: () => mockReduceMotion,
}));

describe("LaunchLayer", () => {
  it("grows the baobab, hidden from screen readers and from touch", async () => {
    mockReduceMotion = false;
    const onDone = jest.fn();
    await render(
      <TestProviders>
        <LaunchLayer onDone={onDone} />
      </TestProviders>,
    );
    const layer = screen.getByTestId("launch-layer", { includeHiddenElements: true });
    expect(layer).toHaveProp("pointerEvents", "none");
    // It starts from the official icon of the phone's launch screen.
    expect(screen.getByTestId("launch-mark", { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it("steps aside at once when the phone asks for less motion", async () => {
    mockReduceMotion = true;
    const onDone = jest.fn();
    await render(
      <TestProviders>
        <LaunchLayer onDone={onDone} />
      </TestProviders>,
    );
    expect(onDone).toHaveBeenCalledTimes(1);
  });
});
