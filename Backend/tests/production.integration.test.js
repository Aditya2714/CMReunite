process.env.NODE_ENV='test'; process.env.JWT_SECRET='production-test-only-secret';
const express=require('express'),cookies=require('cookie-parser'),request=require('supertest');
const {protect,issue}=require('../src/middlewares/csrf');
let writes;const app=express();app.use(cookies());app.get('/auth/csrf',issue);app.use(protect);app.post('/mutation',(req,res)=>{writes++;res.json({ok:true});});
beforeEach(()=>{writes=0;});
test('ambient cookie mutation without token fails before writes',async()=>{expect((await request(app).post('/mutation').set('Cookie','jwt=session')).status).toBe(403);expect(writes).toBe(0);});
test('foreign origin and forged tokens fail',async()=>{expect((await request(app).post('/mutation').set('Origin','https://evil.invalid')).status).toBe(403);expect((await request(app).post('/mutation').set('Cookie','jwt=session').set('X-CSRF-Token','forged')).status).toBe(403);expect(writes).toBe(0);});
test('browser login-style anonymous mutation requires a token',async()=>{expect((await request(app).post('/mutation').set('Sec-Fetch-Site','same-origin')).status).toBe(403);});
test('valid double submit token allows mutation and binds to authentication session',async()=>{
 const agent=request.agent(app);const csrf=await agent.get('/auth/csrf');expect(csrf.headers['cache-control']).toBe('no-store');
 expect((await agent.post('/mutation').set('X-CSRF-Token',csrf.body.data.csrfToken)).status).toBe(200);
 expect((await agent.post('/mutation').set('Cookie','jwt=changed-session').set('X-CSRF-Token',csrf.body.data.csrfToken)).status).toBe(403);expect(writes).toBe(1);
});
test('cookie-free Bearer API remains compatible but cannot bypass a cookie session',async()=>{expect((await request(app).post('/mutation').set('Authorization','Bearer api-token')).status).toBe(200);expect((await request(app).post('/mutation').set('Authorization','Bearer api-token').set('Cookie','jwt=session')).status).toBe(403);});
test('malformed CSRF cookies recover through token endpoint without process failure',async()=>{const csrf=await request(app).get('/auth/csrf').set('Cookie','cm-csrf=garbage');expect(csrf.status).toBe(200);expect(csrf.body.data.csrfToken).toBeTruthy();});
