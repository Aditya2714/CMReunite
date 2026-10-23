const {test}=require('node:test'),assert=require('node:assert/strict'),{spawn}=require('node:child_process');
const {startSmtpCapture}=require('./helpers/smtpCapture');
test('configured SMTP delivers approval/reset/notification emails using the public frontend URL',async()=>{
 const smtp=await startSmtpCapture();try{
 const code=`const mail=require('./src/utils/emailHelper');(async()=>{await mail.sendApprovalEmail('mail@qa.invalid','<Test>');await mail.sendPasswordResetEmail('mail@qa.invalid','Test','a'.repeat(64));await mail.sendNotificationEmail('mail@qa.invalid','Verification','Local SMTP test','/login');})().catch(()=>process.exit(1));`;
 const child=spawn(process.execPath,['-e',code],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,NODE_ENV:'test',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtp.port),SMTP_REQUIRE_TLS:'false',SMTP_SECURE:'false',EMAIL_USER:'sender@qa.invalid',SMTP_PASSWORD:'',EMAIL_PASS:'',FRONTEND_URL:'https://alumni.qa.invalid'},stdio:'ignore'});
 const exit=await new Promise(resolve=>child.once('exit',resolve));assert.equal(exit,0);assert.equal(smtp.messages.length,3);
 const decoded=smtp.messages.join('\n').replace(/=\r\n/g,'').replace(/=([a-f0-9]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 assert.match(decoded,/https:\/\/alumni.qa.invalid\/login/);assert.match(decoded,/https:\/\/alumni.qa.invalid\/reset-password\?token=/);assert.doesNotMatch(decoded,/http:\/\/localhost/);assert.match(decoded,/&lt;Test&gt;/);
 }finally{await smtp.close();}
});

test('operator email verification fails clearly when email is not configured',async()=>{
 const child=spawn(process.execPath,['scripts/verifyEmail.js','mail@qa.invalid'],{cwd:require('node:path').resolve(__dirname,'..'),env:{...process.env,NODE_ENV:'test',EMAIL_USER:'',EMAIL_PASS:'',SMTP_HOST:'',SMTP_PASSWORD:''},stdio:'ignore'});
 assert.equal(await new Promise(resolve=>child.once('exit',resolve)),1);
});
