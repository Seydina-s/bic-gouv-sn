// @ts-check
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/coverage/**",
      "**/.next/**",
      "**/.expo/**",
      "**/android/**",
      "**/ios/**",
      ".claude/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: { allowDefaultProject: ["vitest.shared.ts"] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      "no-console": "error",
      eqeqeq: ["error", "always"],
      // Invisible control characters (e.g. a "\b" turned into a real backspace by a
      // shell) break patterns silently: never allowed in code (ERREURS.md, 26/09/2026).
      "no-control-regex": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[raw=/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/]",
          message: "Invisible control character in a literal: write it as an escape sequence.",
        },
        {
          selector: "TemplateElement[value.raw=/[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]/]",
          message: "Invisible control character in a template: write it as an escape sequence.",
        },
      ],
    },
  },
  {
    files: ["**/*.tsx", "apps/mobile/src/**/use*.ts"],
    ...reactHooks.configs.flat.recommended,
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ...tseslint.configs.disableTypeChecked,
  },
  prettier,
);
