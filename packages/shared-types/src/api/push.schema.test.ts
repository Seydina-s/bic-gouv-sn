import { describe, expect, it } from "vitest";
import { expoPushTokenSchema, isQuietHour, pushSubscriptionSchema } from "./push.schema";

// A placeholder token, shaped like Expo's.
const TOKEN = "ExponentPushToken[abcdefghij0123456789]";

describe("push subscriptions", () => {
  it("accept only Expo push tokens and known fields", () => {
    expect(expoPushTokenSchema.safeParse(TOKEN).success).toBe(true);
    expect(expoPushTokenSchema.safeParse("https://evil.example").success).toBe(false);
    const subscription = {
      token: TOKEN,
      topics: ["conseil-des-ministres"],
      quietHours: { from: 22, to: 7 },
      lang: "fr",
    };
    expect(pushSubscriptionSchema.safeParse(subscription).success).toBe(true);
    expect(pushSubscriptionSchema.safeParse({ ...subscription, phone: "77" }).success).toBe(false);
  });

  it("know the quiet hours, across midnight or within a day", () => {
    const night = { from: 22, to: 7 };
    expect([21, 22, 3, 6, 7].map((hour) => isQuietHour(night, hour))).toEqual([
      false,
      true,
      true,
      true,
      false,
    ]);
    const afternoon = { from: 13, to: 15 };
    expect([12, 13, 14, 15].map((hour) => isQuietHour(afternoon, hour))).toEqual([
      false,
      true,
      true,
      false,
    ]);
    expect(isQuietHour(null, 3)).toBe(false);
    expect(isQuietHour({ from: 5, to: 5 }, 5)).toBe(false);
  });
});
