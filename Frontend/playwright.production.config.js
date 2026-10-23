import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./e2e-production',outputDir:'test-results-production',workers:1,use:{baseURL:'https://localhost:18443',ignoreHTTPSErrors:true,trace:'retain-on-failure',screenshot:'only-on-failure'},projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}]});
