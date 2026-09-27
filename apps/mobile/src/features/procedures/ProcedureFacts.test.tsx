import { render, screen } from "@testing-library/react-native";
import { I18nProvider } from "../../i18n/I18nProvider";
import { PROCEDURE_LIST } from "../../testing/procedure-fixtures";
import { ThemeProvider } from "../../theme/ThemeProvider";
import { ProcedureRow } from "./ProcedureRow";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));

describe("procedure facts", () => {
  it("says a fee of 0 is free, in words", async () => {
    const [first] = PROCEDURE_LIST.items;
    if (first === undefined) {
      throw new Error("fixture");
    }
    await render(
      <ThemeProvider>
        <I18nProvider>
          <ProcedureRow item={{ ...first, costFcfa: 0 }} onPress={jest.fn()} />
        </I18nProvider>
      </ThemeProvider>,
    );
    expect(screen.getByText("Gratuit")).toBeOnTheScreen();
    expect(screen.queryByText(/0.F.CFA/)).toBeNull();
  });
});
