import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const moneySafetyPlugin = {
  rules: {
    "no-direct-money-arithmetic": {
      meta: {
        type: "problem",
        docs: { description: "Require Decimal methods for expense money arithmetic" },
        messages: { unsafe: "Use decimal.js methods for money arithmetic; direct operators can lose precision." },
        schema: [],
      },
      create(context) {
        return {
          BinaryExpression(node) {
            if (!["+", "-", "*", "/", "%", "**"].includes(node.operator)) return;
            const expression = context.sourceCode.getText(node).toLowerCase();
            if (/(amount|money|total|remaining|payer|split)/.test(expression)) {
              context.report({ node, messageId: "unsafe" });
            }
          },
        };
      },
    },
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/features/expense/**/*.{ts,tsx}"],
    plugins: { "tripmate-money": moneySafetyPlugin },
    rules: {
      "no-restricted-globals": ["error", { name: "parseFloat", message: "Use decimal.js for expense amounts." }],
      "no-restricted-syntax": [
        "error",
        { selector: "CallExpression[callee.name='Number']", message: "Use decimal.js for expense amounts." },
      ],
      "tripmate-money/no-direct-money-arithmetic": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
