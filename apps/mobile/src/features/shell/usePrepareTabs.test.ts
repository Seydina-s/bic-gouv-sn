import { act, renderHook } from "@testing-library/react-native";
import { PREPARE_TABS_AFTER_MS, usePrepareTabs } from "./usePrepareTabs";

const mockPrefetch = jest.fn();
const mockQuery = jest.fn(() => Promise.resolve());
let mockSaving = false;
jest.mock("@tanstack/react-query", () => ({
  ...jest.requireActual<object>("@tanstack/react-query"),
  useQueryClient: () => ({ query: mockQuery }),
}));
jest.mock("expo-router", () => ({ useRouter: () => ({ prefetch: mockPrefetch }) }));
jest.mock("../data-saver/DataSaverProvider", () => ({
  useDataSaver: () => ({ saving: mockSaving }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  mockPrefetch.mockClear();
  mockQuery.mockClear();
  mockSaving = false;
});

afterEach(() => {
  jest.useRealTimers();
});

describe("usePrepareTabs", () => {
  it("prepares the procedures and the map's services once the front page has settled, never the map itself", async () => {
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
    expect(mockPrefetch.mock.calls).toEqual([["/procedures"]]);
    expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({ queryKey: ["services"] }));
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
    expect(mockQuery).not.toHaveBeenCalled();
  });
});
