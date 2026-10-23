import { test, expect } from "../e2e/helpers/secure-api.js";
const card = (page, name) => page.getByRole("article").filter({ has: page.getByRole("heading", { name: `${name} Alumni`, exact: true }) });
async function submit(page) {
  const response = page.waitForResponse((result) => result.url().includes("/alumni?") && result.request().method() === "GET");
  await page.getByRole("button", { name: "Search alumni", exact: true }).click();
  expect((await response).status()).toBe(200);
  await expect(page.getByRole("status")).not.toContainText("Searching");
}
test.beforeEach(async ({ page }) => {
  const login = await page.request.post("/auth/login", { data: { email: "viewer@example.com", password: "StrongPass123!", role: "alumni" } });
  expect(login.status()).toBe(200);
  await page.goto("/alumni-directory");
  await expect(page.getByRole("status")).not.toContainText("Searching");
});
test("company + VP designation and seniority find matches beyond 100 and exclude hidden profiles", async ({ page }) => {
  await expect(card(page, "Mira")).toHaveCount(0);
  await page.getByLabel("Company", { exact: true }).fill("Microsoft");
  await page.getByLabel("Designation", { exact: true }).fill("Vice-President");
  await page.getByLabel("Career seniority", { exact: true }).selectOption("vp");
  await submit(page);
  await expect(page.getByRole("status")).toHaveText("7 alumni found");
  for (const name of ["Mira", "Vikram", "Veda", "Sana", "Evan", "YoungVP", "Network"]) await expect(card(page, name)).toBeVisible();
  for (const name of ["Private", "Unconnected", "Blocked", "BlocksViewer", "Pending", "History"]) await expect(card(page, name)).toHaveCount(0);
  await page.screenshot({ path: "test-results/directory-desktop.png", fullPage: true });
});
test("graduation batch is independent of career group and filters combine", async ({ page }) => {
  await page.getByLabel("Company", { exact: true }).fill("Microsoft");
  await page.getByLabel("Career seniority", { exact: true }).selectOption("vp");
  await page.getByLabel("Graduation batch", { exact: true }).fill("2025");
  await submit(page); await expect(card(page, "YoungVP")).toBeVisible();
  await expect(page.getByRole("status")).toHaveText("1 alumni found");
  await page.getByLabel("Career seniority", { exact: true }).selectOption("");
  await page.getByLabel("Graduation batch", { exact: true }).fill("1990");
  await submit(page); await expect(card(page, "OldBatch")).toBeVisible();
  await page.getByLabel("Career seniority", { exact: true }).selectOption("senior");
  await submit(page); await expect(page.getByText("No alumni found for the selected filters.")).toBeVisible();
});
test("senior, manager, director and executive groups use the recorded current title", async ({ page }) => {
  for (const [value, names] of [["senior", ["Sara", "Priya"]], ["manager", ["Max"]], ["director", ["Dee", "Hema"]], ["executive", ["Ada", "Ari"]]]) {
    await page.getByLabel("Career seniority", { exact: true }).selectOption(value);
    await submit(page); await expect(page.getByRole("status")).toHaveText(`${names.length} alumni found`);
    for (const name of names) await expect(card(page, name)).toBeVisible();
  }
  await page.getByLabel("Designation", { exact: true }).fill("CEO");
  await submit(page); await expect(card(page, "Ada")).toBeVisible(); await expect(card(page, "Ari")).toHaveCount(0);
});
test("pagination, URL persistence, back navigation and clearing filters", async ({ page }) => {
  await page.getByLabel("Company", { exact: true }).fill("Filler Co");
  await submit(page); await expect(page.getByRole("status")).toHaveText("120 alumni found");
  const first = await page.getByRole("article").first().getByRole("heading").textContent();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Page 2 of 10")).toBeVisible();
  await expect(page).toHaveURL(/page=2/);
  expect(await page.getByRole("article").first().getByRole("heading").textContent()).not.toBe(first);
  await page.reload(); await expect(page.getByText("Page 2 of 10")).toBeVisible();
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Filler Co");
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue("");
  await expect(page).not.toHaveURL(/company=/);
  await page.goBack(); await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Filler Co");
});
test("mobile layout and literal punctuation search", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel("Company", { exact: true }).fill("C++ Labs (R&D)");
  await page.getByLabel("Designation", { exact: true }).fill("C++");
  await submit(page); await expect(card(page, "RegexLiteral")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: "test-results/directory-mobile.png", fullPage: true });
});
test("real backend validation error is visible, with no invented fallback people, and Retry recovers", async ({ page }) => {
  await page.route("**/alumni?**", async (route) => {
    const url = new URL(route.request().url()); url.searchParams.set("seniority", "invalid-group");
    await route.continue({ url: url.toString() });
  });
  await page.getByLabel("Company", { exact: true }).fill("Microsoft");
  await page.getByLabel("Designation", { exact: true }).fill("VP");
  await page.getByRole("button", { name: "Search alumni", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Invalid directory filters");
  await expect(page.getByRole("article")).toHaveCount(0);
  await expect(page.getByLabel("Company", { exact: true })).toHaveValue("Microsoft");
  await page.unroute("**/alumni?**");
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(card(page, "Mira")).toBeVisible();
});
