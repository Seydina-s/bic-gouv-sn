import { windowClass } from "@bgs/ui";
import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/useTheme";

export interface TwoPane {
  /** Tablets and unfolded foldables: a list and its detail side by side. */
  twoPane: boolean;
  /** Width of the list on the left, when there are two panes. */
  listPaneWidth: number;
  /** What remains for the detail on the right. */
  detailPaneWidth: number;
}

/**
 * The list + detail layout of large screens (CLAUDE.md §1), recomputed at every
 * change of size: folding, unfolding, rotating or resizing a window keeps the
 * screen's state, only the layout changes.
 */
export function useTwoPane(): TwoPane {
  const { width } = useWindowDimensions();
  const { theme } = useTheme();
  const { share, min, max } = theme.layout.listPane;
  const listPaneWidth = Math.round(Math.min(Math.max(width * share, min), max));
  return {
    twoPane: windowClass(width) === "expanded",
    listPaneWidth,
    detailPaneWidth: width - listPaneWidth,
  };
}

/**
 * Width of a tab's reading column: the screen without its side insets (a notch on
 * the side in landscape), at most the reading width. Every tab uses it, so their
 * outer margins match (owner's report, 14/10/2026).
 */
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { layout, space } = theme;
  return Math.min(width - insets.left - insets.right, layout.readingMaxWidth + space.xxxl);
}
