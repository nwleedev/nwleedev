import { defineConfig, globalIgnores } from "eslint/config"
import boundaries from "@boundaries/eslint-plugin"
import vitest from "@vitest/eslint-plugin"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTypeScript from "eslint-config-next/typescript"

const sourceFiles = ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"]
const publicEntryPoint = "index.{ts,tsx}"
const pagePublicEntryPoint = "{composition,index}.{ts,tsx}"

const element = (type, fileInternalPath) => ({
  element: {
    type,
    ...(fileInternalPath ? { fileInternalPath } : {}),
  },
})

const allowPublicEntries = (types) =>
  types.map((type) => element(type, publicEntryPoint))

const dependencyPolicies = [
  {
    dependency: {
      relationship: {
        to: "internal",
      },
      source: ["[.]/**", "[.][.]/**"],
    },
    allow: {
      to: {
        element: {
          type: "*",
        },
      },
    },
  },
  {
    from: element("route"),
    allow: {
      to: [
        element("page", publicEntryPoint),
        element("app", publicEntryPoint),
        element("app", "styles/globals.css"),
      ],
    },
  },
  {
    from: element("app"),
    allow: {
      to: [
        element("page", pagePublicEntryPoint),
        ...allowPublicEntries(["feature", "entity", "shared"]),
      ],
    },
  },
  {
    from: element("page"),
    allow: {
      to: allowPublicEntries(["feature", "entity", "shared"]),
    },
  },
  {
    from: element("feature"),
    allow: {
      to: allowPublicEntries(["entity", "shared"]),
    },
  },
  {
    from: element("entity"),
    allow: {
      to: element("shared", publicEntryPoint),
    },
  },
  {
    from: element("entity"),
    dependency: {
      kind: "type",
    },
    allow: {
      to: element(
        "entity",
        "@x/{{from.element.captured.slice}}.{ts,tsx}",
      ),
    },
  },
  {
    from: element("shared"),
    allow: {
      to: element("shared", publicEntryPoint),
    },
  },
  {
    dependency: {
      relationship: {
        to: "internal",
      },
    },
    disallow: {
      to: {
        element: {
          fileInternalPath: pagePublicEntryPoint,
        },
      },
    },
  },
]

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    files: sourceFiles,
    plugins: {
      boundaries,
    },
    settings: {
      "boundaries/root-path": import.meta.dirname,
      "boundaries/legacy-templates": false,
      "boundaries/elements": [
        {
          type: "route",
          pattern: "app",
          partialMatch: false,
        },
        {
          type: "app",
          pattern: "src/_app",
          partialMatch: false,
        },
        {
          type: "page",
          pattern: "src/_pages/*",
          capture: ["slice"],
          partialMatch: false,
        },
        {
          type: "feature",
          pattern: "src/features/*",
          capture: ["slice"],
          partialMatch: false,
        },
        {
          type: "entity",
          pattern: "src/entities/*",
          capture: ["slice"],
          partialMatch: false,
        },
        {
          type: "shared",
          pattern: "src/shared/*/*",
          capture: ["segment", "module"],
          partialMatch: false,
        },
      ],
      "import/resolver": {
        typescript: {
          project: "./tsconfig.json",
        },
      },
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          checkInternals: true,
          policies: dependencyPolicies,
        },
      ],
      "boundaries/no-ignored-dependencies": "error",
      "boundaries/no-unknown-dependencies": "error",
      "boundaries/no-unknown-files": "error",
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportAllDeclaration",
          message:
            "공개 진입점에는 필요한 이름을 명시해 의도하지 않은 API 확장을 방지하세요.",
        },
      ],
    },
  },
  {
    files: ["**/*.{test,spec}.{ts,tsx}"],
    ignores: ["**/*.browser.test.{ts,tsx}"],
    plugins: {
      vitest,
    },
    rules: {
      "vitest/expect-expect": "error",
      "vitest/no-commented-out-tests": "error",
      "vitest/no-conditional-expect": "error",
      "vitest/no-conditional-in-test": "error",
      "vitest/no-disabled-tests": "error",
      "vitest/no-focused-tests": "error",
      "vitest/no-large-snapshots": "error",
      "vitest/no-standalone-expect": "error",
      "vitest/valid-expect": "error",
    },
  },
  globalIgnores([".next/**", "out/**", "next-env.d.ts", "temps/**"]),
])
