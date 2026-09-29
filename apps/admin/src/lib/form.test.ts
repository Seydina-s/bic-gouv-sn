import { describe, expect, it } from "vitest";
import { formIdempotencyKey, formText, formTexts } from "./form";

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

  it("reads a form's idempotency key, and leaves out a malformed one", () => {
    const form = new FormData();
    expect(formIdempotencyKey(form)).toBeNull();
    form.set("idempotencyKey", "cle-de-test-du-formulaire");
    expect(formIdempotencyKey(form)).toBe("cle-de-test-du-formulaire");
    form.set("idempotencyKey", "court");
    expect(formIdempotencyKey(form)).toBeNull();
    form.set("idempotencyKey", "a".repeat(20) + " espace");
    expect(formIdempotencyKey(form)).toBeNull();
  });
});
