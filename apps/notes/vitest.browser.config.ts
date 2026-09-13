import { execFileSync } from "node:child_process"
import { fileURLToPath } from "node:url"

import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

const gitRevision = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
  encoding: "utf8",
}).trim()
const workingTree = execFileSync(
  "git",
  ["status", "--porcelain", "--untracked-files=no"],
  { encoding: "utf8" },
).trim()
const appRevision = workingTree === "" ? gitRevision : `${gitRevision}+working-tree`

export default defineConfig({
  define: {
    __NOTES_GIT_REVISION__: JSON.stringify(appRevision),
    "process.env": "{}",
  },
  optimizeDeps: {
    include: [
      "next/link",
      "next/navigation",
      "fast-check",
      "react",
      "react-dom",
      "react-dom/client",
    ],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    browser: {
      enabled: true,
      headless: true,
      instances: [
        { browser: "chromium" },
        { browser: "firefox" },
        { browser: "webkit" },
      ],
      provider: playwright(),
      screenshotFailures: false,
    },
    include: ["src/**/*.{browser,indexeddb}.test.{ts,tsx}"],
  },
})
