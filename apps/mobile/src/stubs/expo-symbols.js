// Stand-in for expo-symbols when Expo Router's native tabs import it (see
// metro.config.js). On Android that import alone bundles the Material Symbols
// font (≈ 966 KB); the app never uses native tabs (it has its own tab bar) nor
// system symbols, so the loader is never called. If it ever were, it resolves to
// no icon rather than crashing.
export async function unstable_getMaterialSymbolSourceAsync() {
  return null;
}
