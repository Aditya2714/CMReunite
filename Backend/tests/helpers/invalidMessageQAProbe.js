// Isolated crash probe: disposable database, loopback HTTP, no production data.
process.env.NODE_ENV="test";process.env.JWT_SECRET="qa-invalid-input-only";
const mongoose=require("mongoose"),{MongoMemoryServer}=require("mongodb-memory-server"),jwt=require("jsonwebtoken");
(async()=>{
 const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();
 const User=require("../../src/models/user");const sender=await User.create({email:"sender@qa.invalid",password:"StrongPass123!",role:"alumni"}),recipient=await User.create({email:"recipient@qa.invalid",password:"StrongPass123!",role:"alumni",privacy:{allowMessages:"members"}});
 const app=require("../../app"),server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
 await require("../../src/models/notificationModel").init();
 const url=`http://127.0.0.1:${server.address().port}/messages`,token=jwt.sign({id:sender.id,av:0},process.env.JWT_SECRET);
 const cleanup=async()=>{server.closeAllConnections();server.close();await mongoose.disconnect();await mongo.stop();};
 if(process.env.QA_PROBE_MODE==="repeat-message") { const first=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({recipientId:recipient.id,body:"First valid QA message"})});console.log("FIRST_MESSAGE_STATUS",first.status); }
 try {const response=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify({recipientId:recipient.id,body:process.env.QA_PROBE_MODE==="repeat-message"?"Second valid QA message":"x".repeat(2001)}),signal:AbortSignal.timeout(5000)});console.log("INVALID_MESSAGE_HTTP_STATUS",response.status);const repeat=process.env.QA_PROBE_MODE==="repeat-message";const expected=repeat?201:400;if(response.status!==expected)throw new Error(`Expected ${expected}`);const messages=await mongoose.connection.collection("messages").countDocuments();if(messages!==(repeat?2:0))throw new Error("Unexpected primary write count");const alive=await fetch(url,{headers:{Authorization:`Bearer ${token}`}});if(alive.status!==200)throw new Error("Backend no longer healthy");console.log("VALIDATION_EXPECTATION","PASS");await cleanup();}catch(error){console.error("PROBE_REQUEST_FAILED",error.message);await cleanup();process.exitCode=2;}
})().catch(error=>{console.error(error);process.exit(3);});
