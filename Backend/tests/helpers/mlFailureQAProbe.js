process.env.NODE_ENV="test";process.env.JWT_SECRET="ml-http-failure-tests";
const mongoose=require("mongoose"),{MongoMemoryServer}=require("mongodb-memory-server"),jwt=require("jsonwebtoken");
(async()=>{
 const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());const User=require("../../src/models/user"),Alumni=require("../../src/models/alumniModel");const user=await User.create({email:"ml-probe@qa.invalid",password:"StrongPass123!",role:"alumni"});await Alumni.create({user:user.id,email:user.email,firstName:"ML",lastName:"Probe",startYear:2020,endYear:2024,degree:"BE",branch:"CSE",rollNumber:"ML",designation:"Engineer",domain:"Software"});
 const app=require("../../app"),server=app.listen(0,"127.0.0.1");await new Promise(resolve=>server.once("listening",resolve));
 try { const started=Date.now(),response=await fetch(`http://127.0.0.1:${server.address().port}/ml/recommendations`,{method:"POST",headers:{Authorization:`Bearer ${jwt.sign({id:user.id,av:0},process.env.JWT_SECRET)}`,"Content-Type":"application/json"},body:JSON.stringify({mode:"network"}),signal:AbortSignal.timeout(12000)});const elapsed=Date.now()-started;console.log(JSON.stringify({baseURL:process.env.ML_SERVICE_URL,status:response.status,elapsedMs:elapsed,body:await response.json()}));if(response.status!==503||elapsed>10000)process.exitCode=1; }
 finally {server.closeAllConnections();server.close();await mongoose.disconnect();await mongo.stop();}
})().catch(error=>{console.error(error.name);process.exit(1);});
