import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

import { readAppRevision } from "./test-app-revision.js"

const appRevision = readAppRevision()

export default defineConfig({
  define: {
    __NOTES_GIT_REVISION__: JSON.stringify(appRevision),
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    exclude: ["src/**/*.{browser,indexeddb}.test.{ts,tsx}"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
})
