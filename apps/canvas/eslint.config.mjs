import { fileURLToPath } from "node:url"
import boundaries from "@boundaries/eslint-plugin"
import { defineConfig, globalIgnores } from "eslint/config"
import imports from "eslint-plugin-import"
import hooks from "eslint-plugin-react-hooks"
import tseslint from "typescript-eslint"

const sourceFiles = ["src/**/*.{ts,tsx}"]
const layers = ["app", "pages", "widgets", "features", "entities", "shared"]
const publicEntry = "index.{ts,tsx}"
const tsconfig = fileURLToPath(new URL("./tsconfig.json", import.meta.url))

const elements = layers.map((type) => ({
  type,
  pattern: type === "app" || type === "shared" ? `src/${type}` : `src/${type}/*`,
  partialMatch: false,
}))

const lowerLayerPolicies = layers.slice(0, -1).map((type, index) => ({
  from: { element: { type } },
  allow: {
    to: layers.slice(index + 1).map((target) => ({
      element: {
        type: target,
        fileInternalPath: target === "shared" ? [`**/${publicEntry}`, "styles/index.css"] : publicEntry,
      },
    })),
  },
}))

export default defineConfig([
  globalIgnores(["dist/**"]),
  {
    files: sourceFiles,
    extends: [tseslint.configs.recommended],
    plugins: { boundaries, import: imports, "react-hooks": hooks },
    settings: {
      "boundaries/root-path": import.meta.dirname,
      "boundaries/legacy-templates": false,
      "boundaries/elements": elements,
      "import/resolver": { typescript: { project: tsconfig } },
    },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/static-components": "error",
      "@typescript-eslint/no-restricted-types": ["error", { types: { object: "Define the required fields or validate unknown input." } }],
      "boundaries/dependencies": ["error", {
        default: "disallow",
        checkInternals: true,
        policies: [
          {
            dependency: { relationship: { to: "internal" } },
            allow: { to: { element: { type: "*" } } },
          },
          ...lowerLayerPolicies,
        ],
      }],
      "boundaries/no-unknown-files": "error",
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/no-ignored-dependencies": "error",
      "import/no-cycle": ["error", { ignoreExternal: true }],
      "import/no-self-import": "error",
    },
  },
  {
    files: sourceFiles,
    ignores: ["src/app/composition/**"],
    rules: {
      "no-restricted-imports": ["error", {
        paths: [
          { name: "@zip.js/zip.js", message: "Use the archive operation provided by app composition." },
          { name: "idb", message: "Use the storage operation provided by app composition." },
        ],
        patterns: [
          { group: ["@zip.js/zip.js/**"], message: "Use the archive operation provided by app composition." },
          { group: ["idb/**"], message: "Use the storage operation provided by app composition." },
        ],
      }],
    },
  },
])
