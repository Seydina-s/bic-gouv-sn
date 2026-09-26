// Global (no import/export): font files bundled by Metro resolve to an asset id.
declare module "*.ttf" {
  const asset: number;
  export default asset;
}
