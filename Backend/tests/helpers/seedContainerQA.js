// Explicit test-only fixtures, never imported by application startup.
if(process.env.QA_CONTAINER_FIXTURES!=="true")throw new Error("Set QA_CONTAINER_FIXTURES=true only for a disposable Compose database");
const mongoose=require("mongoose");
(async()=>{await mongoose.connect(process.env.MONGODB_URI);try{
 const User=require("../../src/models/user"),Alumni=require("../../src/models/alumniModel"),Department=require("../../src/models/departmentModel");
 if(await User.exists({email:{$nin:["containeradmin@qa.invalid","containeralumni@qa.invalid"]}}))throw new Error("Refusing a database containing non-QA accounts");
 let department=await Department.findOne({code:"CSE"});if(!department)department=await Department.create({code:"CSE",name:"Computer Science"});
 for(const[name,role]of [["containeradmin","super_admin"],["containeralumni","alumni"]]){
  if(await User.exists({email:name+"@qa.invalid"}))continue;
  const user=await User.create({name,email:name+"@qa.invalid",password:"StrongPass123!",role,department:role==="alumni"?department.id:null});
  if(role==="alumni")await Alumni.create({user:user.id,department:department.id,email:user.email,firstName:"Container",lastName:"Alumni",startYear:2020,endYear:2024,degree:"BE",branch:"CSE",rollNumber:"DOCKER-QA",designation:"Engineer",domain:"Software",verified:true});
 }
 console.log("Isolated container fixtures ready");
}finally{await mongoose.disconnect();}})().catch(error=>{console.error(error.message);process.exit(1);});
