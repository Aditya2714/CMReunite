const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const request = require("supertest");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const ExcelJS = require("exceljs");
const { startSmtpCapture } = require("./helpers/smtpCapture");
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "super-admin-isolated-tests";
process.env.EMAIL_USER = "test@localhost.invalid";
process.env.EMAIL_PASS = "local-capture-only";
const User = require("../src/models/user");
const Alumni = require("../src/models/alumniModel");
const Department = require("../src/models/departmentModel");
const Event = require("../src/models/eventModel");
const Announcement = require("../src/models/announcementModel");
const Notification = require("../src/models/notificationModel");
const Audit = require("../src/models/auditLogModel");
const { Admin } = require("../src/models/adminModel");
const { migrateDepartments } = require("../src/services/migrateDepartments");
const { getQueueStatus } = require("../src/services/jobQueue");
const password = "StrongPass123!";
let app, mongo, smtp, cse, ece, root, ca, ea, c, e, u;
const token = (user) => `Bearer ${jwt.sign({ id: user._id, av: user.authVersion || 0 }, process.env.JWT_SECRET)}`;
const api = (method, url, user = root) => request(app)[method](url).set("Authorization", token(user));
const settle = async () => { for (let i=0;i<300;i++) { const q=getQueueStatus(); if (!q.processing && !q.pending) return; await new Promise(r=>setTimeout(r,10)); } throw new Error("Queue timeout"); };
const makeUser = (email, role, department, extra = {}) => User.create({ email, name: email.split("@")[0], password, role, department, isApproved: true, approvalStatus: "approved", ...extra });
const makeAlumni = async (email, department, extra = {}) => { const user=await makeUser(email,"alumni",department,extra); const profile=await Alumni.create({ user:user._id,department,email,firstName:user.name,lastName:"Alumni",startYear:2020,endYear:2024,degree:"BE",branch:department ? "CSE" : "Unknown",rollNumber:email,designation:"Engineer",domain:"Software",verified:true }); return { user,profile }; };
const eventBody = { title:"Scoped event",description:"Department event",location:"Campus",date:"2099-01-01" };
beforeAll(async()=>{
 smtp=await startSmtpCapture(); const real=nodemailer.createTransport.bind(nodemailer);
 jest.spyOn(nodemailer,"createTransport").mockImplementation(()=>real({host:"127.0.0.1",port:smtp.port,ignoreTLS:true}));
 app=require("../app"); mongo=await MongoMemoryServer.create(); await mongoose.connect(mongo.getUri()); await User.init(); await Department.init();
});
beforeEach(async()=>{
 smtp.messages.length=0;
 cse=await Department.create({code:"CSE",name:"Computer Science"}); ece=await Department.create({code:"ECE",name:"Electronics"});
 root=await makeUser("super@example.com","super_admin"); ca=await makeUser("cadmin@example.com","admin",cse._id); ea=await makeUser("eadmin@example.com","admin",ece._id);
 c=await makeAlumni("cse@example.com",cse._id); e=await makeAlumni("ece@example.com",ece._id); u=await makeAlumni("unassigned@example.com",null);
});
afterEach(async()=>{ await settle(); await Promise.all(Object.values(mongoose.connection.collections).map(col=>col.deleteMany({}))); });
afterAll(async()=>{await mongoose.disconnect();await mongo?.stop();await smtp?.close();jest.restoreAllMocks();});
test("only Super Admin can use the platform workspace; college and unassigned admins have no administrative access",async()=>{
 for(const user of [ca,c.user,await makeUser("college@example.com","college"),await makeUser("oldadmin@example.com","admin")]) {
  expect((await api("get","/super-admin/overview",user)).status).toBe(403);
  if(!user.department) expect((await api("get","/admin/overview",user)).status).toBe(403);
 }
 expect((await api("get","/super-admin/overview")).status).toBe(200);
 expect((await request(app).get("/super-admin/audit")).status).toBe(401);
});
test("department lifecycle keeps stable codes and rejects archival with an active admin",async()=>{
 expect((await api("patch",`/super-admin/departments/${cse.id}`).send({isActive:false})).status).toBe(409);
 expect((await api("patch",`/super-admin/departments/${cse.id}`).send({code:"NEW"})).status).toBe(400);
 expect((await api("patch",`/super-admin/departments/${cse.id}`).send({name:"Computing"})).status).toBe(200);
 await api("patch",`/super-admin/admins/${ca.id}`).send({isActive:false});
 expect((await api("patch",`/super-admin/departments/${cse.id}`).send({isActive:false})).status).toBe(200);
 const list=await request(app).get("/departments"); expect(list.body.data.departments.map(d=>d.code)).toEqual(["ECE"]);
 expect((await api("post","/super-admin/admins").send({name:"New",email:"new@example.com",department:cse.id})).status).toBe(400);
});
test("concurrent provisioning admits exactly one active admin and database index independently enforces uniqueness",async()=>{
 const dept=await Department.create({code:"ME",name:"Mechanical"});
 const responses=await Promise.all([1,2].map(n=>api("post","/super-admin/admins").send({name:`Admin ${n}`,email:`new${n}@example.com`,department:dept.id})));
 expect(responses.map(r=>r.status).sort()).toEqual([201,409]);
 expect(await User.countDocuments({role:"admin",department:dept.id,isActive:true})).toBe(1);
 await expect(makeUser("duplicate@example.com","admin",dept.id)).rejects.toHaveProperty("code",11000);
});
test("temporary passwords are shown once and restrict restored sessions until password change and re-login",async()=>{
 const dept=await Department.create({code:"ME",name:"Mechanical"});
 const made=await api("post","/super-admin/admins").send({name:"New admin",email:"new@example.com",department:dept.id});
 expect(made.status).toBe(201); const temp=made.body.data.temporaryPassword; expect(temp.length).toBeGreaterThan(20);
 expect(made.headers["cache-control"]).toBe("no-store");
 expect(JSON.stringify((await api("get","/super-admin/admins")).body)).not.toContain(temp);
 const agent=request.agent(app); expect((await agent.post("/auth/login").send({email:"new@example.com",password:temp,role:"admin"})).status).toBe(200);
 expect((await agent.get("/auth/me")).body.data.user.mustChangePassword).toBe(true);
 expect((await agent.get("/admin/overview")).status).toBe(403);
 const csrf=(await agent.get("/auth/csrf")).body.data.csrfToken;
 const changed=await agent.post("/auth/change-password").set("X-CSRF-Token",csrf).send({currentPassword:temp,newPassword:password}); expect(changed.status).toBe(200); expect(changed.body.requiresLogin).toBe(true);
 expect((await agent.get("/auth/me")).status).toBe(401);
 expect((await agent.post("/auth/login").send({email:"new@example.com",password,role:"admin"})).status).toBe(200);
 expect((await agent.get("/admin/overview")).status).toBe(200);
 expect(JSON.stringify(await Audit.find().lean())).not.toContain(temp);
});
test("deactivation invalidates tokens and prevents authentication",async()=>{
 const oldToken=token(ca); await api("patch",`/super-admin/admins/${ca.id}`).send({isActive:false});
 expect((await request(app).get("/auth/me").set("Authorization",oldToken)).status).toBe(401);
 expect((await request(app).post("/auth/login").send({email:ca.email,password,role:"admin"})).status).toBe(403);
 expect(await User.exists({_id:ca.id})).toBeTruthy();
});
test("replacement keeps the department fixed, deactivates the former admin and returns a one-time password",async()=>{
 const oldToken=token(ca);
 const response=await api("post",`/super-admin/admins/${ca.id}/replace`).send({name:"CSE Replacement",email:"replacement@example.com"});
 expect(response.status).toBe(201);expect(response.headers["cache-control"]).toBe("no-store");expect(response.body.data.temporaryPassword.length).toBeGreaterThan(20);
 const previous=await User.findById(ca.id),replacement=await User.findOne({email:"replacement@example.com"});
 expect(previous.isActive).toBe(false);expect(replacement.isActive).toBe(true);expect(String(replacement.department)).toBe(cse.id);expect(replacement.mustChangePassword).toBe(true);
 expect((await request(app).get("/auth/me").set("Authorization",oldToken)).status).toBe(401);
 expect(await Audit.exists({action:"admin.replaced",target:String(replacement._id),department:cse._id})).toBeTruthy();
});
test("reassignment immediately revokes sessions while preserving authored event ownership",async()=>{
 const created=await api("post","/event/create",ca).send(eventBody); expect(created.status).toBe(201);
 await api("patch",`/super-admin/admins/${ea.id}`).send({isActive:false});
 expect((await api("patch",`/super-admin/admins/${ca.id}`).send({department:ece.id})).status).toBe(200);
 expect((await api("get","/admin/overview",ca)).status).toBe(401);
 ca=await User.findById(ca.id);
 expect((await api("get","/admin/alumni-records",ca)).body.data.alumni.map(a=>a.email)).toEqual([e.user.email]);
 expect(String((await Event.findById(created.body.data.event._id)).department)).toBe(cse.id);
 expect((await api("delete",`/event/${created.body.data.event._id}`,ca)).status).toBe(404);
});
test("concurrent reassignment and replacement cannot produce two active admins",async()=>{
 const dept=await Department.create({code:"ME",name:"Mechanical"});
 const responses=await Promise.all([api("patch",`/super-admin/admins/${ca.id}`).send({department:dept.id}),api("patch",`/super-admin/admins/${ea.id}`).send({department:dept.id})]);
 expect(responses.map(r=>r.status).sort()).toEqual([200,409]);
 expect(await User.countDocuments({role:"admin",department:dept.id,isActive:true})).toBe(1);
});
test("resetting an admin password revokes old tokens and restores first-login restrictions",async()=>{
 const reset=await api("post",`/super-admin/admins/${ca.id}/reset-password`); expect(reset.status).toBe(200);
 expect((await api("get","/admin/overview",ca)).status).toBe(401);
 ca=await User.findById(ca.id); expect(ca.mustChangePassword).toBe(true);
 expect((await api("get","/admin/overview",ca)).status).toBe(403);
});
test("department isolation covers management lists, changed IDs, approvals and CSV reports",async()=>{
 expect((await api("get","/admin/alumni-records?department="+ece.id,ca)).body.data.alumni.map(a=>a.email)).toEqual([c.user.email]);
 expect((await api("get","/admin/users",ca)).body.data.users.map(a=>a.email)).toEqual([c.user.email]);
 expect((await api("patch",`/alumni/${e.profile.id}`,ca).send({company:"Hijacked"})).status).toBe(404);
 expect((await api("delete",`/alumni/${e.profile.id}`,ca)).status).toBe(404);
 expect((await api("patch",`/admin/users/${e.user.id}/approval`,ca).send({isApproved:true})).status).toBe(404);
 const report=await api("get","/admin/reports/export",ca); expect(report.status).toBe(200);expect(report.text).toContain("CSE");expect(report.text).not.toContain("ECE");
});
test.each(["role","department","branch","isActive"])("alumni cannot self-change privileged field %s",async(field)=>{
 expect((await api("put","/profile/me",c.user).send({[field]:field==="isActive"?false:"super_admin"})).status).toBe(403);
 expect((await User.findById(c.user.id)).role).toBe("alumni");
});
test("department admins have a role-specific profile with server-controlled role and department",async()=>{
 await Admin.create({user:ca.id,adminName:"CSE Admin",email:ca.email});
 const updated=await api("put","/profile/me",ca).send({
  adminName:"Dr CSE Admin",phone:"+91 9876543210",officialDesignation:"Head of Department",
 });
 expect(updated.status).toBe(200);
 expect(updated.body.data.profile).toMatchObject({
  adminName:"Dr CSE Admin",mobileNumber:"+91 9876543210",officialDesignation:"Head of Department",role:"admin",
 });
 expect(updated.body.data.profile.department).toMatchObject({code:"CSE",name:"Computer Science"});
 expect(await Admin.exists({user:ca.id,customDesignation:""})).toBeTruthy();
 const other=await api("put","/profile/me",ca).send({officialDesignation:"Other",customDesignation:"Dean of Alumni Relations"});
 expect(other.status).toBe(200);
 expect(other.body.data.profile).toMatchObject({officialDesignation:"Other",customDesignation:"Dean of Alumni Relations"});
 expect((await api("put","/profile/me",ca).send({officialDesignation:"Other",customDesignation:""})).status).toBe(400);
 expect((await api("put","/profile/me",ca).send({department:ece.id})).status).toBe(403);
});
test("unassigned alumni retain shared discovery while privileged tools remain protected",async()=>{
 const directory=await api("get","/alumni",u.user); expect(directory.status).toBe(200);
 expect(JSON.stringify(directory.body)).toContain(e.user.email);
 expect((await api("get","/admin/overview",u.user)).status).toBe(403);
});
test("exact analytics exclude orphan profiles and separate platform/unassigned events",async()=>{
 await User.collection.updateOne({_id:c.user._id},{$unset:{approvalStatus:""}});
 await makeAlumni("pending@example.com",cse.id,{isApproved:false,approvalStatus:"pending"});
 await Alumni.create({...c.profile.toObject(),_id:new mongoose.Types.ObjectId(),user:new mongoose.Types.ObjectId(),email:"orphan@example.com",rollNumber:"orphan"});
 for(const [scope,department,eligibility] of [["department",cse.id,"all"],["department",ece.id,"department"],["platform",null,"all"],["unassigned",null,"department"]]) await Event.create({...eventBody,createdBy:root.id,scope,department,eligibility});
 const result=(await api("get","/super-admin/analytics")).body.data;
 expect(result.totals).toMatchObject({alumni:4,events:4,platformEvents:1,unassignedEvents:1,admins:2});
 expect(result.departments.find(d=>d.code==="CSE")).toMatchObject({alumni:2,approved:1,pending:1,events:1});
 expect(result.departments.find(d=>d.code==="UNASSIGNED")).toMatchObject({alumni:1,events:1});
 const scoped=(await api("get","/admin/overview",ca)).body.data.overview.departmentAnalytics;
 expect(scoped.totals).toMatchObject({alumni:2,events:1,platformEvents:0});
});
test("announcement audience matches feed, protected attachment, notifications and local SMTP recipients",async()=>{
 const otherBatch=await makeAlumni("older@example.com",cse.id);await Alumni.updateOne({_id:otherBatch.profile.id},{endYear:2023});
 const made=await api("post","/announcements",ca).field("title","CSE batch update").field("message","Private details").field("batch","2024").attach("attachment",Buffer.from("%PDF-1.4 isolated"),{filename:"test.pdf",contentType:"application/pdf"});
 expect(made.status).toBe(201); const announcement=made.body.data.announcement;await settle();
 expect(await Notification.countDocuments({type:"announcement"})).toBe(1);expect(smtp.messages).toHaveLength(1);expect(smtp.messages[0]).toContain(c.user.email);expect(smtp.messages[0]).not.toContain(e.user.email);
 for(const who of [e.user,otherBatch.user,u.user]) {
  expect((await api("get","/announcements",who)).body.data.announcements).toHaveLength(0);
  expect((await api("get",announcement.attachmentUrl,who)).status).toBe(404);
 }
 expect((await api("get",announcement.attachmentUrl,c.user)).status).toBe(200);
 expect((await request(app).get(announcement.attachmentUrl)).status).toBe(401);
 expect((await api("get","/notifications",c.user)).body.data.notifications).toHaveLength(1);
 const profile=await api("patch",`/super-admin/assign/alumni/${c.profile.id}`).send({department:ece.id});expect(profile.status).toBe(200);c.user=await User.findById(c.user.id);
 expect((await api("get","/notifications",c.user)).body.data.notifications).toHaveLength(0);
 expect((await api("get",announcement.attachmentUrl,c.user)).status).toBe(404);
 require("node:fs").unlinkSync(require("node:path").join(__dirname,"../public",announcement.attachmentUrl));
});
test("platform announcements reach every department and cannot be changed by department admins",async()=>{
 const made=await api("post","/announcements").send({title:"Platform news",message:"Everyone",batch:"All batches"});expect(made.status).toBe(201);await settle();
 expect(smtp.messages).toHaveLength(3);
 for(const who of [c.user,e.user,u.user,ca]) expect((await api("get","/announcements",who)).body.data.announcements).toHaveLength(1);
 expect((await api("patch",`/announcements/${made.body.data.announcement._id}`,ca).send({title:"Override"})).status).toBe(404);
 expect((await api("delete",`/announcements/${made.body.data.announcement._id}`,ca)).status).toBe(404);
 expect((await api("post","/announcements",ca).send({title:"Bad",message:"Scope",scope:"platform"})).status).toBe(403);
});
test("event ownership and eligibility apply to API lists, public listings, registrations and check-in",async()=>{
 const privateEvent=(await api("post","/event/create",ca).send(eventBody)).body.data.event;
 const openEvent=(await api("post","/event/create",ca).send({...eventBody,title:"Open CSE",eligibility:"all"})).body.data.event;
 const globalEvent=(await api("post","/event/create").send({...eventBody,title:"Platform",scope:"platform"})).body.data.event;
 expect((await api("post","/event/create",ca).send({...eventBody,department:ece.id})).status).toBe(403);
 expect((await api("get","/event/all",e.user)).body.data.events.map(x=>x._id).sort()).toEqual([openEvent._id,globalEvent._id].sort());
 expect((await api("post",`/event/${privateEvent._id}/register`,e.user)).status).toBe(404);
 expect((await api("post",`/event/${privateEvent._id}/register`,c.user)).status).toBe(200);
 const registration=await api("post",`/event/${openEvent._id}/register`,e.user);expect(registration.status).toBe(200);
 expect((await api("post",`/event/${openEvent._id}/check-in`,ea).send({checkInCode:registration.body.data.event.checkInCode})).status).toBe(404);
 expect((await api("post",`/event/${openEvent._id}/check-in`,ca).send({checkInCode:registration.body.data.event.checkInCode})).status).toBe(200);
 expect((await api("patch",`/event/${openEvent._id}`,ca).send({department:ece.id})).status).toBe(400);
 const publicList=await request(app).get("/event/upcoming");expect(publicList.status).toBe(200);expect(publicList.body.data.events.map(x=>x._id).sort()).toEqual([openEvent._id,globalEvent._id].sort());
 expect((await Event.findById(openEvent._id)).department.toString()).toBe(cse.id);
});
test("mentorship remains shared for participants but oversight follows requester's department",async()=>{
 const made=await api("post","/mentorship",c.user).send({topic:"Career",message:"Help",mentorId:e.profile.id});expect(made.status).toBe(201);
 expect((await api("get","/mentorship",ca)).body.data.requests).toHaveLength(1);
 expect((await api("get","/mentorship",ea)).body.data.requests).toHaveLength(0);
 expect((await api("get","/mentorship",e.user)).body.data.received).toHaveLength(1);
 expect((await api("post",`/mentorship/${made.body.data.request._id}/progress`,ea).send({title:"Bad"})).status).toBe(404);
});
test("unassigned queue resolution updates both alumni and account, and audit history is paginated and immutable via API",async()=>{
 expect((await api("get","/super-admin/unassigned?type=alumni")).body.data.records).toHaveLength(1);
 expect((await api("patch",`/super-admin/assign/alumni/${u.profile.id}`).send({department:ece.id})).status).toBe(200);
 expect(String((await User.findById(u.user.id)).department)).toBe(ece.id);
 expect((await Alumni.findById(u.profile.id)).branch).toBe("ECE");
 const history=await api("get","/super-admin/audit");expect(history.body.data.entries[0]).toMatchObject({action:"alumni.assigned",actor:{email:root.email},department:{code:"ECE"}});
 expect((await api("delete",`/super-admin/audit/${history.body.data.entries[0]._id}`)).status).toBe(404);
});
test("migration dry run writes nothing; reruns preserve manual edits, history, IDs and timestamps",async()=>{
 await Alumni.updateOne({_id:c.profile.id},{$set:{department:null,branch:"Computer Science"}});await User.updateOne({_id:c.user.id},{department:null});
 const oldEvent=await Event.create({...eventBody,createdBy:root.id});
 const oldAnnouncement=await Announcement.create({title:"Historic",message:"History",branch:"All branches",batch:"2024",createdBy:root.id});
 const note=await Notification.create({recipient:c.user.id,type:"announcement",title:"Old",message:"Preserve",metadata:{announcementId:oldAnnouncement.id}});
 const mapping={departments:[],branches:{"Computer Science":"CSE"},admins:{},events:{[oldEvent.id]:"ECE"}};
 const before=await Alumni.findById(c.profile.id).lean();const auditCount=await Audit.countDocuments();
 const dry=await migrateDepartments(mapping);expect(dry.alumni).toBe(1);expect(dry.events).toBe(1);expect(dry.announcements).toBe(1);expect(dry.unassigned.some(x=>x.id===u.profile.id)).toBe(true);
 expect((await Alumni.findById(c.profile.id)).department).toBeNull();expect(await Audit.countDocuments()).toBe(auditCount);
 await migrateDepartments(mapping,true);
 expect(String((await Alumni.findById(c.profile.id)).department)).toBe(cse.id);
 expect((await Alumni.findById(c.profile.id)).updatedAt).toEqual(before.updatedAt);
 expect((await Announcement.findById(oldAnnouncement.id)).scope).toBe("platform");
 await api("patch",`/super-admin/assign/alumni/${c.profile.id}`).send({department:ece.id});
 const rerun=await migrateDepartments(mapping,true);expect(rerun.alumni).toBe(0);expect(rerun.events).toBe(0);expect(rerun.announcements).toBe(0);
 expect(String((await Alumni.findById(c.profile.id)).department)).toBe(ece.id);
 expect((await Notification.findById(note.id)).readAt).toEqual(note.readAt);expect(await Notification.countDocuments()).toBe(1);expect(smtp.messages).toHaveLength(0);
});
test("migration rejects conflicting admin mapping before applying any changes",async()=>{
 const legacy=await makeUser("legacy@example.com","admin");
 await expect(migrateDepartments({admins:{[legacy.email]:"CSE"}},true)).rejects.toHaveProperty("status",409);
 expect((await User.findById(legacy.id)).department).toBeNull();
});
test("CSV imports reject another department's rows without creating accounts",async()=>{
 const csv="email,firstName,lastName,password,startYear,endYear,degree,branch,designation\ncimport@example.com,C,Import,StrongPass123!,2020,2024,BE,CSE,Engineer\neimport@example.com,E,Import,StrongPass123!,2020,2024,BE,ECE,Engineer";
 const result=await api("post","/bulk/bulkImport",ca).attach("file",Buffer.from(csv),{filename:"alumni.csv",contentType:"text/csv"});
 expect(result.status).toBe(201);expect(result.body.data).toMatchObject({imported:1,skipped:1});
 expect(await User.exists({email:"eimport@example.com"})).toBeNull();
 expect(String((await User.findOne({email:"cimport@example.com"})).department)).toBe(cse.id);
});
test("XLSX bulk import accepts the monthly department-sheet format and maps its alumni fields",async()=>{
 const workbook=new ExcelJS.Workbook();
 const cseSheet=workbook.addWorksheet("CSE");
 cseSheet.addRow(["#","Name","","Graduating year","Contact information ","email id","Linkedin Profile link","Current working designation","Employee/ Entreprenur Details","Address Deatils if any"]);
 cseSheet.addRow([1,"","Monthly Import Alumni",2024,"9876543210","monthly.import@example.com","https://linkedin.com/in/monthly-import","Senior Engineer","Example Company","Bengaluru"]);
 const eceSheet=workbook.addWorksheet(" ECE");
 eceSheet.addRow(["","","","","CMR Institute of Technology"]);eceSheet.addRow(["","","","","Department of ECE"]);eceSheet.addRow(["","","Monthly Alumni details added AY 25-26"]);
 eceSheet.addRow(["#","Name","Graduating year","Contact information ","email id","Current working designation","Linkedin Profile link","Employee/ Entreprenur Details"]);
 eceSheet.addRow([1,"Outside Department",2024,"9000000000","outside.xlsx@example.com","Engineer","https://linkedin.com/in/outside","Other Company"]);
 const file=await workbook.xlsx.writeBuffer();
 const result=await api("post","/bulk/bulkImport",ca).attach("file",Buffer.from(file),{filename:"Monthly Alumni details added AY 25-26.xlsx",contentType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"});
 expect(result.status).toBe(201);expect(result.body.data).toMatchObject({format:"xlsx",imported:1,skipped:1});
 expect(await User.exists({email:"outside.xlsx@example.com"})).toBeNull();
 const profile=await Alumni.findOne({email:"monthly.import@example.com"});
 expect(profile).toMatchObject({firstName:"Monthly Import",lastName:"Alumni",startYear:2020,endYear:2024,degree:"BE",branch:"CSE",company:"Example Company",designation:"Senior Engineer",location:"Bengaluru",mobileNumber:9876543210});
 expect(profile.socialProfiles.linkedin).toBe("https://linkedin.com/in/monthly-import");
 const account=await User.findOne({email:"monthly.import@example.com"});expect(account.mustChangePassword).toBe(true);expect(String(account.department)).toBe(cse.id);
});
test("new registration requires active department and cannot provision privileged roles",async()=>{
 const body={email:"newalumni@example.com",password,firstName:"New",lastName:"Alumni",startYear:2020,endYear:2024,degree:"BE",rollNumber:"NEW",designation:"Engineer",domain:"Software",department:cse.id};
 await require("../src/models/otpModel").create({email:body.email,otp:"123456",verified:true,expiresAt:new Date(Date.now()+60000)});
 expect((await request(app).post("/register").send({...body,role:"super_admin"})).status).toBe(400);
 const missing={...body};delete missing.department;expect((await request(app).post("/register").send(missing)).status).toBe(400);
 expect((await request(app).post("/register").send({...body,branch:"ECE"})).status).toBe(201);
 expect((await Alumni.findOne({email:body.email})).branch).toBe("CSE");
 await api("patch",`/super-admin/admins/${ca.id}`).send({isActive:false});await api("patch",`/super-admin/departments/${cse.id}`).send({isActive:false});
 expect((await request(app).post("/register").send({...body,email:"archived@example.com"})).status).toBe(400);
});
test("legacy college accounts require explicit provisioning and cannot become Super Admin through admin lifecycle",async()=>{
 const college=await makeUser("college@example.com","college");await api("patch",`/super-admin/admins/${ca.id}`).send({isActive:false});
 const made=await api("post","/super-admin/admins").send({name:"Office",email:college.email,department:cse.id,existingUserId:college.id});expect(made.status).toBe(201);
 expect((await User.findById(college.id)).role).toBe("admin");
 expect((await api("patch",`/super-admin/admins/${college.id}`).send({role:"super_admin"})).status).toBe(400);
 expect((await api("patch",`/super-admin/admins/${root.id}`).send({isActive:false})).status).toBe(404);
});
test("operator commands promote only explicitly selected admins and migration CLI defaults to dry run",async()=>{
 const {execFile}=require("node:child_process"),{promisify}=require("node:util"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
 const run=promisify(execFile),env={...process.env,MONGODB_URI:mongo.getUri()};
 await expect(run(process.execPath,["scripts/setupSuperAdmin.js","--email",c.user.email],{env,timeout:15000})).rejects.toBeTruthy();
 expect((await User.findById(c.user.id)).role).toBe("alumni");
 await run(process.execPath,["scripts/setupSuperAdmin.js","--email",ca.email],{env,timeout:15000});
 expect((await User.findById(ca.id)).role).toBe("super_admin");expect((await User.findById(ea.id)).role).toBe("admin");
 const directory=fs.mkdtempSync(path.join(os.tmpdir(),"department-cli-")),file=path.join(directory,"mapping.json");fs.writeFileSync(file,JSON.stringify({departments:[{code:"ME",name:"Mechanical"}]}));
 try {const result=await run(process.execPath,["scripts/migrateDepartments.js","--mapping",file],{env,timeout:15000});expect(JSON.parse(result.stdout).apply).toBe(false);expect(await Department.exists({code:"ME"})).toBeNull();} finally {fs.rmSync(directory,{recursive:true});}
});
test("published event and announcement ownership cannot be reassigned through the unassigned queue API",async()=>{
 const event=(await api("post","/event/create",ca).send(eventBody)).body.data.event;
 const announcement=(await api("post","/announcements").send({title:"Global",message:"Fixed platform scope"})).body.data.announcement;
 expect((await api("patch",`/super-admin/assign/events/${event._id}`).send({department:ece.id})).status).toBe(409);
 expect((await api("patch",`/super-admin/assign/announcements/${announcement._id}`).send({department:ece.id})).status).toBe(409);
 expect(String((await Event.findById(event._id)).department)).toBe(cse.id);
 expect((await Announcement.findById(announcement._id)).scope).toBe("platform");
});
test("audit pagination is stable and exposes no credentials",async()=>{
 await Audit.insertMany(Array.from({length:30},(_,i)=>({actor:root.id,action:"test.reviewed",target:String(i),department:cse.id})));
 const first=(await api("get","/super-admin/audit?page=1")).body.data, second=(await api("get","/super-admin/audit?page=2")).body.data;
 expect(first.entries).toHaveLength(25);expect(second.entries).toHaveLength(5);expect(first.pagination.total).toBe(30);
 expect(first.entries.some(a=>second.entries.some(b=>b._id===a._id))).toBe(false);expect(JSON.stringify(first)).not.toContain(password);
});
test("archived departments cannot receive new publishing or edits even from Super Admin",async()=>{
 const event=(await api("post","/event/create",ca).send(eventBody)).body.data.event;
 const announcement=(await api("post","/announcements",ca).send({title:"CSE",message:"Department announcement"})).body.data.announcement;
 await api("patch",`/super-admin/admins/${ca.id}`).send({isActive:false});await api("patch",`/super-admin/departments/${cse.id}`).send({isActive:false});
 expect((await api("post","/event/create").send({...eventBody,department:cse.id})).status).toBe(400);
 expect((await api("patch",`/event/${event._id}`).send({title:"Republish"})).status).toBe(400);
 expect((await api("patch",`/announcements/${announcement._id}`).send({title:"Republish"})).status).toBe(400);
});
test("legacy alumni list and individual profile URLs cannot bypass management scope or directory visibility",async()=>{
 const legacy=await api("get","/alumniList?department="+ece.id,ca);expect(legacy.status).toBe(200);expect(legacy.body.data.alumni.map(a=>a.email)).toEqual([c.user.email]);
 const oldAdmin=await makeUser("old@example.com","admin");expect((await api("get","/alumniList",oldAdmin)).status).toBe(403);
 await User.updateOne({_id:e.user.id},{isApproved:false,approvalStatus:"pending"});
 expect((await api("get",`/alumni/${e.profile.id}`,c.user)).status).toBe(404);
 expect((await api("get","/alumniList",c.user)).body.data.alumni.some(a=>a._id===e.profile.id)).toBe(false);
});
