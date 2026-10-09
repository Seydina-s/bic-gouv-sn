/*
 * Sites built with Nuxt put the data of the page they render in the page itself
 * (<script id="__NUXT_DATA__">), flattened by "devalue": one array where objects and
 * arrays refer to other entries by their position. Reading it is reading what the
 * site shows, without running its code.
 */

/** Wrappers Nuxt adds around reactive values: the value is their second entry. */
const WRAPPERS: ReadonlySet<string> = new Set([
  "ShallowReactive",
  "Reactive",
  "Ref",
  "ShallowRef",
  "EmptyRef",
  "EmptyShallowRef",
]);

/** devalue's special positions: undefined, a hole, NaN, ±Infinity, -0. */
function special(index: number): unknown {
  return index === -3 ? Number.NaN : index === -6 ? 0 : index <= -4 ? null : undefined;
}

function hydrate(values: readonly unknown[], index: unknown, seen: Map<number, unknown>): unknown {
  if (typeof index !== "number") {
    return index;
  }
  if (index < 0) {
    return special(index);
  }
  if (seen.has(index)) {
    return seen.get(index);
  }
  const value = values[index];
  if (Array.isArray(value)) {
    const [tag, inner] = value as unknown[];
    if (typeof tag === "string" && WRAPPERS.has(tag)) {
      return hydrate(values, inner, seen);
    }
    if (tag === "Date") {
      return inner;
    }
    const list: unknown[] = [];
    seen.set(index, list);
    for (const item of value as unknown[]) {
      list.push(hydrate(values, item, seen));
    }
    return list;
  }
  if (value !== null && typeof value === "object") {
    const object: Record<string, unknown> = {};
    seen.set(index, object);
    for (const [key, item] of Object.entries(value)) {
      object[key] = hydrate(values, item, seen);
    }
    return object;
  }
  return value;
}

/** The "data" of a Nuxt page (its fetched content, by key), or null when it has none. */
export function nuxtData(html: string): Record<string, unknown> | null {
  const script = /<script\b[^>]*\bid="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/.exec(html)?.[1];
  if (script === undefined) {
    return null;
  }
  try {
    const values = JSON.parse(script) as unknown;
    if (!Array.isArray(values)) {
      return null;
    }
    const root = hydrate(values, 0, new Map()) as { data?: unknown } | null;
    const data = root?.data;
    return data !== null && typeof data === "object" ? (data as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
