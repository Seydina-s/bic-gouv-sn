import { fireEvent, render, screen } from "@testing-library/react-native";
import { getLocales } from "expo-localization";
import { Text } from "react-native";
import { I18nProvider } from "./I18nProvider";
import { useTranslation } from "./useTranslation";

jest.mock("expo-localization", () => ({ getLocales: jest.fn() }));

function mockDeviceLanguages(...tags: string[]) {
  jest.mocked(getLocales).mockReturnValue(tags.map((languageTag) => ({ languageTag })) as never);
}

function LangProbe() {
  const { lang, t, setLang } = useTranslation();
  return (
    <Text
      testID="probe"
      onPress={() => {
        setLang("fr");
      }}
    >
      {`${lang}|${t("tabs.home")}`}
    </Text>
  );
}

async function renderProbe() {
  await render(
    <I18nProvider>
      <LangProbe />
    </I18nProvider>,
  );
  return () => screen.getByTestId("probe");
}

describe("I18nProvider", () => {
  it("uses French on a French phone", async () => {
    mockDeviceLanguages("fr-SN");
    expect((await renderProbe())()).toHaveTextContent("fr|Accueil");
  });

  it("uses Wolof on a Wolof phone, with French fallback for untranslated strings", async () => {
    mockDeviceLanguages("wo-SN", "fr-FR");
    expect((await renderProbe())()).toHaveTextContent("wo|Accueil");
  });

  it("applies the language chosen by the user", async () => {
    mockDeviceLanguages("wo-SN");
    const probe = await renderProbe();
    await fireEvent.press(probe());
    expect(probe()).toHaveTextContent("fr|Accueil");
  });

  it("fails loudly when used outside the provider", async () => {
    jest.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(render(<LangProbe />)).rejects.toThrow(/inside <I18nProvider>/);
  });
});
