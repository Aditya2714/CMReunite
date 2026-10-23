import { test, expect } from "../e2e/helpers/secure-api.js";
const password = "StrongPass123!";
async function adminPage(page) {
  const response = await page.request.post("/auth/login", { data: { email: "admin@example.com", password, role: "admin" } });
  expect(response.status()).toBe(200);
  await page.goto("/approvals");
}
const cardFor = (page, name) => page.getByRole("article").filter({ has: page.getByRole("heading", { name: `${name} Alumni`, exact: true }) });
async function state(page) { return (await page.request.get("http://127.0.0.1:4000/__test/state")).json(); }

test("all five choices, required reason, persistence and alumni login explanation", async ({ page }) => {
  await adminPage(page);
  const card = cardFor(page, "Dropdown");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(card.getByLabel("Rejection reason").locator("option")).toHaveCount(6); // five choices + placeholder
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(card.getByRole("alert")).toHaveText("Select a rejection reason.");
  await card.getByLabel("Rejection reason").selectOption("academic_mismatch");
  await card.getByLabel(/Additional comments/).fill("Please correct your graduation year and branch.");
  await page.screenshot({ path: "test-results/rejection-desktop.png", fullPage: true });
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(card).toHaveCount(0);
  const saved = (await state(page)).users.find((user) => user.email === "dropdown@example.com");
  expect(saved.rejectionReason).toBe("academic_mismatch");
  expect(saved.rejectionComments).toBe("Please correct your graduation year and branch.");
  expect(saved.approvalReviewedAt).toBeTruthy();
  await expect.poll(async () => (await state(page)).emails.some((email) => email.includes("dropdown@example.com"))).toBe(true);
  await page.request.post("/auth/logout");
  await page.goto("/login");
  await page.getByLabel("Email").fill("dropdown@example.com");
  await page.getByLabel("Password").fill(password);
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name: "Alumni", exact: true }).click();
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByRole("alert")).toContainText("Academic details do not match college records");
  await expect(page.getByRole("alert")).toContainText("Please correct your graduation year and branch.");
  await expect(page).toHaveURL(/\/login$/);
});

test("Other requires nonblank comments, caps length and renders custom text safely", async ({ page }) => {
  await adminPage(page);
  const card = cardFor(page, "Custom");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await card.getByLabel("Rejection reason").selectOption("other");
  await card.getByLabel(/Additional comments/).fill("   ");
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(card.getByRole("alert")).toContainText("Add comments");
  await expect(card.getByLabel(/Additional comments/)).toHaveAttribute("maxlength", "2000");
  await card.getByLabel(/Additional comments/).fill('<script>alert("x")</script> Please provide evidence.');
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(card).toHaveCount(0);
  const saved = (await state(page)).users.find((user) => user.email === "custom@example.com");
  expect(saved.rejectionComments).toBe('<script>alert("x")</script> Please provide evidence.');
});

test("cancel leaves account pending, clears draft, and cards have independent state", async ({ page }) => {
  await adminPage(page);
  const card = cardFor(page, "Cancel"), another = cardFor(page, "Approval");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await card.getByLabel("Rejection reason").selectOption("usn_mismatch");
  await card.getByLabel(/Additional comments/).fill("Draft comment");
  await expect(another.getByLabel("Rejection reason")).toHaveCount(0);
  await card.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(card.getByLabel("Rejection reason")).toHaveCount(0);
  expect((await state(page)).users.find((user) => user.email === "cancel@example.com").approvalStatus).toBe("pending");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await expect(card.getByLabel("Rejection reason")).toHaveValue("");
  await expect(card.getByLabel(/Additional comments/)).toHaveValue("");
});

test("approval regression: approving does not need a rejection reason", async ({ page }) => {
  await adminPage(page);
  const card = cardFor(page, "Approval");
  await card.getByLabel("Verification note for Approval Alumni").fill("Verified with college records");
  await card.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(card).toHaveCount(0);
  const saved = (await state(page)).users.find((user) => user.email === "approval@example.com");
  expect(saved.isApproved).toBe(true); expect(saved.rejectionReason).toBe("");
});

test("mobile rejection form fits viewport and predefined reason needs no comment", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await adminPage(page);
  const card = cardFor(page, "Mobile");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await card.getByLabel("Rejection reason").selectOption("duplicate_registration");
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "test-results/rejection-mobile.png", fullPage: true });
  const box = await card.getByLabel("Rejection reason").boundingBox();
  expect(box.x + box.width).toBeLessThanOrEqual(390);
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect(card).toHaveCount(0);
  expect((await state(page)).users.find((user) => user.email === "mobile@example.com").rejectionComments).toBe("");
});

test("backend validation errors preserve the form and prevent duplicate submission", async ({ page }) => {
  await adminPage(page);
  const card = cardFor(page, "Cancel");
  await card.getByRole("button", { name: "Reject", exact: true }).click();
  await card.getByLabel("Rejection reason").selectOption("usn_mismatch");
  await card.getByLabel(/Additional comments/).fill("Please check the USN");
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  let started = false, calls = 0;
  await page.route("**/admin/users/*/approval", async (route) => {
    calls++; started = true;
    await gate;
    // Send a deliberately invalid payload through to the real backend.
    const payload = route.request().postDataJSON();
    await route.continue({ postData: JSON.stringify({ ...payload, rejectionReason: "invalid" }) });
  });
  await card.getByRole("button", { name: "Confirm rejection" }).click();
  await expect.poll(() => started).toBe(true);
  await expect(card.getByRole("button", { name: "Saving..." })).toBeDisabled();
  await expect(card.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  release();
  await expect(card.getByRole("alert")).toHaveText("Select a valid rejection reason");
  await expect(card.getByLabel("Rejection reason")).toHaveValue("usn_mismatch");
  await expect(card.getByLabel(/Additional comments/)).toHaveValue("Please check the USN");
  expect(calls).toBe(1);
  expect((await state(page)).users.find((user) => user.email === "cancel@example.com").approvalStatus).toBe("pending");
});
