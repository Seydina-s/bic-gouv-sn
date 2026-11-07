import AsyncStorage from "@react-native-async-storage/async-storage";
import { render, screen, waitFor } from "@testing-library/react-native";
import { NotificationsProvider } from "./NotificationsProvider";
import { permission, pushToken, type PermissionState } from "./push-registration";

const TOKEN = "ExponentPushToken[abcdefghij0123456789]";

const mockSubscribe = jest.fn<Promise<void>, [unknown]>(() => Promise.resolve());
const mockUnsubscribe = jest.fn<Promise<void>, [string]>(() => Promise.resolve());

jest.mock("../../api/push-client", () => ({
  createPushClient: () => ({
    subscribe: (subscription: unknown) => mockSubscribe(subscription),
    unsubscribe: (token: string) => mockUnsubscribe(token),
  }),
}));
jest.mock("../../i18n/useTranslation", () => ({
  useTranslation: () => ({ t: (key: string) => key, lang: "fr" }),
}));
jest.mock("./push-registration", () => ({
  pushSupported: () => true,
  permission: jest.fn(),
  askPermission: jest.fn(),
  pushToken: jest.fn(),
}));

const permissionMock = jest.mocked(permission);
const pushTokenMock = jest.mocked(pushToken);

/** The phone as left by an earlier opening: notifications on, this token given to the API. */
async function phoneWithNotificationsOn(state: PermissionState) {
  await AsyncStorage.setItem("bgs-notifications", "on");
  await AsyncStorage.setItem("bgs-push-token", TOKEN);
  permissionMock.mockResolvedValue(state);
  pushTokenMock.mockResolvedValue(TOKEN);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockSubscribe.mockClear();
  mockUnsubscribe.mockClear();
  permissionMock.mockClear();
  pushTokenMock.mockClear();
});

describe("the subscription kept by the API (PUSH-07)", () => {
  it("is renewed at each opening while notifications are allowed", async () => {
    await phoneWithNotificationsOn("granted");
    await render(<NotificationsProvider>{null}</NotificationsProvider>);
    await waitFor(() => {
      expect(mockSubscribe).toHaveBeenCalledWith(expect.objectContaining({ token: TOKEN }));
    });
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it("is withdrawn once when the phone's settings refuse notifications", async () => {
    await phoneWithNotificationsOn("denied");
    await render(<NotificationsProvider>{null}</NotificationsProvider>);
    await waitFor(async () => {
      expect(await AsyncStorage.getItem("bgs-push-token")).toBeNull();
    });
    expect(mockUnsubscribe.mock.calls).toEqual([[TOKEN]]);
    await screen.unmount();
    mockUnsubscribe.mockClear();
    permissionMock.mockClear();

    // The next opening asks nothing more of the API, nor of Expo.
    await render(<NotificationsProvider>{null}</NotificationsProvider>);
    await waitFor(() => {
      expect(permissionMock).toHaveBeenCalled();
    });
    expect(mockUnsubscribe).not.toHaveBeenCalled();
    expect(mockSubscribe).not.toHaveBeenCalled();
    expect(pushTokenMock).not.toHaveBeenCalled();
  });
});
