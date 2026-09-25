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

export function isPluralMessage(value: unknown): value is PluralMessage {
  return (
    typeof value === "object" && value !== null && typeof Reflect.get(value, "other") === "string"
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
