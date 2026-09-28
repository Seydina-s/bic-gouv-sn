import { describe, expect, it } from "vitest";
import { isCurrentSection } from "./navigation";

describe("isCurrentSection", () => {
  it("marks the open section, its own pages included", () => {
    expect(isCurrentSection("/services", "/services")).toBe(true);
    expect(isCurrentSection("/services/osm-n1", "/services")).toBe(true);
    expect(isCurrentSection("/services-bis", "/services")).toBe(false);
  });

  it("marks the service status only on the home page", () => {
    expect(isCurrentSection("/", "/")).toBe(true);
    expect(isCurrentSection("/erreurs", "/")).toBe(false);
  });
});
