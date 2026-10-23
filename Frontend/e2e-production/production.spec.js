import {test,expect} from "../e2e/helpers/secure-api.js";
test("container health verifies MongoDB and Python through Nginx",async({request})=>{const response=await request.get("/health");expect(response.status()).toBe(200);expect(await response.json()).toMatchObject({database:"connected",mlService:"connected"});});
test("Super Admin production-image login, reload and shared-prefix navigation",async({page})=>{
 await page.goto("/login");await page.getByLabel("Email").fill("containeradmin@qa.invalid");await page.getByLabel("Password").fill("StrongPass123!");await page.getByRole("combobox").click();await page.getByRole("option",{name:"Super Admin",exact:true}).click();await page.getByRole("button",{name:"Sign In"}).click();await expect(page).toHaveURL(/super-admin$/);await expect(page.getByRole("heading",{name:"Super Admin",exact:true})).toBeVisible();await page.reload();await expect(page.getByRole("heading",{name:"Super Admin",exact:true})).toBeVisible();
 for(const route of ["/profile","/announcements","/notifications","/messages"]){const response=await page.goto(route);expect(response.status()).toBe(200);expect(response.headers()["content-type"]).toContain("text/html");await expect(page.locator("main").first()).toBeVisible();}
});
test("alumni production-image session restores and recommendations use container ML",async({page})=>{
 await page.goto("/login");await page.getByLabel("Email").fill("containeralumni@qa.invalid");await page.getByLabel("Password").fill("StrongPass123!");await page.getByRole("combobox").click();await page.getByRole("option",{name:"Alumni",exact:true}).click();await page.getByRole("button",{name:"Sign In"}).click();await expect(page).toHaveURL(/dashboard$/);await page.goto("/recommendations");await expect(page.getByRole("heading",{name:"Recommended for you",exact:true})).toBeVisible();await expect(page.getByText(/Recommendations are unavailable/)).toHaveCount(0);const api=await page.request.post("/ml/recommendations",{data:{mode:"network"}});expect(api.status()).toBe(200);expect((await api.json()).data.modelVersion).toBe("hybrid-adaptive-v2");await page.reload();await expect(page.getByRole("heading",{name:"Recommended for you",exact:true})).toBeVisible();
});

test('HTTPS headers, secure cookies, CSRF rotation and spoofed origin enforcement',async({playwright})=>{
 const api=await playwright.request.newContext({baseURL:'https://localhost:18443',ignoreHTTPSErrors:true});
 try{
 const html=await api.get('/login');expect(html.headers()['content-security-policy']).toContain("frame-ancestors 'none'");expect(html.headers()['strict-transport-security']).toContain('max-age=31536000');expect((await api.get('/internal/status')).status()).toBe(404);
 const first=await (await api.get('/auth/csrf')).json();
 const login=await api.post('/auth/login',{headers:{'X-CSRF-Token':first.data.csrfToken,Origin:'https://localhost:18443'},data:{email:'containeralumni@qa.invalid',password:'StrongPass123!',role:'alumni'}});expect(login.status()).toBe(200);
 const cookie=(await api.storageState()).cookies.find(value=>value.name==='jwt');expect(cookie).toMatchObject({secure:true,httpOnly:true,sameSite:'Lax',domain:'localhost'});
 expect((await api.post('/ml/recommendations',{data:{mode:'network'}})).status()).toBe(403);
 expect((await api.post('/ml/recommendations',{headers:{'X-CSRF-Token':first.data.csrfToken},data:{mode:'network'}})).status()).toBe(403);
 const next=await (await api.get('/auth/csrf')).json();expect(next.data.csrfToken).not.toBe(first.data.csrfToken);
 expect((await api.post('/ml/recommendations',{headers:{'X-CSRF-Token':next.data.csrfToken,Origin:'https://evil.invalid'},data:{mode:'network'}})).status()).toBe(403);
 expect((await api.post('/ml/recommendations',{headers:{'X-CSRF-Token':next.data.csrfToken,Origin:'https://localhost:18443'},data:{mode:'network'}})).status()).toBe(200);
 }finally{await api.dispose();}
});
test('forwarded-IP spoofing cannot reset the login rate limit',async({playwright})=>{
 const api=await playwright.request.newContext({baseURL:'https://localhost:18443',ignoreHTTPSErrors:true});
 try{let limited=false;for(let index=0;index<22;index++){
 const response=await api.post('/auth/login',{headers:{'X-Forwarded-For':`192.0.2.${index+1}`},data:{email:'invalid',password:'bad',role:'alumni'}});
 if(response.status()===429){limited=true;break;}expect(response.status()).toBe(400);
 }expect(limited).toBe(true);}finally{await api.dispose();}
});

test('production pages fit desktop and mobile layouts',async({page},testInfo)=>{
 for(const [name,width,height] of [['desktop',1440,900],['mobile',390,844]]){
  await page.setViewportSize({width,height});await page.goto('/login');await expect(page.getByRole('button',{name:'Sign In',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`${name}.png`),fullPage:true});
 }
});
