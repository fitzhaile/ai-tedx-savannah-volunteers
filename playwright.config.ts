import { defineConfig, devices } from "@playwright/test";
import { loadDotEnv } from "./src/test/env";

loadDotEnv();

export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3100",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: "npm run start -- -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "mobile-chromium",
      use: {
        ...devices["iPhone 13"],
        defaultBrowserType: "chromium",
        browserName: "chromium",
        // The dev container pre-installs chromium here; avoids re-downloading.
        launchOptions: { executablePath: "/opt/pw-browsers/chromium" },
      },
    },
  ],
});
