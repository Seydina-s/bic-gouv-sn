import { describe, expect, it } from "vitest";
import { formText, formTexts } from "./form";

describe("form fields", () => {
  it("reads text only, never a file or a missing field", () => {
    const form = new FormData();
    form.set("email", "a@b.sn");
    form.set("file", new Blob(["x"]));
    form.append("slug", "a");
    form.append("slug", "");
    form.append("slug", "b");
    expect(formText(form, "email")).toBe("a@b.sn");
    expect(formText(form, "file")).toBe("");
    expect(formText(form, "absent")).toBe("");
    expect(formTexts(form, "slug")).toEqual(["a", "b"]);
  });
});
