process.env.NODE_ENV="test";process.env.JWT_SECRET="reliability-regressions-only";
const mongoose=require("mongoose"),{MongoMemoryServer}=require("mongodb-memory-server"),request=require("supertest"),jwt=require("jsonwebtoken");
const app=require("../app"),User=require("../src/models/user"),Alumni=require("../src/models/alumniModel"),Notification=require("../src/models/notificationModel"),Message=require("../src/models/messageModel"),Connection=require("../src/models/connectionModel");
const indexes=require("../src/services/notificationIndexes"),policy=require("../src/services/discoveryPolicy"),cache=require("../src/services/cacheService");
const {notify}=require("../src/services/notificationService");const password="StrongPass123!";let mongo,a,b,c;
const token=user=>`Bearer ${jwt.sign({id:user._id,av:user.authVersion||0},process.env.JWT_SECRET)}`;
const api=(method,url,user=a)=>request(app)[method](url).set("Authorization",token(user));
const person=async(name,extra={})=>{const user=await User.create({name,email:`${name}@qa.invalid`,role:"alumni",password,isApproved:true,approvalStatus:"approved",privacy:{profileVisibility:"members",allowMessages:"members",showEmail:false,showPhone:false},...extra});const profile=await Alumni.create({user:user.id,email:user.email,firstName:name,lastName:"QA",startYear:2015,endYear:2020,degree:"BE",branch:"CSE",rollNumber:name,designation:"Engineer",domain:"Software",verified:true,mobileNumber:9876543210});return {user,profile};};
beforeAll(async()=>{mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());await indexes.ensureNotificationIndexes();});
beforeEach(async()=>{a=(await person("sender")).user;b=(await person("recipient")).user;c=(await person("third")).user;});
afterEach(async()=>{cache.removeByPrefix("");jest.restoreAllMocks();await Promise.all(Object.values(mongoose.connection.collections).map(col=>col.deleteMany({})));});
afterAll(async()=>{await mongoose.disconnect();await mongo.stop();});
test("multiple ordinary notifications coexist and concurrent keyed notifications create one record",async()=>{
 await Promise.all(Array.from({length:5},(_,i)=>notify({recipient:b.id,type:"message",title:"Notification",message:`Message ${i}`})));
 expect(await Notification.countDocuments()).toBe(5);
 await Promise.all(Array.from({length:10},()=>notify({recipient:b.id,type:"event",title:"Reminder",message:"Event reminder",metadata:{reminderKey:"event-unique"}})));
 expect(await Notification.countDocuments({"metadata.reminderKey":"event-unique"})).toBe(1);
});
test("a second valid message and subsequent mentorship remain successful",async()=>{
 for(let i=0;i<2;i++)expect((await api("post","/messages").send({recipientId:b.id,body:`Valid message ${i}`})).status).toBe(201);
 const profile=await Alumni.findOne({user:b.id});const response=await api("post","/mentorship").send({topic:"Guidance",message:"Help me",mentorId:profile.id});expect(response.status).toBe(201);expect(await Notification.countDocuments({recipient:b.id})).toBe(3);
});
test("secondary notification failure cannot falsely fail a saved message or mentorship",async()=>{
 jest.spyOn(Notification,"create").mockRejectedValue(Object.assign(new Error("Sensitive body must not be logged"),{code:"QA_NOTIFICATION_FAILURE"}));jest.spyOn(console,"error").mockImplementation(()=>{});
 expect((await api("post","/messages").send({recipientId:b.id,body:"Primary write survives"})).status).toBe(201);expect(await Message.countDocuments()).toBe(1);
 const profile=await Alumni.findOne({user:b.id});expect((await api("post","/mentorship").send({topic:"Guidance",message:"Help",mentorId:profile.id})).status).toBe(201);
 await User.updateOne({_id:c.id},{role:"super_admin"});
 const referral=await api("post","/referrals").send({targetRole:"Engineer",company:"QA Employer",reason:"Relevant skills"});expect(referral.status).toBe(201);
 expect((await api("patch",`/referrals/${referral.body.data.referral._id}`,c).send({assignedTo:b.id})).status).toBe(200);
 expect(String((await require("../src/models/referralModel").findById(referral.body.data.referral._id)).assignedTo)).toBe(b.id);
 expect(JSON.stringify(console.error.mock.calls)).not.toContain("Sensitive body");
});
test.each(["", "   ", "x".repeat(2001), 5, {}, []])("invalid message body returns 400 without writes: %p",async(body)=>{
 expect((await api("post","/messages").send({recipientId:b.id,body})).status).toBe(400);expect(await Message.countDocuments()).toBe(0);expect((await api("get","/messages")).status).toBe(200);
});
test.each(["/messages/not-an-id","/messages?page=0","/messages?page=NaN","/messages?limit=101","/messages?page=1.2"])("invalid identifier/pagination is controlled: %s",async(url)=>expect((await api("get",url)).status).toBe(400));
test("message length 2000 is accepted; unrelated participant cannot read history",async()=>{
 const result=await api("post","/messages").send({recipientId:b.id,body:"x".repeat(2000)});expect(result.status).toBe(201);expect((await api("get",`/messages/${result.body.data.conversationId}`,c)).status).toBe(404);
});
test("ML uses an 8s timeout and returns 503 for upstream errors/HTML/unreachable service",async()=>{
 const calls=[];jest.spyOn(AbortSignal,"timeout").mockImplementation(ms=>{calls.push(ms);return new AbortController().signal;});jest.spyOn(global,"fetch").mockRejectedValue(new Error("Connection refused"));
 expect((await api("post","/ml/recommendations").send({mode:"network"})).status).toBe(503);expect(calls).toContain(8000);
 global.fetch.mockResolvedValue({ok:false,status:500});expect((await api("post","/ml/recommendations").send({mode:"mentor"})).status).toBe(503);
 global.fetch.mockResolvedValue({ok:true,json:async()=>{throw new Error("HTML instead of JSON");}});expect((await api("post","/ml/recommendations").send({mode:"referral"})).status).toBe(503);
});
test("cached recommendations revalidate privacy, approval and contact data",async()=>{
 const profile=await Alumni.findOne({user:b.id});jest.spyOn(global,"fetch").mockResolvedValue({ok:true,json:async()=>({status:"success",data:{recommendations:[{id:profile.id,userId:b.id,score:.9,email:"LEAK",mobileNumber:"LEAK",firstName:"Old"}]}})});
 let response=await api("post","/ml/recommendations").send({mode:"network"});expect(response.body.data.recommendations).toHaveLength(1);expect(JSON.stringify(response.body)).not.toContain("LEAK");
 await User.updateOne({_id:b.id},{"privacy.profileVisibility":"private"});response=await api("post","/ml/recommendations").send({mode:"network"});expect(response.body.cached).toBe(true);expect(response.body.data.recommendations).toHaveLength(0);
 await User.updateOne({_id:b.id},{"privacy.profileVisibility":"members",isActive:false});response=await api("post","/ml/recommendations").send({mode:"network"});expect(response.body.data.recommendations).toHaveLength(0);
});
test("privacy changes and blocking invalidate recommendation caches",async()=>{
 cache.set(`recommendations:${a.id}:default:network:10`,{});await api("patch","/profile/privacy").send({showEmail:false});expect(cache.get(`recommendations:${a.id}:default:network:10`)).toBeNull();
 cache.set(`recommendations:${a.id}:default:network:10`,{});await api("post",`/profile/blocked/${b.id}`);expect(cache.get(`recommendations:${a.id}:default:network:10`)).toBeNull();
});
test("network-only candidates require an accepted relationship and contact fields stay hidden",async()=>{
 await User.updateOne({_id:b.id},{"privacy.profileVisibility":"network"});expect((await policy.visibleProfiles(a)).some(p=>String(p.user)===b.id)).toBe(false);
 await Connection.create({requester:a.id,recipient:b.id,status:"accepted"});const profiles=await policy.visibleProfiles(a);const candidate=profiles.find(p=>String(p.user)===b.id);expect(candidate).toBeTruthy();expect(candidate.email).toBe("");expect(candidate.mobileNumber).toBeUndefined();
});
test.each([{"privacy.profileVisibility":"private"},{isActive:false},{isApproved:false,approvalStatus:"pending"},{approvalStatus:"rejected"},{blockedUsers:[]}])("discovery endpoints exclude ineligible candidate: %p",async(fields)=>{
 if(fields.blockedUsers)fields.blockedUsers=[a._id];await User.updateOne({_id:b.id},fields);
 for(const url of ["/alumni","/alumniList","/connections","/network/graph","/mentorship/mentors"]){const response=await api("get",url);expect(response.status).toBe(200);expect(JSON.stringify(response.body)).not.toContain(b.id);}
 const response=await api("post","/assistant/query").send({query:"Software Engineer"});expect(JSON.stringify(response.body)).not.toContain(b.id);
});
test("connection and mentorship opt-outs block discovery and direct-ID actions",async()=>{
 await User.updateOne({_id:b.id},{"privacy.allowConnections":false,"privacy.mentorshipAvailable":false});const profile=await Alumni.findOne({user:b.id});
 expect((await api("post",`/connections/${profile.id}`)).status).toBe(404);expect((await api("post","/mentorship").send({mentorId:profile.id,topic:"Help",message:"Help"})).status).toBe(404);
 expect((await api("post","/assistant/action").send({action:"connect",targetProfileId:profile.id,confirmed:true})).status).toBe(404);
});
test("notification migration dry run, apply and rerun preserve all history",async()=>{
 const collection=mongoose.connection.collection("notifications");await collection.dropIndex("recipient_reminder_key_unique");await collection.createIndex({recipient:1,"metadata.reminderKey":1},{unique:true,sparse:true,name:"recipient_1_metadata.reminderKey_1"});
 const row={recipient:a._id,type:"message",title:"Historic",message:"Preserve",createdAt:new Date("2020-01-01"),updatedAt:new Date("2020-01-02"),readAt:new Date("2020-01-03")};await collection.insertOne(row);const before=await collection.findOne({_id:row._id});
 await expect(indexes.ensureNotificationIndexes()).rejects.toThrow("migration required");const dry=await indexes.migrateNotificationIndex();expect(dry.apply).toBe(false);expect((await collection.listIndexes().toArray()).some(i=>i.name==="recipient_1_metadata.reminderKey_1")).toBe(true);
 expect((await indexes.migrateNotificationIndex(true)).migrated).toBe(true);expect(await collection.findOne({_id:row._id})).toEqual(before);expect((await indexes.migrateNotificationIndex(true)).blocked).toBe(false);
 await notify({recipient:a.id,type:"message",title:"New",message:"Works"});expect(await Notification.countDocuments()).toBe(2);
});
test("migration refuses invalid and duplicate keys without deleting documents or indexes",async()=>{
 const collection=mongoose.connection.collection("notifications");await collection.dropIndex("recipient_reminder_key_unique");await collection.insertMany([{recipient:a._id,metadata:{reminderKey:"duplicate"}},{recipient:a._id,metadata:{reminderKey:"duplicate"}},{recipient:a._id,metadata:{reminderKey:7}}]);
 const report=await indexes.migrateNotificationIndex(true);expect(report.blocked).toBe(true);expect(report.duplicates).toHaveLength(1);expect(report.invalidRecordIds).toHaveLength(1);expect(await collection.countDocuments()).toBe(3);
 await collection.deleteMany({});await indexes.ensureNotificationIndexes();
});

test("concurrent keyed notification claims schedule email and emit realtime exactly once",async()=>{
 await User.updateOne({_id:b.id},{"notificationPreferences.email":true,"notificationPreferences.digest":"instant","notificationPreferences.quietHoursStart":"00:00","notificationPreferences.quietHoursEnd":"00:00"});
 const email=jest.spyOn(require("../src/utils/emailHelper"),"sendNotificationEmail").mockResolvedValue(undefined);
 const realtime=jest.spyOn(require("../src/services/realtimeService"),"emitToUser").mockImplementation(()=>{});
 const queue=jest.spyOn(require("../src/services/jobQueue"),"enqueue").mockImplementation((name,fn)=>fn());
 await Promise.all(Array.from({length:8},()=>notify({recipient:b.id,type:"event",title:"Only once",message:"Only once",metadata:{reminderKey:"unique-send"}})));
 expect(await Notification.countDocuments()).toBe(1);expect(email).toHaveBeenCalledTimes(1);expect(realtime).toHaveBeenCalledTimes(1);expect(queue).toHaveBeenCalledTimes(1);
});
test("email and realtime failures remain secondary and logs contain no content",async()=>{
 await User.updateOne({_id:b.id},{"notificationPreferences.email":true,"notificationPreferences.digest":"instant","notificationPreferences.quietHoursStart":"00:00","notificationPreferences.quietHoursEnd":"00:00"});
 jest.spyOn(require("../src/utils/emailHelper"),"sendNotificationEmail").mockRejectedValue(new Error("SECRET-BODY"));
 jest.spyOn(require("../src/services/realtimeService"),"emitToUser").mockImplementation(()=>{throw new Error("SECRET-BODY");});
 jest.spyOn(require("../src/services/jobQueue"),"enqueue").mockImplementation((name,fn)=>fn());jest.spyOn(console,"error").mockImplementation(()=>{});
 expect((await api("post","/messages").send({recipientId:b.id,body:"SECRET-BODY"})).status).toBe(201);expect(await Message.countDocuments()).toBe(1);expect(JSON.stringify(console.error.mock.calls)).not.toContain("SECRET-BODY");
});

test("orphan alumni profiles never appear in discovery responses",async()=>{
 const orphan=await Alumni.create({user:new mongoose.Types.ObjectId(),email:"orphan@qa.invalid",firstName:"Orphan",lastName:"QA",startYear:2015,endYear:2020,degree:"BE",branch:"CSE",rollNumber:"ORPHAN",designation:"Engineer",domain:"Software",verified:true});
 for(const url of ["/alumni","/alumniList","/connections","/network/graph","/mentorship/mentors"]){const response=await api("get",url);expect(response.status).toBe(200);expect(JSON.stringify(response.body)).not.toContain(orphan.id);}
});

test("primary message storage failure returns generic 500 and remains controlled",async()=>{
 jest.spyOn(Message,"create").mockRejectedValue(new Error("SECRET database failure"));jest.spyOn(console,"error").mockImplementation(()=>{});
 const response=await api("post","/messages").send({recipientId:b.id,body:"Primary action"});expect(response.status).toBe(500);expect(JSON.stringify(response.body)).not.toContain("SECRET");expect(await Message.countDocuments()).toBe(0);expect((await api("get","/messages")).status).toBe(200);
});
