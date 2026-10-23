// Run only against the disposable Compose QA database with application writes stopped.
const mongoose=require("mongoose"),assert=require("node:assert/strict");
(async()=>{await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false,autoCreate:false});
 try {const collection=mongoose.connection.collection("notifications");if(await collection.countDocuments({}))throw new Error("QA probe requires an empty notification collection");
 await collection.dropIndex("recipient_reminder_key_unique");await collection.createIndex({recipient:1,"metadata.reminderKey":1},{unique:true,sparse:true,name:"recipient_1_metadata.reminderKey_1"});
 const row={recipient:new mongoose.Types.ObjectId(),type:"system",title:"QA historical record",message:"Preserve",createdAt:new Date("2020-01-01"),updatedAt:new Date("2020-01-02"),readAt:new Date("2020-01-03")};await collection.insertOne(row);const before=await collection.findOne({_id:row._id});
 const migration=require("../../src/services/notificationIndexes");assert.equal((await migration.migrateNotificationIndex()).apply,false);await assert.rejects(migration.ensureNotificationIndexes(),/migration required/);assert.equal((await migration.migrateNotificationIndex(true)).migrated,true);assert.deepEqual(await collection.findOne({_id:row._id}),before);await migration.migrateNotificationIndex(true);console.log("MongoDB 7 index migration, history preservation, guard and rerun: PASS");}
 finally{await mongoose.disconnect();}})().catch(error=>{console.error(error.name,error.message);process.exit(1);});
