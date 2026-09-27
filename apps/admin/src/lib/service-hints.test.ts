import { describe, expect, it } from "vitest";
import { serviceHints } from "./service-hints";

// Placeholder names shaped like those found in the OpenStreetMap import.
describe("hints for the person who verifies services", () => {
  it.each([
    ["SOFT SOLUTIONS SARL", ["notState"]],
    ["Banque de test", ["notState"]],
    ["Fédération de test de football", ["notState"]],
    ["Hôtel de test", ["notState"]],
    ["Hôtel de ville de Test", []],
    ["Mairie", ["vague"]],
    ["Annexe Mairie", ["vague"]],
    ["MAIRIE (ETAT CIVIL)", ["vague"]],
    ["Commissariat", ["vague"]],
    ["Commissariat de Test", []],
    ["Ministère de test", []],
  ])("flags « %s » with %j", (name, hints) => {
    expect(serviceHints(name)).toEqual(hints);
  });
});
