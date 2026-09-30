// Global (no import/export): font files bundled by Metro resolve to an asset id.
declare module "*.ttf" {
  const asset: number;
  export default asset;
}

// Images bundled by Metro (map markers, with their @2x and @3x): an asset id too.
declare module "*.png" {
  const asset: number;
  export default asset;
}
