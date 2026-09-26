// subset-font ships no types: the one call used by scripts/fonts.ts.
declare module "subset-font" {
  export default function subsetFont(
    font: Uint8Array,
    text: string,
    options?: { targetFormat?: "truetype" | "woff" | "woff2" | "sfnt" },
  ): Promise<Uint8Array>;
}
