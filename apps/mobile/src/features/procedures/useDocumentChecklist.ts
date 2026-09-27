import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useRef, useState } from "react";

const slot = (slug: string) => `bgs-checklist:${slug}`;

function parseTicked(saved: string): string[] {
  try {
    const value: unknown = JSON.parse(saved);
    return Array.isArray(value)
      ? value.filter((entry): entry is string => typeof entry === "string")
      : [];
  } catch {
    return [];
  }
}

export interface DocumentChecklist {
  ticked: ReadonlySet<string>;
  toggle: (entry: string) => void;
}

/**
 * The documents a person has ticked on a procedure's checklist, kept on the phone
 * so a file can be gathered over several days. Nothing leaves the device; a failed
 * save keeps the ticks for the current visit.
 */
export function useDocumentChecklist(slug: string): DocumentChecklist {
  const [ticked, setTicked] = useState<ReadonlySet<string>>(new Set());
  // A tick made before the saved ticks are read wins over them.
  const touched = useRef(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(slot(slug)).then(
      (saved) => {
        if (active && !touched.current && saved !== null) {
          setTicked(new Set(parseTicked(saved)));
        }
      },
      () => undefined,
    );
    return () => {
      active = false;
    };
  }, [slug]);

  const toggle = useCallback(
    (entry: string) => {
      touched.current = true;
      const next = new Set(ticked);
      if (next.has(entry)) {
        next.delete(entry);
      } else {
        next.add(entry);
      }
      setTicked(next);
      AsyncStorage.setItem(slot(slug), JSON.stringify([...next])).catch(() => undefined);
    },
    [slug, ticked],
  );

  return { ticked, toggle };
}
