if(process.env.QA_CONTAINER_FIXTURES!=='true')throw new Error('Disposable QA only');
const mongoose=require('mongoose'),crypto=require('node:crypto'),fs=require('node:fs');
(async()=>{await mongoose.connect(process.env.MONGODB_URI,{autoIndex:false});try{
 const db=mongoose.connection.db;
 if(process.argv.includes('--write-upload'))fs.writeFileSync('/app/public/uploads/qa-recovery.txt','CMRunite recovery fixture\n');
 const normalize=value=>Array.isArray(value)?value.map(normalize):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,normalize(value[key])])):value;
 const result={};for(const item of (await db.listCollections().toArray()).sort((a,b)=>a.name.localeCompare(b.name))){
 const rows=await db.collection(item.name).find().sort({_id:1}).toArray();result[item.name]={count:rows.length,sha256:crypto.createHash('sha256').update(JSON.stringify(normalize(JSON.parse(JSON.stringify(rows))))).digest('hex')};
 }
 result.upload=crypto.createHash('sha256').update(fs.readFileSync('/app/public/uploads/qa-recovery.txt')).digest('hex');console.log(JSON.stringify(result));
}finally{await mongoose.disconnect();}})().catch(error=>{console.error(error.name);process.exit(1);});
