import { windowClass } from "@bgs/ui";
import { useWindowDimensions } from "react-native";
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
