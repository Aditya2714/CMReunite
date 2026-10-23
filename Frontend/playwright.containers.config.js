import {defineConfig,devices} from "@playwright/test";
export default defineConfig({testDir:"./e2e-containers",workers:1,use:{baseURL:"http://localhost:18080",trace:"retain-on-failure",screenshot:"only-on-failure"},projects:[{name:"chromium",use:{...devices["Desktop Chrome"]}}]});
