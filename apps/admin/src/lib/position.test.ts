import { describe, expect, it } from "vitest";
import { parsePosition, positionLink, positionText, samePosition } from "./position";

const PLACE = { lat: 14.6928, lng: -17.4467 };

describe("position pasted in the console", () => {
  it("reads coordinates typed by hand, with a dot or a French comma", () => {
    for (const typed of [
      "14.6928, -17.4467",
      "14.6928,-17.4467",
      " 14.6928 -17.4467 ",
      "14,6928, -17,4467",
      "14,6928 ; -17,4467",
      "14.6928°, -17.4467°",
    ]) {
      expect(parsePosition(typed)).toEqual(PLACE);
    }
  });

  it("reads the links copied from OpenStreetMap and Google Maps", () => {
    expect(
      parsePosition("https://www.openstreetmap.org/?mlat=14.6928&mlon=-17.4467#map=19/14.7/-17.4"),
    ).toEqual(PLACE);
    expect(parsePosition("https://www.openstreetmap.org/#map=19/14.6928/-17.4467")).toEqual(PLACE);
    // A Google place link: the place's own point wins over the view's centre.
    expect(
      parsePosition(
        "https://www.google.com/maps/place/Test/@14.7,-17.4,17z/data=!3m1!4b1!4m6!3m5!1s0x0:0x0!8m2!3d14.6928!4d-17.4467",
      ),
    ).toEqual(PLACE);
    expect(parsePosition("https://www.google.com/maps/@14.6928,-17.4467,18z")).toEqual(PLACE);
    expect(parsePosition("https://maps.google.com/?q=14.6928,-17.4467")).toEqual(PLACE);
  });

  it("finds nothing in text without coordinates, nor beyond the Earth's range", () => {
    for (const text of ["", "Dakar", "14.6928", "https://www.openstreetmap.org/", "95, 200"]) {
      expect(parsePosition(text)).toBeNull();
    }
  });

  it("writes a point back as maps give it, latitude first, and links to it", () => {
    expect(positionText(PLACE)).toBe("14.6928, -17.4467");
    expect(parsePosition(positionText(PLACE))).toEqual(PLACE);
    expect(positionLink(PLACE)).toBe(
      "https://www.openstreetmap.org/?mlat=14.6928&mlon=-17.4467#map=18/14.6928/-17.4467",
    );
    expect(samePosition(PLACE, { ...PLACE })).toBe(true);
    expect(samePosition(PLACE, { ...PLACE, lng: -17.4468 })).toBe(false);
  });
});
