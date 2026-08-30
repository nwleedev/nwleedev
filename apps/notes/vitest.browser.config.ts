import { fileURLToPath } from "node:url"

import { playwright } from "@vitest/browser-playwright"
import { defineConfig } from "vitest/config"

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom", "react-dom/client"],
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
