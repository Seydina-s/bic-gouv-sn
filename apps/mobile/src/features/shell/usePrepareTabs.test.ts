import { act, renderHook } from "@testing-library/react-native";
import { PREPARE_TABS_AFTER_MS, usePrepareTabs } from "./usePrepareTabs";

const mockPrefetch = jest.fn();
let mockSaving = false;
jest.mock("expo-router", () => ({ useRouter: () => ({ prefetch: mockPrefetch }) }));
jest.mock("../data-saver/DataSaverProvider", () => ({
  useDataSaver: () => ({ saving: mockSaving }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockPrefetch.mockClear();
  mockSaving = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("usePrepareTabs", () => {
  it("prepares the heavy tabs once the front page has settled", async () => {
    await renderHook(() => {
      usePrepareTabs(true);
    });
    await act(() => {
      jest.advanceTimersByTime(PREPARE_TABS_AFTER_MS - 1);
    });
    expect(mockPrefetch).not.toHaveBeenCalled();
    await act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(mockPrefetch.mock.calls).toEqual([["/procedures"], ["/near-me"]]);
  });

  it("leaves the map alone when saving data, and waits while the page is not shown", async () => {
    mockSaving = true;
    const { rerender } = await renderHook(
      ({ active }: { active: boolean }) => {
        usePrepareTabs(active);
      },
      { initialProps: { active: false } },
    );
    await act(() => {
      jest.advanceTimersByTime(PREPARE_TABS_AFTER_MS);
    });
    expect(mockPrefetch).not.toHaveBeenCalled();
    await rerender({ active: true });
    await act(() => {
      jest.advanceTimersByTime(PREPARE_TABS_AFTER_MS);
    });
    expect(mockPrefetch.mock.calls).toEqual([["/procedures"]]);
  });
});
