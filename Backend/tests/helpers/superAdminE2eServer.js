// Live test server uses disposable MongoDB and loopback SMTP only.
process.env.NODE_ENV="test";process.env.JWT_SECRET="super-admin-browser-only";process.env.EMAIL_USER="test@localhost.invalid";process.env.EMAIL_PASS="capture-only";
const mongoose=require("mongoose");const {MongoMemoryServer}=require("mongodb-memory-server");const nodemailer=require("nodemailer");const {startSmtpCapture}=require("./smtpCapture");
const User=require("../../src/models/user"),Alumni=require("../../src/models/alumniModel"),Department=require("../../src/models/departmentModel"),Event=require("../../src/models/eventModel");
(async()=>{
 const smtp=await startSmtpCapture(), real=nodemailer.createTransport.bind(nodemailer);nodemailer.createTransport=()=>real({host:"127.0.0.1",port:smtp.port,ignoreTLS:true});
 const mongo=await MongoMemoryServer.create();await mongoose.connect(mongo.getUri());
  await require("../../src/services/notificationIndexes").ensureNotificationIndexes();await User.init();await Department.init();
 const cse=await Department.create({code:"CSE",name:"Computer Science"}),ece=await Department.create({code:"ECE",name:"Electronics"});
 const create=(name,email,role,department,extra={})=>User.create({name,email,password:"StrongPass123!",role,department,isApproved:true,approvalStatus:"approved",...extra});
 const root=await create("Super Admin","super@example.com","super_admin");await create("CSE Admin","cadmin@example.com","admin",cse.id);await create("ECE Admin","eadmin@example.com","admin",ece.id);
 for(const [name,email,department,pending] of [["CSE Alumni","cse@example.com",cse.id,false],["ECE Alumni","ece@example.com",ece.id,false],["Unassigned Alumni","unassigned@example.com",null,false],["CSE Pending","cpending@example.com",cse.id,true],["ECE Pending","epending@example.com",ece.id,true]]){
  const user=await create(name,email,"alumni",department,{isApproved:!pending,approvalStatus:pending?"pending":"approved"});
  await Alumni.create({user:user.id,department,email,firstName:name,lastName:"Test",startYear:2020,endYear:2024,degree:"BE",branch:department===ece.id?"ECE":"CSE",rollNumber:email,designation:"Engineer",domain:"Software"});
 }
 for(const [title,department,scope,eligibility] of [["CSE private event",cse.id,"department","department"],["CSE open event",cse.id,"department","all"],["ECE private event",ece.id,"department","department"],["Platform event",null,"platform","all"],["Unassigned event",null,"unassigned","department"]]) await Event.create({title,department,scope,eligibility,createdBy:root.id,description:"Testing",location:"Campus",date:"2099-01-01"});
 const app=require("../../app");app.get("/__test/state",async(req,res)=>res.json({users:await User.find().lean(),profiles:await Alumni.find().lean(),emails:smtp.messages,departments:await Department.find().lean()}));
 const server=app.listen(4000,"127.0.0.1",()=>console.log("Super Admin browser backend ready"));
 const shutdown=async()=>{server.close();await mongoose.disconnect();await mongo.stop();await smtp.close();process.exit(0);};process.on("SIGTERM",shutdown);process.on("SIGINT",shutdown);
})().catch(error=>{console.error(error);process.exit(1);});
