// Bundle weight (PERF-08): each Phosphor icon definition ships six weights; the app
// draws only regular, fill, duotone and bold. The unused entries of each weight map
// (`new Map([["thin", …], ["light", …], …])`) are removed at build time.
// A test (src/components/icon-weights.test.ts) keeps the app from asking for them.
const UNUSED_WEIGHTS = new Set(["thin", "light"]);
const ICON_DEFINITIONS = /phosphor-react-native[\\/]src[\\/]defs[\\/]/;

module.exports = function stripIconWeights() {
  return {
    name: "strip-icon-weights",
    visitor: {
      ArrayExpression(path, state) {
        if (!ICON_DEFINITIONS.test(state.filename ?? "")) {
          return;
        }
        const [weight] = path.node.elements;
        if (
          path.parentPath.isArrayExpression() &&
          path.node.elements.length === 2 &&
          weight?.type === "StringLiteral" &&
          UNUSED_WEIGHTS.has(weight.value)
        ) {
          path.remove();
        }
      },
    },
  };
};
