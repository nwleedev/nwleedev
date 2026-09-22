import { defineConfig, devices } from "@playwright/test"

const clipboardPermissionSpec = /clipboard-permissions\.spec\.ts/u
const touchInteractionSpec = /touch-interactions\.spec\.ts/u
const desktopTestIgnore = [clipboardPermissionSpec, touchInteractionSpec]

export default defineConfig({
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  outputDir: "../../temps/notes-e2e-results-default",
  workers: 3,
  projects: [
    {
      name: "chromium",
      testIgnore: desktopTestIgnore,
      use: {
        ...devices["Desktop Chrome"],
        permissions: ["clipboard-read", "clipboard-write"],
      },
    },
    {
      name: "firefox",
      testIgnore: desktopTestIgnore,
      use: devices["Desktop Firefox"],
    },
    {
      name: "webkit",
      testIgnore: desktopTestIgnore,
      use: devices["Desktop Safari"],
    },
    {
      name: "chromium-clipboard",
      testMatch: clipboardPermissionSpec,
      use: devices["Desktop Chrome"],
    },
    {
      name: "chromium-touch",
      testMatch: touchInteractionSpec,
      use: {
        ...devices["Pixel 5"],
        permissions: ["clipboard-read", "clipboard-write"],
        viewport: { height: 720, width: 320 },
      },
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
