# Security and privacy analysis

## 1. Security objectives

1. Protect credentials and authentication sessions.
2. Prevent unauthorized role or resource access.
3. Minimize disclosure of personal alumni data.
4. Validate and bound untrusted input and uploads.
5. Preserve traceability without logging secrets.
6. Require user confirmation before assistant-initiated mutations.

## 2. Threat model

| Threat | Implemented mitigation |
|---|---|
| Password database disclosure | bcrypt cost-based hashes; passwords selected only explicitly |
| Account enumeration | generic forgot-password response |
| Reset token database disclosure | only SHA-256 token hashes stored; 15-minute expiry; single-use |
| Stolen/abandoned session | server-side session record, expiry, per-device revocation, logout-all |
| JWT theft through frontend JavaScript | HTTP-only cookie |
| Cross-origin abuse | explicit CORS allow-list and credential policy |
| Brute force | rate limiting on login, registration, OTP and password endpoints |
| Privilege escalation | centralized authentication, role middleware and ownership checks |
| IDOR | resource queries include current-user participation or role checks |
| Personal data exposure | profile visibility, contact redaction, messaging/connection controls and blocking |
| XSS/content injection | React escaping, bounded plain-text fields and security headers |
| Malicious uploads | file size and MIME/extension restrictions; bounded CSV import |
| Assistant mutation without consent | preview/confirmation protocol plus server-side revalidation |
| Duplicate reminders/actions | unique reminder keys and relationship duplicate checks |

## 3. Authentication design

- `User.password` is excluded from normal queries.
- Mongoose pre-save middleware hashes new or changed passwords using bcrypt.
- Login creates a JWT containing a random `jti` and a corresponding
  `AuthSession`.
- Protected middleware validates JWT signature, user existence, active session
  and session expiry.
- Legacy JWTs without a `jti` remain valid only until their short JWT expiry,
  allowing safe migration.
- Logout revokes the matching session and clears even invalid/expired cookies.
- Changing a password revokes every other session.
- Resetting a password revokes every session.

## 4. Authorization design

- Public registration cannot create administrator accounts.
- Admin/college features use server-side role checks; hiding a frontend route is
  never considered authorization.
- Mentorship, referral, connection and message updates verify participants or
  owners.
- Conversation reads require current-user participation.
- Session revocation queries include the current user, preventing cross-account
  revocation.

## 5. Privacy design

Users control:

- profile discovery by members, accepted network only, or nobody;
- email and phone exposure;
- messages from members, connections only, or nobody;
- new connection requests;
- mentor availability;
- blocked users;
- personal-data JSON export.

These preferences are enforced in backend directory, graph, assistant, mentor,
connection and message paths. Client-side switches alone do not provide privacy.

## 6. Data handling

- Environment variables hold database, JWT and email secrets.
- Passwords and reset tokens never appear in serialized user DTOs.
- Personal-data export contains account/workflow data but not credentials.
- Request logs contain method, path, status, duration and request ID; they should
  not log request bodies.
- The ML service operates on profile attributes and returns explanations.

## 7. Residual risks and production recommendations

- Use a managed secret store and rotate `JWT_SECRET`.
- Use HTTPS everywhere and secure production cookies.
- Replace local uploads with private object storage and malware scanning.
- Replace the process-local queue/cache with Redis and a durable worker.
- Add CSRF tokens for sensitive same-site cookie mutations in a production
  multi-origin deployment.
- Add centralized audit-event storage for privileged mutations.
- Add dependency and container scanning to the release pipeline.
- Configure MongoDB encryption, backups, least-privilege credentials and network
  restrictions.
- Conduct an independent penetration test before processing real institutional data.

## 8. Privacy limitations

Data export is implemented, but automated permanent account deletion and
institution-specific retention policies require governance approval and are not
part of the current release.
