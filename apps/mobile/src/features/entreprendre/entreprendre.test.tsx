import { render, screen } from "@testing-library/react-native";
import type { Block } from "@bgs/shared-types";
import { TestProviders } from "../../testing/TestProviders";
import { GuideRenderer } from "./GuideRenderer";
import { guideParts } from "./steps";

// Placeholder words, shaped like der.sn's guide "Comment déposer un dossier".
const GUIDE: Block[] = [
  { type: "heading", level: 3, inlines: [{ text: "Guide fictif" }] },
  { type: "paragraph", inlines: [{ text: "1- Ouvrez la page fictive" }] },
  { type: "paragraph", inlines: [{ text: "2- Cliquez sur " }, { text: "VALIDER", bold: true }] },
  { type: "list", ordered: false, items: [[{ text: "Montant fictif" }]] },
  { type: "paragraph", inlines: [{ text: "3) Suivez votre demande" }] },
  { type: "paragraph", inlines: [{ text: "Texte fictif sans numéro." }] },
];

describe("an official guide of the Entreprendre space", () => {
  it("is cut into its blocks and its runs of numbered steps, words unchanged", () => {
    expect(guideParts(GUIDE).map((part) => part.kind)).toEqual([
      "block",
      "steps",
      "block",
      "steps",
      "block",
    ]);
    const [, first] = guideParts(GUIDE);
    expect(first).toEqual({
      kind: "steps",
      steps: [
        { number: 1, inlines: [{ text: "Ouvrez la page fictive" }] },
        { number: 2, inlines: [{ text: "Cliquez sur " }, { text: "VALIDER", bold: true }] },
      ],
    });
  });

  it("shows each step's number in its circle, read out as a step", async () => {
    await render(
      <TestProviders>
        <GuideRenderer blocks={GUIDE} />
      </TestProviders>,
    );
    expect(screen.getByText("Ouvrez la page fictive")).toBeOnTheScreen();
    expect(screen.getByLabelText("Étape 3")).toBeOnTheScreen();
    expect(screen.getByText("Montant fictif")).toBeOnTheScreen();
    expect(screen.getByText("Texte fictif sans numéro.")).toBeOnTheScreen();
  });
});
