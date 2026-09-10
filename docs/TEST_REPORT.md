# Verification and test report

## 1. Verification snapshot

Measured locally on **26 July 2026**.

| Area | Command | Result |
|---|---|---:|
| Backend unit/security/workflow | `cd Backend && npm test` | 22 passed |
| Backend integration | `npm run test:integration` | 6 passed |
| Frontend lint | `cd Frontend && npm run lint` | Passed, zero warnings |
| Frontend production build | `npm run build` | Passed |
| Browser workflows | `npm run test:e2e` | 11 passed |
| ML unit/evaluation | `cd ML-Service && .venv/bin/python -m unittest discover -s tests -v` | 9 passed |
| Git whitespace validation | `git diff --check` | Passed |

## 2. Backend unit coverage

- bcrypt hashing and verification
- legacy plaintext verification for migration
- safe serializers
- role middleware and validation responses
- assistant intent parsing and evidence scoring
- mentorship scheduling, ratings, goals, milestones and notes
- referral history and interview pipeline states
- event capacity, waitlist and attendance states
- message size validation
- recommendation cache invalidation
- privacy-safe defaults and enum validation
- notification preference defaults
- authentication-session validation
- reset credentials excluded by default

## 3. Integration coverage

The isolated MongoDB integration suite verifies:

- alumni registration persistence;
- duplicate/invalid registration handling;
- login and HTTP-only session behavior;
- `/auth/me` restoration;
- approval enforcement;
- role authorization;
- protected job mutation behavior.

## 4. ML coverage

- normalized skill aliases;
- Jaccard skill matching;
- hybrid ranking relevance;
- hidden feedback behavior;
- bounded positive adjustment;
- result limits;
- metric bounds;
- baseline ranking;
- baseline/hybrid comparison.

## 5. Browser coverage

- public alumni-only registration;
- protected-route redirection;
- successful login and dashboard navigation;
- privacy-safe password recovery;
- direct-message creation;
- recommendation explanations and feedback;
- grounded assistant result evidence;
- network graph rendering;
- evaluation-lab metrics;
- privacy preference persistence;
- final presentation mode.

## 6. Manual acceptance checklist

### Authentication

- [ ] Verify OTP and register an alumni account.
- [ ] Confirm login is blocked until admin approval.
- [ ] Approve the account and sign in.
- [ ] Refresh and confirm session restoration.
- [ ] Open Account Security and inspect current session.
- [ ] Change password and confirm other sessions are revoked.
- [ ] Request/reset password and confirm the link expires after 15 minutes.

### Privacy and discovery

- [ ] Hide profile and confirm another user cannot find it.
- [ ] Hide email/phone and confirm redaction.
- [ ] Disable messages/connections and confirm backend rejection.
- [ ] Block a user and confirm directory, graph and communication restrictions.
- [ ] Export personal JSON and confirm credentials are absent.

### Engagement

- [ ] Send and accept a connection request.
- [ ] Exchange live messages between two sessions.
- [ ] Request, accept, schedule and complete mentorship.
- [ ] Add/complete a milestone and submit feedback.
- [ ] Move a referral through every pipeline stage.
- [ ] Register until an event is full and verify waitlisting.

### Intelligence

- [ ] Run the three example assistant queries.
- [ ] Attempt an assistant connection action and verify confirmation.
- [ ] Inspect direct/discovery graph links, mutuals and shortest path.
- [ ] Compare three recommendation modes and submit feedback.
- [ ] Run the offline benchmark and match documented values.

### Administration and release

- [ ] Inspect live engagement analytics.
- [ ] Export engagement CSV.
- [ ] Verify `/health` and `/api-docs`.
- [ ] Build frontend and check manifest/service worker in `dist`.
- [ ] Install the production PWA and test offline fallback.
- [ ] Run the `/demo` presentation sequence.

## 7. Evidence policy

Retain terminal output, screenshots and benchmark JSON with the submission.
Do not fabricate load, accuracy, user-adoption or security-test results. Update
this report whenever code changes alter measured totals.

## 8. Known gaps

- No independent penetration test
- No institutional-scale load test
- Small four-fixture recommendation benchmark
- No automated Lighthouse/Axe gate yet
- Email delivery requires configured external credentials
