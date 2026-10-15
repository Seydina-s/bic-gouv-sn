import { render, screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { InvertedTheme } from "./InvertedTheme";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

function Scheme() {
  const { theme } = useTheme();
  return <Text testID="scheme">{theme.scheme}</Text>;
}

describe("a part drawn in the opposite mode", () => {
  it("is dark in light mode, and keeps the app's mode when off", async () => {
    await render(
      <ThemeProvider>
        <InvertedTheme when>
          <Scheme />
        </InvertedTheme>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("scheme")).toHaveTextContent("dark");
    await render(
      <ThemeProvider>
        <InvertedTheme when={false}>
          <Scheme />
        </InvertedTheme>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("scheme")).toHaveTextContent("light");
  });
});
