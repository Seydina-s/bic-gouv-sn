/** A plural message. French uses "one" for 0 and 1; Wolof only needs "other". */
export interface PluralMessage {
  one?: string;
  many?: string;
  other: string;
}

export type Message = string | PluralMessage;

export interface MessageTree {
  [key: string]: Message | MessageTree;
}

/** Dot-separated path to every message of a catalog, e.g. "tabs.home". */
export type MessageKey<T> = {
  [K in keyof T & string]: T[K] extends Message ? K : `${K}.${MessageKey<T[K]>}`;
}[keyof T & string];

/** Same shape as the reference catalog, where any message may still be missing. */
export type PartialCatalog<T> = {
  [K in keyof T]?: T[K] extends Message ? T[K] : PartialCatalog<T[K]>;
};

const PLURAL_FORMS: ReadonlySet<string> = new Set(["one", "many", "other"]);

/**
 * A plural message has ONLY plural forms. A group that merely contains a key named
 * "other" (e.g. a list of labels) is not one: it was once misread that way.
 */
export function isPluralMessage(value: unknown): value is PluralMessage {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const entries = Object.entries(value);
  return (
    typeof Reflect.get(value, "other") === "string" &&
    entries.every(([key, text]) => PLURAL_FORMS.has(key) && typeof text === "string")
  );
}

function isMessage(value: unknown): value is Message {
  return typeof value === "string" || isPluralMessage(value);
}

export function lookupMessage(tree: object, key: string): Message | undefined {
  let node: unknown = tree;
  for (const segment of key.split(".")) {
    if (typeof node !== "object" || node === null) {
      return undefined;
    }
    node = Reflect.get(node, segment);
  }
  return isMessage(node) ? node : undefined;
}

/** Lists every message key of a catalog, in declaration order. */
export function listMessageKeys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([name, value]) => {
    const key = prefix === "" ? name : `${prefix}.${name}`;
    return isMessage(value) ? [key] : listMessageKeys(value, key);
  });
}

/** Keys present in the reference catalog but not yet translated in the target. */
export function findMissingMessages(reference: MessageTree, target: object): string[] {
  return listMessageKeys(reference).filter((key) => lookupMessage(target, key) === undefined);
}
