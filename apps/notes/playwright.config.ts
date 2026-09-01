import { defineConfig, devices } from "@playwright/test"

const clipboardPermissionSpec = /clipboard-permissions\.spec\.ts/u

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  outputDir: "../../temps/notes-e2e-results-default",
  projects: [
    {
      name: "chromium",
      testIgnore: clipboardPermissionSpec,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "firefox",
      testIgnore: clipboardPermissionSpec,
      use: devices["Desktop Firefox"],
    },
    {
      name: "webkit",
      testIgnore: clipboardPermissionSpec,
      use: devices["Desktop Safari"],
    },
    {
      name: "chromium-clipboard",
      testMatch: clipboardPermissionSpec,
      use: devices["Desktop Chrome"],
    },
  ],
  reporter: "line",
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "pnpm exec next start --hostname localhost --port 4173",
    reuseExistingServer: false,
    timeout: 120_000,
    url: "http://localhost:4173",
  },
})
