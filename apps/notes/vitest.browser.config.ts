import { fileURLToPath } from "node:url"

import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

import { readAppRevision } from "./test-app-revision.js"

const appRevision = readAppRevision()

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
