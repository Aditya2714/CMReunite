import { expect, test } from "@playwright/test";

const user = {
  id: "viewer-user",
  role: "alumni",
  email: "viewer@example.com",
  firstName: "Viewer",
  lastName: "Alumni",
};

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: { user } }),
    })
  );
});

test("recommendations show compatibility explanations and accept feedback", async ({ page }) => {
  await page.route("**/ml/recommendations", async (route) => {
    const payload = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          mode: payload.mode,
          modelVersion: "hybrid-adaptive-v2",
          profileCompleteness: 83,
          coldStart: false,
          recommendations: [{
            id: "profile-2",
            userId: "user-2",
            firstName: "Meera",
            lastName: "Iyer",
            designation: "Data Science Lead",
            company: "Insight Labs",
            location: "Bengaluru",
            compatibility: 87,
            score: 0.87,
            modelVersion: "hybrid-adaptive-v2",
            reasons: [
              { type: "skills", label: "2 matching skills", matches: ["python", "machine-learning"] },
              { type: "domain", label: "Works in a matching career domain" },
            ],
          }],
        },
      }),
    });
  });
  let feedbackReceived = false;
  await page.route("**/ml/feedback", async (route) => {
    feedbackReceived = route.request().postDataJSON().action === "relevant";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: { feedback: {} } }),
    });
  });

  await page.goto("/recommendations");
  await expect(page.getByText("87%")).toBeVisible();
  await expect(page.getByText(/2 matching skills/)).toBeVisible();
  await page.getByRole("button", { name: "Relevant", exact: true }).click();
  await expect.poll(() => feedbackReceived).toBe(true);
  await expect(page.getByText(/feedback was saved/i)).toBeVisible();
});

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/csrf", route => route.fulfill({ contentType: "application/json", body: JSON.stringify({ status: "success", data: { csrfToken: "mocked-ui-fixture" } }) }));
});
