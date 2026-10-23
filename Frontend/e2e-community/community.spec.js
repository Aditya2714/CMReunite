import { test, expect } from "../e2e/helpers/secure-api.js";
const card = (page, title) => page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
async function login(page, email = "poster@example.com") {
  expect((await page.request.post("/auth/login", { data: { email, password: "StrongPass123!", role: "alumni" } })).status()).toBe(200);
}
async function state(page) { return (await page.request.get("http://127.0.0.1:4000/__test/state")).json(); }
async function settings(page, enabled) { await page.request.post("http://127.0.0.1:4000/__test/config", { data: { enabled } }); }
async function storyForm(page, title, content = "My story for the alumni community") {
  await page.getByRole("button", { name: "Create Post", exact: true }).click();
  await page.getByLabel("Post type", { exact: true }).selectOption("story");
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Story content", { exact: true }).fill(content);
}
test("one navigation entry, migrated posts and legacy routes", async ({ page }) => {
  await login(page); await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: "Community Posts", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Jobs", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Stories", exact: true })).toHaveCount(0);
  await page.goto("/community-posts");
  await expect(card(page, "Migrated job")).toBeVisible(); await expect(card(page, "Migrated story")).toBeVisible();
  await page.goto("/jobs#job-507f1f77bcf86cd799439011");
  await expect(page).toHaveURL(/community-posts\?type=job#post-507f1f77bcf86cd799439011/);
  await expect(card(page, "Migrated job")).toBeVisible(); await expect(card(page, "Migrated story")).toHaveCount(0);
  await page.goto("/alumni-stories"); await expect(page).toHaveURL(/community-posts\?type=story/);
  await expect(card(page, "Migrated story")).toBeVisible(); await expect(card(page, "Migrated job")).toHaveCount(0);
});
test("create, filter, edit and delete a story with no placement email", async ({ page }) => {
  await settings(page, true); await login(page); await page.goto("/community-posts");
  const before = (await state(page)).emails.length;
  await storyForm(page, "New community story");
  await expect(page.getByLabel("Company", { exact: true })).toHaveCount(0);
  await page.getByLabel("Category", { exact: true }).selectOption("Achievement");
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Story published successfully.");
  await expect(card(page, "New community story").getByText("Achievement", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Jobs", exact: true }).click(); await expect(card(page, "New community story")).toHaveCount(0);
  await page.getByRole("button", { name: "Stories", exact: true }).click();
  await card(page, "New community story").getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Post type", { exact: true })).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("Edited community story");
  await page.getByRole("button", { name: "Update Post", exact: true }).click();
  await expect(card(page, "Edited community story")).toBeVisible();
  await card(page, "Edited community story").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(card(page, "Edited community story")).toHaveCount(0);
  expect((await state(page)).emails).toHaveLength(before);
});
test("single composer switches fields and publishing job sends exactly one local email", async ({ page }) => {
  await settings(page, true); await login(page); await page.goto("/community-posts");
  const before = (await state(page)).emails.length;
  await storyForm(page, "Unified job opportunity", "A developer opportunity");
  await page.getByLabel("Post type", { exact: true }).selectOption("job");
  await expect(page.getByLabel("Category", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Unified job opportunity");
  await page.getByLabel("Company", { exact: true }).fill("Unified Co");
  await page.getByLabel("Location", { exact: true }).fill("Bengaluru");
  await page.getByLabel("Vacancies").fill("2");
  await page.screenshot({ path: "test-results/community-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("notification is queued");
  await expect(card(page, "Unified job opportunity").getByText("Job", { exact: true })).toBeVisible();
  await expect.poll(async () => (await state(page)).emails.length).toBe(before + 1);
  const post = (await state(page)).posts.find((item) => item.title === "Unified job opportunity");
  await page.goto(`/community-posts?type=job#post-${post._id}`);
  await expect(card(page, "Unified job opportunity")).toBeVisible();
  await card(page, "Unified job opportunity").getByRole("button", { name: "Edit", exact: true }).click();
  await expect(page.getByLabel("Post type", { exact: true })).toBeDisabled();
  await page.getByLabel("Title", { exact: true }).fill("Edited unified job");
  await page.getByRole("button", { name: "Update Post", exact: true }).click();
  await expect(card(page, "Edited unified job")).toBeVisible();
  await page.request.post("http://127.0.0.1:4000/__test/run-worker"); expect((await state(page)).emails).toHaveLength(before + 1);
});
test("another reader sees no management controls and backend forbids edits", async ({ page }) => {
  await login(page, "reader@example.com"); await page.goto("/community-posts");
  const legacy = card(page, "Migrated story"); await expect(legacy).toBeVisible();
  await expect(legacy.getByRole("button", { name: "Edit", exact: true })).toHaveCount(0);
  const result = await page.request.patch("/posts/507f1f77bcf86cd799439012", { data: { title: "Hijack" } }); expect(result.status()).toBe(403);
});
test("mobile story publishing is safe for HTML, cancel discards draft, and backend error preserves draft", async ({ page }) => {
  await login(page); await page.setViewportSize({ width: 390, height: 844 }); await page.goto("/community-posts");
  await storyForm(page, "Cancelled draft"); await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await storyForm(page, "Safe story", '<script>window.__storyScriptRan=true</script>');
  await page.screenshot({ path: "test-results/community-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(card(page, "Safe story")).toContainText('<script>window.__storyScriptRan=true</script>');
  expect(await page.evaluate(() => window.__storyScriptRan)).toBeUndefined();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await storyForm(page, "Retained draft");
  await page.route("**/posts", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    await route.continue({ postData: JSON.stringify({ ...route.request().postDataJSON(), content: " " }) });
  });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("content");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Retained draft");
});
test("pagination and direct links reveal historical posts outside the first page", async ({ page }) => {
  await settings(page, false); await login(page);
  for (let i = 0; i < 22; i++) {
    const response = await page.request.post("/posts", { data: { postType: "story", title: `Pagination story ${i}`, content: "Pagination fixture", category: "Career Journey" } });
    expect(response.status()).toBe(201);
  }
  await page.goto("/community-posts?type=story");
  await expect(page.getByRole("navigation", { name: "Post pages" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/Page 2 of/)).toBeVisible();
  await page.goto("/community-posts?type=story#post-507f1f77bcf86cd799439012");
  await expect(card(page, "Migrated story")).toBeVisible();
});
