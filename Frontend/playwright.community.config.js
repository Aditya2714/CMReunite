/* eslint-env node */
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e-community",
  workers: 1,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    { command: "node ../Backend/tests/helpers/placementE2eServer.js", url: "http://127.0.0.1:4000/__test/state", timeout: 120000, reuseExistingServer: false },
    { command: "npm run dev -- --host 127.0.0.1", url: "http://127.0.0.1:5173", timeout: 120000, reuseExistingServer: false },
  ],
});
