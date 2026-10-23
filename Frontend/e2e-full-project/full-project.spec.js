import {request as apiRequest} from "@playwright/test";
import {test,expect,secureApi} from "../e2e/helpers/secure-api.js";
import fs from "node:fs";
import {io} from "socket.io-client";
const createContext=async(options)=>secureApi(await apiRequest.newContext(options));
const baseURL="http://127.0.0.1:5173",password="StrongPass123!";let states={},fixture;
const actor=async(name)=>createContext({baseURL,storageState:states[name]});
const data=async(response,status=200)=>{expect(response.status(),await response.text()).toBe(status);return (await response.json()).data;};
const profile=(email)=>fixture.profiles.find(x=>x.email===email);
const user=(email)=>fixture.users.find(x=>x.email===email);
const pageActor=async(page,name="john")=>page.context().addCookies(states[name].cookies);
test.beforeAll(async()=>{
 const anon=await createContext({baseURL});fixture=await (await anon.get("http://127.0.0.1:4000/__test/state")).json();
 const cacheFile="full-project-auth-cache.json";let cached;try{cached=JSON.parse(fs.readFileSync(cacheFile,"utf8"));}catch{ /* No reusable fixture sessions yet. */ }
 if(cached?.fixtureId===fixture.users[0]._id) states=cached.states;else {
 for(const name of ["john","jane","omar","cadmin","super"]){const context=await createContext({baseURL});expect((await context.post("/auth/login",{data:{email:`${name}@example.com`,password,role:name==="super"?"super_admin":name==="cadmin"?"admin":"alumni"}})).status()).toBe(200);states[name]=await context.storageState();await context.dispose();}
 fs.writeFileSync(cacheFile,JSON.stringify({fixtureId:fixture.users[0]._id,states}));
 }
 await expect.poll(async()=> (await anon.get("http://127.0.0.1:5001/health")).status(),{timeout:30000}).toBe(200);await anon.dispose();
});
test("real backend, MongoDB and Python ML service report healthy",async({page})=>{
 const response=await page.request.get("http://127.0.0.1:4000/health");const body=await response.json();expect(response.status()).toBe(200);expect(body.database).toBe("connected");expect(body.mlService).toBe("connected");
});
test("cross-department connection request, recipient acceptance and messenger persist end to end",async({page})=>{
 await pageActor(page);const john=await actor("john"),jane=await actor("jane");
 const made=await data(await john.post(`/connections/${profile("jane@example.com")._id}`,{data:{message:"QA cross-department connection"}}),201);
 expect((await john.patch(`/connections/${made.connection._id}`,{data:{status:"accepted"}})).status()).toBe(403);
 await data(await jane.patch(`/connections/${made.connection._id}`,{data:{status:"accepted"}}));
 await page.goto("/messages");await page.getByLabel("Start a conversation").selectOption(user("jane@example.com")._id);await page.getByPlaceholder(/message/i).fill("Full project live QA message");await page.getByRole("button",{name:/Send/}).click();await expect(page.getByText("Full project live QA message",{exact:true})).toBeVisible();
 const conversations=await data(await jane.get("/messages"));expect(conversations.unreadCount).toBeGreaterThan(0);const id=conversations.conversations[0]._id;const history=await data(await jane.get(`/messages/${id}`));expect(history.messages.some(m=>m.body==="Full project live QA message")).toBe(true);
 const omar=await actor("omar");expect((await omar.get(`/messages/${id}`)).status()).toBe(404);await Promise.all([john,jane,omar].map(x=>x.dispose()));
});
test("block and unblock prevent new messages and connection requests",async()=>{
 const john=await actor("john"),omar=await actor("omar");const id=user("omar@example.com")._id;
 await data(await john.post(`/profile/blocked/${id}`));expect((await omar.post("/messages",{data:{recipientId:user("john@example.com")._id,body:"Blocked message"}})).status()).toBe(403);expect((await john.post(`/connections/${profile("omar@example.com")._id}`)).status()).toBe(404);
 await data(await john.delete(`/profile/blocked/${id}`));await Promise.all([john.dispose(),omar.dispose()]);
});
test("cross-department mentorship can be accepted, scheduled, completed and rated",async({page})=>{
 const john=await actor("john"),jane=await actor("jane");const made=await data(await john.post("/mentorship",{data:{topic:"QA Career Guidance",message:"Please guide my career.",mentorId:profile("jane@example.com")._id,goal:"Prepare for interviews"}}),201),id=made.request._id;
 await data(await jane.patch(`/mentorship/${id}`,{data:{status:"accepted"}}));await data(await jane.patch(`/mentorship/${id}`,{data:{scheduledAt:"2099-01-01T10:00:00Z",meetingLink:"https://example.com/qa-meeting"}}));await data(await john.post(`/mentorship/${id}/progress`,{data:{title:"Review resume",note:"Ready"}}));await data(await jane.patch(`/mentorship/${id}`,{data:{status:"completed",sessionNotes:"Completed review"}}));await data(await john.patch(`/mentorship/${id}`,{data:{rating:5,feedback:"Helpful session"}}));
 await pageActor(page);await page.goto("/mentorship");await expect(page.getByText("QA Career Guidance",{exact:true})).toBeVisible();await Promise.all([john.dispose(),jane.dispose()]);
});
test("referral request, department-admin assignment and alumni progress persist",async({page})=>{
 const john=await actor("john"),admin=await actor("cadmin"),jane=await actor("jane");const made=await data(await john.post("/referrals",{data:{targetRole:"QA Software Engineer",company:"QA Employer",reason:"Relevant experience"}}),201),id=made.referral._id;
 await data(await admin.patch(`/referrals/${id}`,{data:{assignedTo:user("jane@example.com")._id}}));await data(await jane.patch(`/referrals/${id}`,{data:{status:"referred",referrerNote:"Resume shared"}}));await pageActor(page);await page.goto("/career-referrals");await expect(page.getByText("QA Software Engineer",{exact:true})).toBeVisible();await Promise.all([john,admin,jane].map(x=>x.dispose()));
});
test("forum topics, cross-department replies and resources display persisted content",async({page})=>{
 const john=await actor("john"),jane=await actor("jane");const made=await data(await john.post("/community/forum",{data:{title:"QA interview discussion",message:"Share interview advice",category:"Career"}}),201);await data(await jane.post(`/community/forum/${made.topic._id}/replies`,{data:{message:"Practice fundamentals"}}));await data(await john.post("/community/resources",{data:{title:"QA preparation guide",type:"Career",description:"Interview checklist",link:"https://example.com/qa-guide"}}),201);
 await pageActor(page);await page.goto("/forum");await expect(page.getByText("QA interview discussion",{exact:true})).toBeVisible();await expect(page.getByText("Jane QA: Practice fundamentals",{exact:true})).toBeVisible();await page.goto("/resources");await expect(page.getByText("QA preparation guide",{exact:true})).toBeVisible();await Promise.all([john.dispose(),jane.dispose()]);
});
test("admin recognition and contribution campaign with alumni pledge persist",async({page})=>{
 const admin=await actor("cadmin"),john=await actor("john");await data(await admin.post("/recognition",{data:{name:"QA Award Recipient",achievement:"Engineering award",year:"2026"}}),201);const made=await data(await admin.post("/contributions",{data:{title:"QA scholarship campaign",purpose:"Student support",targetAmount:10000}}),201);const pledged=await data(await john.post(`/contributions/${made.campaign._id}/pledge`,{data:{amount:500,note:"QA pledge"}}));expect(pledged.campaign.pledgedAmount).toBe(500);
 await pageActor(page);await page.goto("/recognition");await expect(page.getByText("QA Award Recipient",{exact:true})).toBeVisible();await page.goto("/contributions");await expect(page.getByText("QA scholarship campaign",{exact:true})).toBeVisible();await Promise.all([john.dispose(),admin.dispose()]);
});
test("profile editing, privacy persistence and own-data export work with the real API",async()=>{
 const john=await actor("john");await data(await john.put("/profile/me",{data:{bio:"Updated through full project QA",designation:"Senior Software Engineer"}}));expect((await data(await john.get("/profile/me"))).profile.bio).toBe("Updated through full project QA");await data(await john.patch("/profile/privacy",{data:{showEmail:false,showPhone:false}}));expect((await data(await john.get("/profile/privacy"))).privacy.showEmail).toBe(false);const exported=await john.get("/profile/export");expect(exported.status()).toBe(200);expect(exported.headers()["content-disposition"]).toContain("attachment");expect(await exported.text()).not.toContain(password);await john.dispose();
});
test("real recommendation scoring and feedback update reach Python through the backend",async({page})=>{
 const john=await actor("john"),result=await data(await john.post("/ml/recommendations",{data:{mode:"mentor",topN:10}}));expect(result.modelVersion).toBe("hybrid-adaptive-v2");expect(result.recommendations.length).toBeGreaterThan(0);const candidate=result.recommendations.find(x=>x.userId===user("jane@example.com")._id);expect(candidate).toBeTruthy();await data(await john.post("/ml/feedback",{data:{recommendedUserId:candidate.userId,mode:"mentor",action:"hidden"}}));const after=await data(await john.post("/ml/recommendations",{data:{mode:"mentor",topN:10}}));expect(after.recommendations.some(x=>x.userId===candidate.userId)).toBe(false);
 await pageActor(page);await page.goto("/recommendations");await expect(page.getByRole("heading",{name:"Recommended for you",exact:true})).toBeVisible();await expect(page.getByText(/Recommendations are unavailable/)).toHaveCount(0);await john.dispose();
});
test("grounded assistant and network graph use actual stored profiles and connections",async({page})=>{
 const john=await actor("john"),assistant=await data(await john.post("/assistant/query",{data:{query:"React mentor Bengaluru"}}));expect(assistant.results.some(x=>x.firstName==="Jane")).toBe(true);expect(assistant.results.some(x=>x.firstName==="Private")).toBe(false);const graph=await data(await john.get("/network/graph"));expect(graph.summary.connections).toBeGreaterThan(0);
 await pageActor(page);await page.goto("/assistant");await expect(page.locator("main h1")).toBeVisible();await page.goto("/network-graph");await expect(page.locator("main h1")).toBeVisible();await john.dispose();
});
test("OTP email, registration, approval, password recovery and old-session revocation work end to end",async({page})=>{
 const email="registered-qa@example.com",anon=await createContext({baseURL});expect((await anon.post("/otp/send",{data:{email}})).status()).toBe(200);let state=await (await anon.get("http://127.0.0.1:4000/__test/state")).json();const emailBody=state.emails.find(x=>x.includes(email));expect(emailBody).toBeTruthy();const decoded=emailBody.replace(/=\r\n/g,"").replace(/=([A-F0-9]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));const otp=decoded.match(/letter-spacing: 8px[^>]*>(\d{6})</)?.[1];expect(otp).toBeTruthy();expect((await anon.post("/otp/verify",{data:{email,otp}})).status()).toBe(200);
 expect((await anon.post("/register",{data:{email,password,role:"alumni",department:fixture.departments.find(x=>x.code==="CSE")._id,firstName:"Registered",lastName:"QA",startYear:2020,endYear:2024,degree:"BE",rollNumber:"QA-REGISTER",designation:"Engineer",domain:"Software"}})).status()).toBe(201);state=await (await anon.get("http://127.0.0.1:4000/__test/state")).json();const account=state.users.find(x=>x.email===email),admin=await actor("cadmin");await data(await admin.patch(`/admin/users/${account._id}/approval`,{data:{isApproved:true}}));expect((await anon.post("/auth/login",{data:{email,password,role:"alumni"}})).status()).toBe(200);const previous=await anon.storageState();
 expect((await anon.post("/auth/forgot-password",{data:{email}})).status()).toBe(200);let token;await expect.poll(async()=>{const s=await (await anon.get("http://127.0.0.1:4000/__test/state")).json();const reset=s.emails.find(x=>x.includes(email)&&x.includes("reset-password"));if(reset){const text=reset.replace(/=\r\n/g,"").replace(/=([A-F0-9]{2})/g,(_,h)=>String.fromCharCode(parseInt(h,16)));token=text.match(/token=([a-f0-9]{64})/)?.[1];}return !!token;}).toBe(true);const newPassword="UpdatedStrongPass456!";expect((await anon.post("/auth/reset-password",{data:{token,newPassword}})).status()).toBe(200);const old=await createContext({baseURL,storageState:previous});expect((await old.get("/auth/me")).status()).toBe(401);expect((await anon.post("/auth/login",{data:{email,password:newPassword,role:"alumni"}})).status()).toBe(200);await page.context().addCookies((await anon.storageState()).cookies);await page.goto("/dashboard");await expect(page.getByRole("heading",{name:/Welcome back/})).toBeVisible();await Promise.all([anon,admin,old].map(x=>x.dispose()));
});
test("all principal alumni pages load without unhandled browser errors on desktop and mobile",async({page})=>{
 await pageActor(page);const errors=[];page.on("pageerror",e=>errors.push(e.message));
 for(const route of ["/dashboard","/profile","/alumni-directory","/connections","/mentorship","/career-referrals","/events","/community-posts","/resources","/recognition","/recommendations","/assistant","/network-graph","/privacy","/account-security","/messages","/notifications","/announcements","/contributions","/forum"]){await page.goto(route);await expect(page.locator("main").first()).toBeVisible();await expect(page.getByText("Something went wrong",{exact:true})).toHaveCount(0);}
 await page.setViewportSize({width:390,height:844});for(const route of ["/dashboard","/messages","/mentorship","/recommendations","/privacy"]){await page.goto(route);await expect(page.locator("main").first()).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);}expect(errors).toEqual([]);
});
// These assertions deliberately test privacy guarantees, rather than blessing current behavior.
test("recommendations exclude private and unapproved alumni",async()=>{
 const john=await actor("john");const result=await data(await john.post("/ml/recommendations",{data:{mode:"network",topN:50}}));const ids=result.recommendations.map(x=>x.userId);expect(ids).not.toContain(user("private@example.com")._id);expect(ids).not.toContain(user("pending@example.com")._id);await john.dispose();
});
test("connection suggestions exclude private, opted-out and unapproved alumni",async()=>{
 const john=await actor("john"),result=await data(await john.get("/connections"));const ids=result.suggestions.map(x=>String(x.userId));expect(ids).not.toContain(user("private@example.com")._id);expect(ids).not.toContain(user("pending@example.com")._id);await john.dispose();
});
test("network graph excludes unapproved alumni",async()=>{
 const john=await actor("john"),result=await data(await john.get("/network/graph"));expect(result.nodes.map(x=>x.id)).not.toContain(user("pending@example.com")._id);await john.dispose();
});

 test("ML unavailability shows a recoverable error without stale recommendation cards",async({page})=>{
 await pageActor(page);await page.route("**/ml/recommendations",route=>route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({status:"fail",message:"Temporarily unavailable"})}));
 await page.goto("/recommendations");await expect(page.getByRole("alert")).toContainText("Recommendations are temporarily unavailable");await expect(page.locator("article")).toHaveCount(0);
 await page.unroute("**/ml/recommendations");await page.getByRole("button",{name:"Try again",exact:true}).click();await expect(page.getByRole("alert")).toHaveCount(0);await expect(page.getByText("Finding the best matches…")).toHaveCount(0);
 });

test("real realtime service delivers a persisted message to the authenticated recipient",async()=>{
 const socket=io("http://127.0.0.1:4000",{extraHeaders:{Cookie:states.jane.cookies.map(item=>`${item.name}=${item.value}`).join("; ")},reconnection:false});
 const john=await actor("john");
 const waitFor=(event)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error(`Timed out waiting for ${event}`)),5000);socket.once(event,value=>{clearTimeout(timer);resolve(value);});socket.once("connect_error",error=>{clearTimeout(timer);reject(error);});});
 try{await waitFor("realtime:ready");const delivered=waitFor("message:new");expect((await john.post("/messages",{data:{recipientId:user("jane@example.com")._id,body:"Live realtime delivery check"}})).status()).toBe(201);const payload=await delivered;expect(JSON.stringify(payload)).toContain("Live realtime delivery check");}
 finally{socket.disconnect();await john.dispose();}
});
