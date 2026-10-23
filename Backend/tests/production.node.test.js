const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateProduction } = require('../src/config/production');
const valid = () => ({ NODE_ENV:'production', JWT_SECRET:'a'.repeat(48), CSRF_SECRET:'b'.repeat(48), FRONTEND_URL:'https://alumni.example.org', PUBLIC_API_URL:'https://alumni.example.org', CORS_ORIGIN:'https://alumni.example.org', MONGODB_URI:'mongodb://app:password@mongodb:27017/alumniDB', ML_SERVICE_URL:'http://ml-service:5001', TRUST_PROXY:'172.30.0.0/24' });
test('complete production configuration passes',()=>assert.doesNotThrow(()=>validateProduction(valid())));
for (const field of ['JWT_SECRET','CSRF_SECRET','FRONTEND_URL','PUBLIC_API_URL','MONGODB_URI','TRUST_PROXY','ML_SERVICE_URL']) test(`missing ${field} refuses startup`,()=>{const env=valid();delete env[field];assert.throws(()=>validateProduction(env));});
for (const changes of [{FRONTEND_URL:'http://alumni.example.org'},{FRONTEND_URL:'https://localhost'},{CORS_ORIGIN:'*'},{TRUST_PROXY:'true'},{TRUST_PROXY:'1'},{CSRF_SECRET:'a'.repeat(48)},{PLACEMENT_JOB_EMAIL_ENABLED:'true'},{SMTP_HOST:'smtp.example.org',SMTP_REQUIRE_TLS:'false'},{SMTP_HOST:'smtp.example.org',SMTP_REQUIRE_TLS:'true',SMTP_PORT:'invalid'}]) test(`unsafe production config rejects ${JSON.stringify(changes)}`,()=>assert.throws(()=>validateProduction({...valid(),...changes})));
