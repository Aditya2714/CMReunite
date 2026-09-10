import { expect, test } from "@playwright/test";

test("authenticated alumni can start a direct conversation", async ({ page }) => {
  const user = {
    id: "507f1f77bcf86cd799439011",
    role: "alumni",
    email: "viewer@example.com",
    firstName: "Viewer",
    lastName: "Alumni",
  };
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ status: "success", data: { user } }),
    })
  );
  await page.route("**/messages", async (route) => {
    if (route.request().isNavigationRequest()) {
      await route.continue();
      return;
    }
    if (route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          data: {
            conversationId: "conversation-1",
            message: {
              _id: "message-1",
              sender: user.id,
              recipient: payload.recipientId,
              body: payload.body,
            },
          },
        }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: { conversations: [], unreadCount: 0, pagination: { page: 1, total: 0 } },
      }),
    });
  });
  await page.route("**/messages/conversation-1", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          messages: [{
            _id: "message-1",
            sender: user.id,
            recipient: "507f191e810c19729de860ea",
            body: "Hello from the alumni network",
          }],
        },
      }),
    })
  );
  await page.route("**/alumniList?limit=100", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        data: {
          alumni: [{
            _id: "profile-2",
            user: "507f191e810c19729de860ea",
            firstName: "Meera",
            lastName: "Iyer",
          }],
        },
      }),
    })
  );

  await page.goto("/messages");
  await page.getByLabel("Start a conversation").selectOption("507f191e810c19729de860ea");
  await page.getByLabel("Message").fill("Hello from the alumni network");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Hello from the alumni network")).toBeVisible();
});
