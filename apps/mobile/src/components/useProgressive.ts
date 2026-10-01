import { useEffect, useState } from "react";

/**
 * How many of `total` parts to draw: `first` at once, all of them right after the
 * first frame. A long screen no longer holds itself back from sliding in the
 * instant it is tapped; the rest follows before the eye notices.
 */
export function useProgressive(total: number, first: number): number {
  const [all, setAll] = useState(total <= first);
  useEffect(() => {
    if (all) {
      return undefined;
    }
    const frame = requestAnimationFrame(() => {
      setAll(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [all]);
  return all ? total : first;
}
