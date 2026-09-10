import { expect, test } from "@playwright/test";

const user = { id: "viewer", role: "alumni", email: "viewer@example.com", firstName: "Viewer" };

test.beforeEach(async ({ page }) => {
  await page.route("**/auth/me", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ status: "success", data: { user } }),
  }));
});

test("grounded assistant shows parsed evidence and matches", async ({ page }) => {
  await page.route("**/assistant/query", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "success",
      data: {
        answer: "I found 1 potential mentors grounded in alumni profile data.",
        intent: { mode: "mentor", keywords: ["python"], years: [] },
        evidence: { ranking: "Exact field matches with transparent weights" },
        results: [{
          _id: "profile-1", firstName: "Meera", lastName: "Iyer",
          designation: "Data Lead", company: "Insight Labs", branch: "ISE",
          endYear: 2018, location: "Bengaluru", matches: ["skills: python"],
        }],
      },
    }),
  }));
  await page.goto("/assistant");
  await page.getByLabel("Ask the alumni assistant").fill("Find a Python mentor");
  await page.getByRole("button", { name: "Ask", exact: true }).click();
  await expect(page.getByText("Meera Iyer")).toBeVisible();
  await expect(page.getByText("skills: python")).toBeVisible();
});

test("network graph renders people and relationship counts", async ({ page }) => {
  await page.route("**/network/graph", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "success",
      data: {
        summary: { people: 2, connections: 1, discoveryLinks: 0 },
        nodes: [
          { id: "viewer", profileId: "p1", name: "Viewer Alumni", isCurrentUser: true },
          { id: "mentor", profileId: "p2", name: "Meera Iyer", company: "Insight Labs" },
        ],
        edges: [{ source: "viewer", target: "mentor", type: "connection" }],
      },
    }),
  }));
  await page.goto("/network-graph");
  await expect(page.getByRole("img", { name: "Interactive alumni relationship graph" })).toBeVisible();
  await expect(page.getByText("2", { exact: true })).toBeVisible();
});

test("evaluation lab displays reproducible model metrics", async ({ page }) => {
  await page.route("**/ml/evaluation", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      status: "success",
      data: {
        evaluatedAt: "2026-07-26", k: 1, winner: "hybrid-adaptive",
        methodology: ["All models rank the same candidate sets."],
        models: [{ algorithm: "hybrid-adaptive", precision: 1, recall: 1, mrr: 1, ndcg: 1, fixtures: 4 }],
      },
    }),
  }));
  await page.goto("/model-evaluation");
  await expect(page.getByText("Recommendation evidence, not guesswork.")).toBeVisible();
  await expect(page.getByText("100%", { exact: true }).first()).toBeVisible();
});

test("privacy centre saves enforceable contact preferences", async ({ page }) => {
  let saved = null;
  await page.route("**/profile/privacy", async (route) => {
    if (route.request().method() === "PATCH") {
      saved = route.request().postDataJSON();
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ status: "success", data: { privacy: saved } }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          privacy: {
            profileVisibility: "members", showEmail: false, showPhone: false,
            allowMessages: "connections", allowConnections: true, mentorshipAvailable: true,
          },
          blockedUsers: [],
        },
      }),
    });
  });
  await page.goto("/privacy");
  await page.getByText("Show email").click();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect.poll(() => saved?.showEmail).toBe(true);
  await expect(page.getByText("Privacy preferences saved.")).toBeVisible();
});

test("presentation mode exposes the guided final-year demo", async ({ page }) => {
  await page.goto("/demo");
  await expect(page.getByText("CMReunite turns alumni records into an active career network.")).toBeVisible();
  await expect(page.getByText("System architecture")).toBeVisible();
  await expect(page.getByRole("link", { name: "Start live demo" })).toHaveAttribute("href", "/assistant");
});
