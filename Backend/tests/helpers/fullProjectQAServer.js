// QA-only fixture server. Real API, realtime server, ML process and local SMTP.
process.env.NODE_ENV="test";process.env.JWT_SECRET="full-project-disposable-qa-only";process.env.EMAIL_USER="qa@localhost.invalid";process.env.EMAIL_PASS="local-smtp-capture";process.env.ML_SERVICE_URL="http://127.0.0.1:5001";process.env.PLACEMENT_JOB_EMAIL_ENABLED="false";
const mongoose=require("mongoose"),{MongoMemoryServer}=require("mongodb-memory-server"),nodemailer=require("nodemailer"),http=require("node:http"),path=require("node:path"),{spawn}=require("node:child_process");
const {startSmtpCapture}=require("./smtpCapture");
(async()=>{
 const smtp=await startSmtpCapture(),real=nodemailer.createTransport.bind(nodemailer);nodemailer.createTransport=()=>real({host:"127.0.0.1",port:smtp.port,ignoreTLS:true});
 const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();
 const User=require("../../src/models/user"),Alumni=require("../../src/models/alumniModel"),Department=require("../../src/models/departmentModel");await User.init();await Department.init();
 const cse=await Department.create({code:"CSE",name:"Computer Science"}),ece=await Department.create({code:"ECE",name:"Electronics"});
 const create=(name,email,role,department,extra={})=>User.create({name,email,role,department,password:"StrongPass123!",isApproved:true,approvalStatus:"approved",...extra});
 await create("Super Admin","super@example.com","super_admin");await create("CSE Admin","cadmin@example.com","admin",cse.id);await create("ECE Admin","eadmin@example.com","admin",ece.id);
 for(const [name,email,department,extra] of [["John","john@example.com",cse.id,{}],["Jane","jane@example.com",ece.id,{}],["Omar","omar@example.com",cse.id,{}],["Private","private@example.com",ece.id,{privacy:{profileVisibility:"private",showEmail:false,showPhone:false,allowMessages:"none",allowConnections:false}}],["Pending","pending@example.com",ece.id,{isApproved:false,approvalStatus:"pending"}]]){
  const user=await create(name,email,"alumni",department,extra);await Alumni.create({user:user.id,department,email,firstName:name,lastName:"QA",startYear:2016,endYear:name==="John"?2024:2020,degree:"BE",branch:department===cse.id?"CSE":"ECE",rollNumber:email,designation:name==="John"?"Engineer":"Senior Engineer",domain:"Software",company:"QA Company",skills:["ReactJS","Node","MongoDB"],bio:"Software engineering and career guidance",location:"Bengaluru",verified:true,mobileNumber:9876543210});
 }
 const mlDirectory=path.resolve(__dirname,"../../../ML-Service");const ml=spawn(path.join(mlDirectory,".venv/bin/python"),["app.py"],{cwd:mlDirectory,env:{...process.env,MONGO_URI:mongo.getUri(),DB_NAME:mongoose.connection.name,HOST:"127.0.0.1",PORT:"5001"},stdio:"inherit"});
 const app=require("../../app"),server=http.createServer(app),io=require("../../src/realtime/socketServer")(server);
 app.get("/__test/state",async(req,res)=>res.json({users:await User.find().lean(),profiles:await Alumni.find().lean(),departments:await Department.find().lean(),emails:smtp.messages}));
 server.listen(4000,"127.0.0.1",()=>console.log("Full project QA backend ready"));
 const shutdown=async()=>{ml.kill("SIGTERM");io.close();server.close();await mongoose.disconnect();await mongo.stop();await smtp.close();process.exit(0);};process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
})().catch(error=>{console.error(error);process.exit(1);});
