import { restingHeights, SHEET_SNAPS } from "./NearMeSheet";

describe("the map panel's resting heights", () => {
  it("show the same share above the tab bar, the panel running under it to the bottom", () => {
    expect(restingHeights(800, 90)).toEqual([290, 450, 650]);
  });

  it("keep their shares until the map's area is measured", () => {
    expect(restingHeights(0, 90)).toEqual([...SHEET_SNAPS]);
  });
});
