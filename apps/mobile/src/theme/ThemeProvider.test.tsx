import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { themes } from "@bgs/ui";
import { AccessibilityInfo, Text, type ColorSchemeName } from "react-native";
import { fadeFrom, ThemeFade } from "./ThemeFade";
import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

// The React Native jest preset stubs useColorScheme to always return "light":
// restore the real hook so live switching is really exercised.
jest.mock("react-native/Libraries/Utilities/useColorScheme", () =>
  jest.requireActual<object>("react-native/Libraries/Utilities/useColorScheme"),
);

// The real hook imports these functions directly from this internal module,
// so the module itself is mocked to simulate the phone's light/dark setting.
let mockSystemScheme: ColorSchemeName = "light";
const mockListeners = new Set<() => void>();

jest.mock("react-native/Libraries/Utilities/Appearance", () => ({
  ...jest.requireActual<object>("react-native/Libraries/Utilities/Appearance"),
  getColorScheme: () => mockSystemScheme,
  addChangeListener: (listener: () => void) => {
    mockListeners.add(listener);
    return { remove: () => mockListeners.delete(listener) };
  },
}));

function setPhoneScheme(scheme: ColorSchemeName) {
  mockSystemScheme = scheme;
  mockListeners.forEach((listener) => {
    listener();
  });
}

beforeEach(async () => {
  mockSystemScheme = "light";
  // A scheme forced in Settings by one test must not carry over to the next.
  await AsyncStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function SchemeProbe() {
  const { theme, setPreference } = useTheme();
  return (
    <Text
      testID="scheme"
      onPress={() => {
        setPreference("light");
      }}
    >
      {theme.scheme}
    </Text>
  );
}

async function renderProbe() {
  await render(
    <ThemeProvider>
      <SchemeProbe />
    </ThemeProvider>,
  );
  return () => screen.getByTestId("scheme");
}

describe("ThemeProvider", () => {
  it("uses the light theme when the phone is in light mode", async () => {
    const scheme = await renderProbe();
    expect(scheme()).toHaveTextContent("light");
  });

  it("uses the dark theme when the phone is in dark mode", async () => {
    mockSystemScheme = "dark";
    const scheme = await renderProbe();
    expect(scheme()).toHaveTextContent("dark");
  });

  it("switches live when the phone changes mode during use", async () => {
    const scheme = await renderProbe();
    await act(() => {
      setPhoneScheme("dark");
    });
    expect(scheme()).toHaveTextContent("dark");
  });

  it("keeps the scheme forced in Settings whatever the phone mode", async () => {
    mockSystemScheme = "dark";
    const scheme = await renderProbe();
    await fireEvent.press(scheme());
    expect(scheme()).toHaveTextContent("light");
  });

  it("dissolves from the previous background when the mode changes", () => {
    expect(fadeFrom(themes.light, themes.dark, false)).toBe(themes.light.color.background);
    expect(fadeFrom(themes.dark, themes.light, null)).toBe(themes.dark.color.background);
    expect(fadeFrom(themes.light, themes.light, false)).toBeNull();
    expect(fadeFrom(themes.light, themes.dark, true)).toBeNull();
  });

  it("switches at once when the phone asks for less motion", async () => {
    jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
    await render(
      <ThemeProvider>
        <SchemeProbe />
        <ThemeFade />
      </ThemeProvider>,
    );
    await act(async () => {
      await Promise.resolve();
    });
    await act(() => {
      setPhoneScheme("dark");
    });
    expect(screen.getByTestId("scheme")).toHaveTextContent("dark");
    expect(screen.queryByTestId("theme-fade")).toBeNull();
  });

  it("fails loudly when used outside the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(render(<SchemeProbe />)).rejects.toThrow(/inside <ThemeProvider>/);
  });
});
