import { render, screen } from "@testing-library/react-native";
import { PROCEDURE_LIST } from "../../testing/procedure-fixtures";
import { TestProviders } from "../../testing/TestProviders";
import { ProcedureRow } from "./ProcedureRow";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));

describe("procedure facts", () => {
  it("says a fee of 0 is free, in words", async () => {
    const [first] = PROCEDURE_LIST.items;
    if (first === undefined) {
      throw new Error("fixture");
    }
    await render(
      <TestProviders>
        <ProcedureRow item={{ ...first, costFcfa: 0 }} onPress={jest.fn()} />
      </TestProviders>,
    );
    expect(screen.getByText("Gratuit")).toBeOnTheScreen();
    expect(screen.queryByText(/0.F.CFA/)).toBeNull();
  });
});
