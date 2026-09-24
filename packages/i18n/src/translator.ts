import type { Lang } from "@bgs/shared-types";
import { isPluralMessage, lookupMessage, type MessageKey, type MessageTree } from "./catalog";
import { selectPluralForm } from "./plural";

export type MessageParams = Readonly<Record<string, string | number>>;

export interface TranslatorOptions<T extends MessageTree> {
  lang: Lang;
  /** Complete French catalog: the reference and the fallback. */
  reference: T;
  /** Catalog of the active language; may be partial. */
  catalog: object;
  /** Called once per key rendered from the fallback, for monitoring. */
  onFallback?: (key: string, lang: Lang) => void;
}

const PLACEHOLDER = /\{(\w+)\}/g;

/** Replaces {name} placeholders; unknown ones are left visible rather than hidden. */
export function interpolate(template: string, params: MessageParams = {}): string {
  return template.replace(PLACEHOLDER, (placeholder, name: string) => {
    const value = params[name];
    return value === undefined ? placeholder : String(value);
  });
}

export function createTranslator<T extends MessageTree>(options: TranslatorOptions<T>) {
  const { lang, reference, catalog, onFallback } = options;

  return function translate(key: MessageKey<T>, params: MessageParams = {}): string {
    let message = lookupMessage(catalog, key);
    let messageLang = lang;
    if (message === undefined) {
      message = lookupMessage(reference, key);
      messageLang = "fr";
      onFallback?.(key, lang);
    }
    if (message === undefined) {
      return key;
    }
    const template = isPluralMessage(message)
      ? selectPluralForm(message, messageLang, Number(params["count"] ?? 0))
      : message;
    return interpolate(template, params);
  };
}

export type Translate<T extends MessageTree> = ReturnType<typeof createTranslator<T>>;
