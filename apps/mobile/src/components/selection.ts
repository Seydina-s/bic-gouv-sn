/** Width of the edge marking the row shown in the detail pane. */
const SELECTED_EDGE = 3;

/**
 * The edge of a list row whose detail is shown beside the list (large screens).
 * Not by colour alone: a thick green edge, and the row keeps its text in place.
 */
export function selectedEdge(selected: boolean, edgeColor: string, inset: number) {
  return {
    borderLeftWidth: SELECTED_EDGE,
    borderLeftColor: selected ? edgeColor : "transparent",
    paddingLeft: inset - SELECTED_EDGE,
    paddingRight: inset,
  };
}
