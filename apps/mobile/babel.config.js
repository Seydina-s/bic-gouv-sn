// Expo's default Babel setup, plus one build-time step for the icons (PERF-08).
// babel-preset-expo is resolved from expo itself, as Expo does without this file.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Babel loads its config as CommonJS
const path = require("node:path");

const expoPreset = require.resolve("babel-preset-expo", {
  paths: [path.dirname(require.resolve("expo/package.json"))],
});

module.exports = function babelConfig(api) {
  api.cache(true);
  return {
    presets: [expoPreset],
    plugins: [require.resolve("./babel/strip-icon-weights")],
  };
};
