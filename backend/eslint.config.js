// ESLint setup for the Node.js and Express backend (CommonJS), added for the static analysis step of the pipeline.
const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

module.exports = [
  { ignores: ["node_modules/**", "logs/**"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "commonjs",
      globals: { ...globals.node },
    },
    rules: {
      // Unused values hide mistakes, names starting with an underscore are allowed to stay unused
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      // Console output is wrapped by utils/logger.js, direct calls elsewhere are flagged for review
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "no-var": "error",
      "prefer-const": "error",
    },
  },
  // These files print to the terminal on purpose: the logger itself, the admin seed script,
  // the logger check script and the console email provider used for local tests
  {
    files: ["utils/logger.js", "scripts/**/*.js", "services/emailService.js"],
    rules: { "no-console": "off" },
  },
  // Turns off every formatting rule that would clash with Prettier
  prettier,
];
