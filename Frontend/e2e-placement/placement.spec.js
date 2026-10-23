import { test, expect } from "../e2e/helpers/secure-api.js";
async function settings(page, data) { expect((await page.request.post("http://127.0.0.1:4000/__test/config", { data })).status()).toBe(200); }
async function state(page) { return (await page.request.get("http://127.0.0.1:4000/__test/state")).json(); }
async function openJobs(page) {
  const login = await page.request.post("/auth/login", { data: { email: "poster@example.com", password: "StrongPass123!", role: "alumni" } });
  expect(login.status()).toBe(200);
  await page.goto("/jobs");
  await page.getByRole("button", { name: "Create Post", exact: true }).click();
}
async function fillJob(page, title) {
  await page.getByLabel("Title", { exact: true }).fill(title);
  await page.getByLabel("Company", { exact: true }).fill("Example Inc");
  await page.getByLabel("Location", { exact: true }).fill("Bengaluru");
  await page.getByLabel("Vacancies").fill("3");
  await page.getByLabel("Job description").fill("JavaScript opportunity. Please contact the alumni poster.");
}
const cardFor = (page, title) => page.getByRole("article").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
const jobState = async (page, title) => (await state(page)).jobs.find((job) => job.title === title);

test("without credentials, job publishes and remains unmailed after later activation", async ({ page }) => {
  await settings(page, { enabled: false });
  await openJobs(page);
  await expect(page.getByText("Placement-office email notifications are currently disabled. You can still publish jobs.")).toBeVisible();
  await fillJob(page, "Disabled mode opportunity");
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Job posted successfully");
  await expect(cardFor(page, "Disabled mode opportunity")).toBeVisible();
  expect((await jobState(page, "Disabled mode opportunity")).placementNotification.status).toBe("disabled");
  await settings(page, { enabled: true });
  await page.request.post("http://127.0.0.1:4000/__test/run-worker");
  expect((await state(page)).emails).toHaveLength(0);
});

test("enabled posting travels through real API, MongoDB, worker and SMTP; edits/deletes send no new mail", async ({ page }) => {
  await settings(page, { enabled: true });
  await openJobs(page);
  await expect(page.getByText("New job postings are automatically shared with the placement office by email.")).toBeVisible();
  await fillJob(page, "Enabled placement opportunity");
  await page.screenshot({ path: "test-results/placement-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("notification is queued");
  await expect.poll(async () => (await jobState(page, "Enabled placement opportunity"))?.placementNotification.status).toBe("sent");
  const snapshot = await state(page);
  expect(snapshot.emails).toHaveLength(1);
  const email = snapshot.emails[0].replace(/=\r\n/g, "");
  for (const value of ["To: placement@example.com", "Enabled placement opportunity", "Example Inc", "Bengaluru", "Test Alumni Poster", "poster@example.com", "Vacancies: 3"]) expect(email).toContain(value);
  const card = cardFor(page, "Enabled placement opportunity");
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Title", { exact: true }).fill("Updated placement opportunity");
  await page.getByRole("button", { name: "Update Post", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Post updated successfully.");
  await cardFor(page, "Updated placement opportunity").getByRole("button", { name: "Delete", exact: true }).click();
  await expect(cardFor(page, "Updated placement opportunity")).toHaveCount(0);
  await page.request.post("http://127.0.0.1:4000/__test/run-worker");
  expect((await state(page)).emails).toHaveLength(1);
});

test("opt-in with missing credentials shows configuration notice while posting still works", async ({ page }) => {
  await settings(page, { enabled: true, missingCredentials: true });
  await openJobs(page);
  await expect(page.getByText("Placement-office email notifications are not yet configured. You can still publish jobs.")).toBeVisible();
  await fillJob(page, "Missing credentials opportunity");
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(cardFor(page, "Missing credentials opportunity")).toBeVisible();
  expect((await jobState(page, "Missing credentials opportunity")).placementNotification.status).toBe("disabled");
  expect((await state(page)).emails).toHaveLength(1);
});

test("SMTP rejection does not lose the posted job and a persisted retry succeeds", async ({ page }) => {
  await settings(page, { enabled: true, failuresRemaining: 1 });
  await openJobs(page);
  await fillJob(page, "Retry placement opportunity");
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(cardFor(page, "Retry placement opportunity")).toBeVisible();
  await expect.poll(async () => (await jobState(page, "Retry placement opportunity"))?.placementNotification.status).toBe("retry");
  expect((await state(page)).emails).toHaveLength(1);
  await page.request.post("http://127.0.0.1:4000/__test/run-worker");
  await expect.poll(async () => (await jobState(page, "Retry placement opportunity"))?.placementNotification.status).toBe("sent");
  expect((await jobState(page, "Retry placement opportunity")).placementNotification.attempts).toBe(2);
  expect((await state(page)).emails).toHaveLength(2);
});

test("mobile form, native validation and duplicate-submission prevention", async ({ page }) => {
  await settings(page, { enabled: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await openJobs(page);
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  expect(await page.getByLabel("Title", { exact: true }).evaluate((element) => element.validity.valueMissing)).toBe(true);
  await fillJob(page, "Mobile placement opportunity");
  await page.getByLabel("Job type").selectOption("Internship");
  await page.screenshot({ path: "test-results/placement-mobile.png", fullPage: true });
  let release, started = false, count = 0;
  const gate = new Promise((resolve) => { release = resolve; });
  await page.route("**/posts", async (route) => { count++; started = true; await gate; await route.continue(); });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect.poll(() => started).toBe(true);
  await expect(page.getByRole("button", { name: "Saving..." })).toBeDisabled();
  release();
  await expect(cardFor(page, "Mobile placement opportunity")).toBeVisible();
  await expect.poll(async () => (await jobState(page, "Mobile placement opportunity"))?.placementNotification.status).toBe("sent");
  expect(count).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("backend validation error is visible and retains the job draft", async ({ page }) => {
  await settings(page, { enabled: true });
  await openJobs(page);
  await fillJob(page, "Invalid payload opportunity");
  await page.route("**/posts", async (route) => {
    const payload = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...payload, vacancy: 0 }) });
  });
  await page.getByRole("button", { name: "Publish Post", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("vacancy");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Invalid payload opportunity");
  expect(await jobState(page, "Invalid payload opportunity")).toBeUndefined();
});
