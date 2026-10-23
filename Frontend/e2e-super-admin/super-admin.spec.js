import {test,expect} from "../e2e/helpers/secure-api.js";
const password="StrongPass123!";
const login=async(page,email="super@example.com",role="super_admin",pass=password)=>{expect((await page.request.post("/auth/login",{data:{email,password:pass,role}})).status()).toBe(200);};
const state=async(page)=>(await page.request.get("http://127.0.0.1:4000/__test/state")).json();
test("Super Admin login entry, session restoration and exact dashboard analytics",async({page})=>{
 await page.goto("/login");await page.getByLabel("Email").fill("super@example.com");await page.getByLabel("Password").fill(password);
 await page.getByRole("combobox").click();await page.getByRole("option",{name:"Super Admin",exact:true}).click();await page.getByRole("button",{name:"Sign In"}).click();
 await expect(page).toHaveURL(/\/super-admin$/);await expect(page.getByRole("heading",{name:"Super Admin",exact:true})).toBeVisible();
 const cse=page.getByRole("row").filter({has:page.getByRole("cell",{name:"CSE",exact:true})});await expect(cse.getByRole("cell")).toHaveText(["CSE","CSE Admin","2","1","1","0","2"]);
 await page.reload();await expect(cse).toBeVisible();await page.screenshot({path:"test-results/super-admin-desktop.png",fullPage:true});
});
test("create department and admin, show password once, force change, then unlock department tools",async({page,browser})=>{
 await login(page);await page.goto("/super-admin?tab=departments");await page.getByLabel("Department code",{exact:true}).fill("ME");await page.getByLabel("Department name",{exact:true}).fill("Mechanical");await page.getByRole("button",{name:"Create department",exact:true}).click();await expect(page.getByRole("status")).toHaveText("Department created");
 await page.getByRole("button",{name:"Department Admins",exact:true}).click();await page.getByLabel("Admin name",{exact:true}).fill("Mechanical Admin");await page.getByLabel("Admin email",{exact:true}).fill("mechanical@example.com");await page.getByLabel("Admin department",{exact:true}).selectOption({label:"ME — Mechanical"});await page.getByRole("button",{name:"Create admin",exact:true}).click();
 const secret=page.getByLabel("Temporary password",{exact:true});await expect(secret).toBeVisible();const temp=await secret.textContent();await page.getByRole("button",{name:"Dismiss password"}).click();await expect(secret).toHaveCount(0);await page.reload();await expect(secret).toHaveCount(0);
 const context=await browser.newContext(),adminPage=await context.newPage();await login(adminPage,"mechanical@example.com","admin",temp);await adminPage.goto("/dashboard");await expect(adminPage).toHaveURL(/account-security/);
 expect((await adminPage.request.get("/admin/overview")).status()).toBe(403);
 await adminPage.getByLabel("Current password",{exact:true}).fill(temp);await adminPage.getByLabel("New password",{exact:true}).fill(password);await adminPage.getByLabel("Confirm password",{exact:true}).fill(password);await adminPage.getByRole("button",{name:"Update password"}).click();await expect(adminPage).toHaveURL(/login/);
 await login(adminPage,"mechanical@example.com","admin");await adminPage.goto("/dashboard");await expect(adminPage.getByRole("heading",{name:"Welcome back, Mechanical Admin.",exact:true})).toBeVisible();expect((await adminPage.request.get("/admin/overview")).status()).toBe(200);await context.close();
});
test("department admin approvals and direct API IDs stay within their department",async({page})=>{
 await login(page,"cadmin@example.com","admin");await page.goto("/approvals");await expect(page.getByRole("heading",{name:"CSE Pending Test",exact:true})).toBeVisible();await expect(page.getByText("ECE Pending Test",{exact:true})).toHaveCount(0);
 const ece=(await state(page)).users.find(u=>u.email==="epending@example.com");expect((await page.request.patch(`/admin/users/${ece._id}/approval`,{data:{isApproved:true}})).status()).toBe(404);
 await page.goto("/super-admin");await expect(page).toHaveURL(/dashboard/);
});
test("department admin profile shows a read-only department and hides alumni-only fields",async({page})=>{
 await login(page,"cadmin@example.com","admin");await page.goto("/profile");
 await expect(page.getByRole("heading",{name:"Edit your administrator profile",exact:true})).toBeVisible();
 await expect(page.getByLabel("Department",{exact:true})).toHaveValue("Computer Science");await expect(page.getByLabel("Department",{exact:true})).toHaveAttribute("readonly","");
 await expect(page.getByText("Department assigned by Super Admin.",{exact:true})).toBeVisible();
 await expect(page.getByLabel("Role",{exact:true})).toHaveValue("Department Admin");
 await expect(page.getByText("Academic and career details",{exact:true})).toHaveCount(0);
 const designation=page.locator('select[name="officialDesignation"]');await designation.selectOption("Other");await expect(page.getByLabel("Custom designation",{exact:true})).toBeVisible();
});
test("platform announcement reaches CSE, ECE and unassigned alumni with local SMTP capture",async({page,browser})=>{
 await login(page);await page.goto("/super-admin?tab=announcements");await page.getByPlaceholder("Announcement title").fill("Campus-wide browser update");await page.getByPlaceholder("Write the update for the selected audience.").fill("Every department is included.");await page.getByRole("button",{name:/Publish & Notify/}).click();
 await expect(page.getByRole("heading",{name:"Campus-wide browser update",exact:true})).toBeVisible();await expect.poll(async()=> (await state(page)).emails.length).toBe(3);
 const context=await browser.newContext(),alumni=await context.newPage();await login(alumni,"ece@example.com","alumni");await alumni.goto("/announcements");await expect(alumni.getByRole("heading",{name:"Campus-wide browser update",exact:true})).toBeVisible();await expect(alumni.getByRole("button",{name:"Delete",exact:true})).toHaveCount(0);await context.close();
});
test("event lists and registration enforce department or all-department eligibility",async({page})=>{
 await login(page,"ece@example.com","alumni");await page.goto("/events");await expect(page.getByRole("heading",{name:"ECE private event",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"CSE open event",exact:true})).toBeVisible();await expect(page.getByRole("heading",{name:"CSE private event",exact:true})).toHaveCount(0);await expect(page.getByRole("heading",{name:"Unassigned event",exact:true})).toHaveCount(0);
 const card=page.locator("article").filter({has:page.getByRole("heading",{name:"CSE open event",exact:true})});await card.getByRole("button",{name:/Register/}).click();await expect(card.getByRole("button",{name:"Registered",exact:true})).toBeVisible();
});
test("unassigned resolution and audit history work on mobile without page overflow",async({page})=>{
 await page.setViewportSize({width:390,height:844});await login(page);await page.goto("/super-admin?tab=unassigned");
 const card=page.locator("article").filter({has:page.getByRole("heading",{name:"Unassigned Alumni Test",exact:true})});await expect(card).toBeVisible();await card.getByRole("combobox").selectOption({label:"ECE — Electronics"});await card.getByRole("button",{name:"Assign department",exact:true}).click();await expect(card).toHaveCount(0);
 await page.getByRole("button",{name:"Audit Log",exact:true}).click();await expect(page.getByText("alumni.assigned",{exact:true})).toBeVisible();await page.getByRole("button",{name:"Dashboard",exact:true}).click();await expect(page.getByRole("heading",{name:"Super Admin",exact:true})).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:"test-results/super-admin-mobile.png",fullPage:true});
});
test("Super Admin can deactivate and reactivate a vacant department admin",async({page})=>{
 await login(page);await page.goto("/super-admin?tab=admins");const card=page.locator("article").filter({has:page.getByRole("heading",{name:"Mechanical Admin",exact:true})});
 await card.getByRole("button",{name:"Deactivate Admin",exact:true}).click();await expect(card.getByText("Inactive",{exact:true})).toBeVisible();await expect(card.getByRole("button",{name:"Activate Admin",exact:true})).toBeEnabled();
 await card.getByRole("button",{name:"Activate Admin",exact:true}).click();await expect(card.getByText("Active",{exact:true})).toBeVisible();await expect(card.getByRole("button",{name:"Activate Admin",exact:true})).toBeDisabled();
});
test("admin deactivation and replacement preserve records and reject the old session immediately",async({page,browser})=>{
 const context=await browser.newContext(),old=await context.newPage();await login(old,"eadmin@example.com","admin");await login(page);await page.goto("/super-admin?tab=admins");
 const card=page.locator("article").filter({has:page.getByRole("heading",{name:"ECE Admin",exact:true})});await expect(card.getByText("Active",{exact:true})).toBeVisible();await card.getByRole("button",{name:"Replace Admin",exact:true}).click();
 await card.getByLabel("Replacement name for eadmin@example.com").fill("ECE Replacement");await card.getByLabel("Replacement email for eadmin@example.com").fill("replacement@example.com");await card.getByRole("button",{name:"Confirm Replacement",exact:true}).click();
 await expect(page.getByLabel("Temporary password",{exact:true})).toBeVisible();await expect(card.getByText("Inactive",{exact:true})).toBeVisible();expect((await old.request.get("/admin/overview")).status()).toBe(401);
 const saved=await state(page),replacement=saved.users.find(user=>user.email==="replacement@example.com");expect(replacement.isActive).toBe(true);expect(replacement.department).toBe(saved.departments.find(department=>department.code==="ECE")._id);expect(saved.profiles.some(profile=>profile.email==="ece@example.com")).toBe(true);await context.close();
});
test("Super Admin creates and edits an event with fixed ownership and selectable attendance",async({page})=>{
 await login(page);await page.goto("/events");await page.getByLabel("Event scope",{exact:true}).selectOption("department");await page.getByLabel("Owning department",{exact:true}).selectOption({label:"CSE"});await page.getByLabel("Attendance eligibility",{exact:true}).selectOption("all");
 await page.getByPlaceholder("Event title").fill("Browser-created event");await page.getByLabel("Event date",{exact:true}).fill("2099-02-01");await page.getByPlaceholder("CMRIT Auditorium / Online").fill("Campus");await page.getByPlaceholder("Describe the event, audience, and purpose.").fill("Created through the live browser.");await page.getByRole("button",{name:"Publish Event",exact:true}).click();
 const card=page.locator("article").filter({has:page.getByRole("heading",{name:"Browser-created event",exact:true})});await expect(card).toBeVisible();await card.getByRole("button",{name:"Edit",exact:true}).click();await expect(page.getByLabel("Owning department",{exact:true})).toBeDisabled();await expect(page.getByLabel("Attendance eligibility",{exact:true})).toHaveValue("all");await page.getByLabel("Attendance eligibility",{exact:true}).selectOption("department");const updated=page.waitForResponse(response=>response.url().includes("/event/")&&response.request().method()==="PATCH");await page.getByRole("button",{name:"Update Event",exact:true}).click();expect((await updated).status()).toBe(200);await expect(card).toBeVisible();
 const records=(await page.request.get("/event/all"));const saved=(await records.json()).data.events.find(x=>x.title==="Browser-created event");expect(saved.eligibility).toBe("department");expect(saved.scope).toBe("department");
});
