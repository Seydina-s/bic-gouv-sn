import { PHOTO_MAX_BYTES } from "@bgs/shared-types";
import { createParticipationClient, SendError } from "./participation-client";

const report = {
  category: "voirie" as const,
  detail: null,
  text: "Un signalement fictif.",
  place: null,
  lang: "fr" as const,
};

describe("createParticipationClient", () => {
  it("says what went wrong: offline, too many, switched off, the photo", async () => {
    const answer = (status: number) =>
      createParticipationClient({
        baseUrl: "https://api.test",
        fetchImpl: () => Promise.resolve(new Response("{}", { status })),
      });
    const failureOf = (promise: Promise<void>) =>
      promise.then(
        () => "sent",
        (error: unknown) => (error instanceof SendError ? error.failure : "other"),
      );
    expect(
      await failureOf(answer(201).sendReport({ ...report, photo: null }, "cle-de-test-0001")),
    ).toBe("sent");
    expect(
      await failureOf(answer(429).sendReport({ ...report, photo: null }, "cle-de-test-0002")),
    ).toBe("busy");
    expect(
      await failureOf(answer(503).sendReport({ ...report, photo: null }, "cle-de-test-0003")),
    ).toBe("closed");
    expect(
      await failureOf(answer(422).sendReport({ ...report, photo: null }, "cle-de-test-0004")),
    ).toBe("photo");
    const offline = createParticipationClient({
      baseUrl: "https://api.test",
      fetchImpl: () => Promise.reject(new Error("network")),
    });
    expect(
      await failureOf(offline.sendReport({ ...report, photo: null }, "cle-de-test-0005")),
    ).toBe("offline");
  });

  it("refuses a photo too heavy before sending it", async () => {
    const fetchImpl = jest.fn(() => Promise.resolve(new Response("{}", { status: 201 })));
    const client = createParticipationClient({ baseUrl: "https://api.test", fetchImpl });
    const heavy = "A".repeat(Math.ceil((PHOTO_MAX_BYTES * 4) / 3) + 8);
    await expect(
      client.sendReport({ ...report, photo: heavy }, "cle-de-test-0006"),
    ).rejects.toEqual(new SendError("photo"));
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
