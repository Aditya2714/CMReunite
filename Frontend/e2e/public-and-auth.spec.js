import { expect, test } from "@playwright/test";

test("public navigation exposes alumni-only registration", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  );
  await page.goto("/register");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();

  // Advance is intentionally blocked without a verified email, but privileged
  // self-registration choices must never be rendered.
  await expect(page.getByText("Admin", { exact: true })).toHaveCount(0);
  await expect(page.getByText("College", { exact: true })).toHaveCount(0);
});

test("protected routes redirect when the server rejects the session", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  );
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
});

test("alumni can log in and reach the dashboard", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  );
  await page.route("**/auth/login", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        user: {
          id: "user-1",
          role: "alumni",
          email: "alumni@example.com",
          firstName: "Demo",
          lastName: "Alumni",
        },
        alumni: {
          id: "user-1",
          role: "alumni",
          email: "alumni@example.com",
          firstName: "Demo",
          lastName: "Alumni",
        },
      }),
    })
  );
  await page.route("**/admin/overview", (route) =>
    route.fulfill({
      status: 403,
      contentType: "application/json",
      body: JSON.stringify({ message: "Admin access required" }),
    })
  );
  await page.goto("/login");
  await page.getByLabel("Email").fill("alumni@example.com");
  await page.getByLabel("Password").fill("StrongPass123!");
  const roleSelect = page.getByRole("combobox");
  await roleSelect.click();
  await roleSelect.press("ArrowDown");
  await roleSelect.press("Enter");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByText(/welcome/i).first()).toBeVisible();
});

test("password recovery does not reveal whether an account exists", async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({ status: 401, contentType: "application/json", body: "{}" })
  );
  await page.route("**/auth/forgot-password", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        message: "If an approved account exists, password-reset instructions have been sent.",
      }),
    })
  );
  await page.goto("/forgot-password");
  await page.getByLabel("Email").fill("unknown@example.com");
  await page.getByRole("button", { name: "Send reset link" }).click();
  await expect(page.getByText(/if an approved account exists/i)).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/csrf", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "success", data: { csrfToken: "mocked-ui-fixture" } }) }));
});
