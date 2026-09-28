import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Block, ProcedureDetail } from "@bgs/shared-types";
import { fireEvent, render, screen } from "@testing-library/react-native";
import * as Speech from "expo-speech";
import { Linking } from "react-native";
import { PROCEDURE_DETAIL } from "../../testing/procedure-fixtures";
import { TestProviders } from "../../testing/TestProviders";
import { ProcedureView, type ProcedureViewProps } from "./ProcedureView";

jest.mock("expo-localization", () => ({ getLocales: () => [{ languageTag: "fr-SN" }] }));
// Rendered outside a navigator: the page is always "focused".
jest.mock("expo-router", () => ({ useIsFocused: () => true }));
jest.mock("expo-speech", () => ({
  speak: jest.fn(),
  stop: jest.fn(() => Promise.resolve()),
  maxSpeechInputLength: 4000,
}));

// Placeholder texts shaped like an e-senegal.sn sheet, not real administrative content.
const p = (text: string): Block => ({ type: "paragraph", inlines: [{ text }] });
const SHEET: ProcedureDetail = {
  ...PROCEDURE_DETAIL,
  summary: null,
  costFcfa: null,
  delayDays: null,
  online: false,
  eligibility: null,
  documents: [],
  faqs: [],
  blocks: [
    p("Qui peut faire la demande ?"),
    p("Toute personne majeure."),
    p("Quelles sont les pièces à fournir ?"),
    p("• Une demande manuscrite"),
    p("• Un extrait de naissance"),
    p("Comment faire ?"),
    p("• Déposer le dossier au guichet"),
    p("• Retirer le récépissé"),
    p("NB : Un dossier incomplet est rejeté."),
  ],
};

async function show(
  detail: ProcedureDetail,
  onOpenRelated = jest.fn(),
  services?: ProcedureViewProps["services"],
) {
  await render(
    <TestProviders>
      <ProcedureView
        detail={detail}
        isPending={false}
        bottomInset={0}
        onOpenRelated={onOpenRelated}
        services={services}
      />
    </TestProviders>,
  );
}

describe("the page of a procedure", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it("answers first in brief, then lays out each question of the sheet", async () => {
    await show(SHEET);
    expect(screen.getByRole("header", { name: "En bref" })).toBeOnTheScreen();
    expect(screen.getByLabelText("Pour qui : Toute personne majeure.")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Pièces à fournir : 2 pièces" })).toBeOnTheScreen();
    // Its whole answer stands in the brief: the question is not repeated below.
    expect(screen.queryByRole("header", { name: "Qui peut faire la demande ?" })).toBeNull();
    expect(screen.getByRole("header", { name: "Comment faire ?" })).toBeOnTheScreen();
    expect(screen.getByText("1")).toBeOnTheScreen();
    expect(screen.getByText("2")).toBeOnTheScreen();
    expect(screen.getByLabelText("Remarque : Un dossier incomplet est rejeté.")).toBeOnTheScreen();
    expect(screen.getByText(/Source.: e-senegal.sn/)).toBeOnTheScreen();
  });

  it("lists the documents plainly, with nothing to tick", async () => {
    await show(SHEET);
    expect(screen.getByText("Une demande manuscrite")).toBeOnTheScreen();
    expect(screen.getByText("Un extrait de naissance")).toBeOnTheScreen();
    expect(screen.queryAllByRole("checkbox")).toHaveLength(0);
  });

  it("follows the sections in the order of the source", async () => {
    await show(SHEET);
    const headers = screen.getAllByRole("header");
    const at = (name: string) => headers.indexOf(screen.getByRole("header", { name }));
    const documents = at("Quelles sont les pièces à fournir ?");
    expect(documents).toBeGreaterThan(-1);
    expect(at("Comment faire ?")).toBeGreaterThan(documents);
  });

  it("opens related procedures and the official page", async () => {
    const onOpenRelated = jest.fn();
    const openURL = jest.spyOn(Linking, "openURL").mockResolvedValue(true);
    await show(SHEET, onOpenRelated);
    await fireEvent.press(screen.getByRole("button", { name: "Démarche de test B" }));
    expect(onOpenRelated).toHaveBeenCalledWith("demarche-test-b");
    await fireEvent.press(screen.getByRole("link", { name: "Faire la démarche sur e-senegal.sn" }));
    expect(openURL).toHaveBeenCalledWith(SHEET.sourceUrl);
    openURL.mockRestore();
  });

  it("reads the procedure aloud with the phone's French voice, then stops", async () => {
    await show(SHEET);
    await fireEvent.press(screen.getByRole("button", { name: "Écouter" }));
    expect(Speech.speak).toHaveBeenCalledWith(
      SHEET.title,
      expect.objectContaining({ language: "fr-FR" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Arrêter" }));
    expect(Speech.stop).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Écouter" })).toBeOnTheScreen();
  });

  it("leads to the nearest service the sheet names, only when one is verified", async () => {
    const where = { ...SHEET, blocks: [p("Où s'adresser ?"), p("Au commissariat de police.")] };
    const onOpen = jest.fn();
    await show(where, jest.fn(), { kinds: new Set(["police"]), onOpen });
    await fireEvent.press(
      screen.getByRole("button", { name: "Trouver le commissariat le plus proche" }),
    );
    expect(onOpen).toHaveBeenCalledWith("police");
    await screen.unmount();
    await show(where, jest.fn(), { kinds: new Set(["mairie"]), onOpen });
    expect(screen.queryByRole("button", { name: /le plus proche/ })).toBeNull();
  });

  it("shows a sheet without questions as plain text, without a brief", async () => {
    await show({ ...SHEET, blocks: [p("Les informations sont sur le site du ministère.")] });
    expect(screen.getByText("Les informations sont sur le site du ministère.")).toBeOnTheScreen();
    expect(screen.queryByRole("header", { name: "En bref" })).toBeNull();
  });
});
