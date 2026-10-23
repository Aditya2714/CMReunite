# CMRunite Alumni Connect

CMRunite is a full-stack alumni engagement platform for alumni networking,
mentorship, jobs, referrals, events, communities, institutional administration,
real-time messaging, and ML-assisted profile recommendations.

## Final documentation

The submission-ready documentation package starts at
[`docs/README.md`](docs/README.md). It includes the master report, SRS,
architecture, database and data-flow diagrams, API guide, security/privacy
analysis, ML evaluation, verified test report, setup/deployment guide, user
manual, milestones, and demo/viva guide.

## Standout intelligent features

- **Grounded alumni assistant** (`/assistant`) interprets natural-language requests
  for mentors, referral contacts, companies, skills, batches, branches, and cities.
  Results come only from stored alumni profiles and display the matching evidence.
- **Interactive network graph** (`/network-graph`) visualizes accepted connections
  separately from discovery links based on shared companies and academic branches.
- **Recommendation evaluation lab** (`/model-evaluation`) compares skills-only,
  content-only, and adaptive hybrid ranking on version-controlled labelled fixtures.
- **Graph intelligence** adds company filtering, people search, zoom/pan controls,
  mutual-connection counts, and shortest accepted-connection paths.
- **Mentorship lifecycle** tracks a goal, expected outcome, scheduled sessions,
  milestones, shared progress notes, completion, rating, and feedback.
- **Referral pipeline** tracks requested, review, referred, interview, and final
  outcome stages with a timestamped status history.
- **Live engagement analytics** reports connection growth, mentorship completion,
  referral outcomes, registrations, attendance, messages, and account growth from MongoDB.
- **Privacy and trust centre** controls directory visibility, contact-field exposure,
  messaging, connection requests, mentoring availability, blocking, and personal-data export.
- **Smart notifications** add category and unread filters, channel/digest preferences,
  quiet hours, and automatic 48-hour event, mentorship, and referral reminders.
- **Assistant actions** preserve recent conversational context, open relevant workflows,
  and require explicit confirmation before sending a connection request.
- **Installable PWA** includes an application manifest, offline fallback, shell caching,
  reduced-motion behavior, and keyboard skip navigation.
- **Presentation mode** (`/demo`) provides a guided final-year-project narrative,
  architecture, evidence summary, and links into the live feature sequence.
- **Secure account management** (`/account-security`) provides strong-password
  changes, revocable device sessions, login history, logout-all, and privacy-safe
  password recovery using single-use SHA-256-hashed tokens that expire after 15 minutes.

## Services

- `Frontend`: React 18, Vite, Redux Toolkit, Tailwind CSS
- `Backend`: Express, MongoDB/Mongoose, JWT cookie authentication
- `ML-Service`: Flask, scikit-learn, NumPy, PyMongo
- Real-time transport: authenticated Socket.IO

## Local setup

### Backend

```bash
cd Backend
cp .env.sample .env
npm ci
npm test
npm run dev
```

Set `MONGODB_URI` and `JWT_SECRET` in `.env`. Mail credentials are optional until email delivery is enabled. The backend listens on port `4000` by default.

Existing databases created before the security milestone must be migrated once:

```bash
npm run migrate:credentials
```

This hashes legacy `User` passwords and removes duplicated credentials from
profile collections. Back up the database before running migrations.

### Frontend

```bash
cd Frontend
npm ci
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

The Vite development server runs on port `5173` and proxies API requests to the
backend. Set `VITE_API_URL` when the API is hosted separately.

### ML service

```bash
cd ML-Service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The recommendation service runs on port `5001`.

## Authentication flow

1. An alumni user verifies their email with an OTP.
2. Registration creates a pending alumni account with a hashed password.
3. An administrator approves or rejects the account.
4. Login issues a secure HTTP-only JWT cookie.
5. The frontend restores sessions through `GET /auth/me`.
6. Backend role and ownership checks protect sensitive operations.
7. `POST /auth/logout` clears the session cookie.

Public privileged registration is disabled. Server startup never creates or promotes an administrator. Use the explicit `setup:super-admin` operator command below.

## Verification commands

```bash
cd Backend && npm test
cd Frontend && npm run lint && npm run build
```

Database-backed integration tests are available through
`npm run test:integration`. Their first run downloads an isolated MongoDB binary.

## Docker Compose

Copy `.env.docker.example` to `.env`, replace every placeholder, then run:

```bash
docker compose up --build
```

The application is served at `http://localhost:8080`. MongoDB and uploads use
named Docker volumes. The frontend container proxies API requests to the backend.

## Operations

- Backend health: `GET /health`
- ML health: `GET http://localhost:5001/health` when running locally
- OpenAPI document: `GET /api-docs`
- Request tracing: every backend response includes `X-Request-Id`
- Logs: backend requests are emitted as structured JSON
- CI: `.github/workflows/ci.yml` runs tests, lint, builds, audits, and config validation
- Messaging: authenticated conversations are persisted in MongoDB and delivered live through Socket.IO
- Reports: administrators can export engagement metrics from `/admin/reports/export`

## Recommendation evaluation

The ML service provides network, mentor, and referral ranking modes. Every result
includes compatibility, signal scores, reasons, and a model version.

Run the unit suite:

```bash
cd ML-Service
.venv/bin/python -m unittest discover -s tests -v
```

Run offline labelled evaluation:

```bash
.venv/bin/python evaluate.py fixtures.json --mode mentor -k 5
```

A reviewed starter fixture is included:

```bash
.venv/bin/python evaluate.py fixtures/labelled_recommendations.json --mode mentor -k 1
```

The evaluator reports Precision@K, Recall@K, mean reciprocal rank, and NDCG@K.
Use `--compare` to generate the baseline comparison shown in the application:

```bash
.venv/bin/python evaluate.py fixtures/labelled_recommendations.json --mode mentor -k 1 --compare
```

## Placement-office job emails

Placement-office notifications are disabled by default. Alumni can post jobs
without mail credentials. To enable emails later, set these backend values (or
set them in the root `.env` when using Docker Compose):

```dotenv
PLACEMENT_JOB_EMAIL_ENABLED=true
PLACEMENT_OFFICE_EMAIL=placement@example.com
EMAIL_USER=your-sender-email
EMAIL_PASS=your-mail-authentication-credential
FRONTEND_URL=https://your-alumni-site.example.com
```

Restart the backend after changing configuration. Use a single placement-office
address and the real frontend URL. The existing mail transport uses Gmail.
Missing sender credentials, an invalid recipient, or a missing/invalid frontend
URL keep new notifications disabled while job posting remains available. The
job form displays availability and confirms whether an email was queued.

Only new jobs created while notifications are enabled and configured are queued.
Old jobs and jobs posted while disabled are not emailed retroactively. Editing
or deleting a job does not create another notification.

Delivery state and the original posting details are saved with the job. The
worker runs on startup, on a new post, and every 15 seconds. It makes at most
three attempts, with 30-second and 60-second retry delays. It recovers expired
worker claims after two minutes. `sent` means the SMTP server accepted the
message; it does not confirm recipient inbox delivery. The worker uses atomic
claims and a stable Message-ID. As with ordinary SMTP delivery, a process crash
after acceptance but before saving `sent` can cause a duplicate on recovery.

Internal delivery state is available in MongoDB as `placementNotification`
(status, attempts, sentAt, and lastErrorCode); ordinary job API responses omit
these operational details. Notification errors do not undo successful posts.

Run the complete live browser feature test with both services' dependencies
installed, Playwright Chromium available, and ports 4000 and 5173 free:

```bash
cd Frontend
npm run test:e2e:placement
```

The test starts the actual frontend and backend, a disposable MongoDB database,
and a loopback-only SMTP capture server. It uses no real mail credentials and
sends no email to real recipients. Database/SMTP tests, including retry limits,
restart recovery and concurrent workers, also run under `Backend/npm run test:integration`.

## Community Posts

Stories and job opportunities now share `/community-posts`, one Create Post
form and an All / Stories / Jobs feed. Post type determines the required fields
and is fixed after publishing. Authors can edit/delete their own posts. Only
new job opportunities can queue placement-office emails; stories and edits
never do. The existing disabled-by-default email configuration still applies.

The unified API is `/posts` (list/create), `/posts/:id` (read/update/delete), and
`/posts/settings` (mail availability). Old job and story API endpoints remain
compatibility adapters to this same storage and validation path. Jobs and
stories are Mongoose discriminators of one Post model in the `posts` collection;
job analytics and placement workers remain scoped to job posts.

On backend startup, existing `jobs` and `stories` records are imported before
the placement worker starts or the HTTP server listens. IDs, authors, dates and
notification state are preserved. Original source collections are retained.
Migration markers make reruns idempotent and prevent deleted imported posts
from reappearing or edited imports from being overwritten. A cross-source ID
collision stops startup with an explicit error rather than overwriting data.
Back up your database before the first upgraded startup. To run the migration
separately against the configured database:

```bash
cd Backend
npm run migrate:community-posts
```

Old `/jobs#job-ID` links redirect to `/community-posts?type=job#post-ID`;
`/alumni-stories` redirects to the Stories feed. New email links target the
unified feed directly. A direct link loads its post even if it is beyond the
first feed page. Disabled/legacy jobs are not emailed retroactively; previously
pending notifications retain their retry state and resume under the existing
worker rules. Notification snapshots retain the original posting details.

Run `npm run test:e2e:community` in Frontend for live create/filter/edit/delete,
permissions, old-link, pagination and migrated-data browser tests. The existing
`test:e2e:placement` and `test:e2e:rejection` scripts cover email and approval
regressions. Test-only servers use disposable MongoDB and loopback SMTP capture.

## Alumni career search

The Alumni Directory now combines company, current designation, career seniority,
graduation batch, branch, location and general keyword filters. Submit with
Search alumni; Clear filters resets the form. Filters and page are preserved in
the URL for reload/back navigation. Results are fetched 12 at a time from the
backend rather than filtering a fixed local list of 100 profiles. Synthetic
fallback people have been removed; load errors and empty results are explicit.

Career seniority is computed from the recorded current designation, independently
of graduation batch. Groups are Senior Professionals, Managers, Directors / Heads,
VP-level and Executives / Founders. Classification uses explicit title rules;
it does not verify corporate hierarchy or infer years of experience. VP matching
recognises Vice President, Vice-President, V.P., SVP and EVP variants. Senior and
executive VP variants have specific designation aliases too. CEO, CTO, CFO, COO,
CIO and CMO searches recognise the corresponding expanded titles. Other searches
are case-insensitive literal text. Director/head, manager/team lead, and
senior/Sr/lead/principal/staff titles are classified in that order after VP and
executive titles. Unrecognised titles remain visible under All. Support titles
such as Assistant to CEO are not promoted into the executive group.

Company and designation filters use current profile fields; historical employment
is neither used as a fallback nor mixed into current company/role matches.
Hidden contact emails are not searchable. Privacy visibility, accepted-connection
requirements for network-only accounts, mutual blocking and account eligibility
are applied before pagination and counts. Email/phone exposure follows existing
privacy preferences. Directory options are provided by
`GET /alumni/directory-options`; `GET /alumni` accepts the documented filters,
page and limit. Legacy calls default to 100 per page. The existing Manage Alumni
screen follows pagination so it does not silently lose later directory pages.
No schema migration is required for these computed filters.

Run `npm run test:e2e:directory` in Frontend for the real frontend/backend browser
flow. It starts disposable MongoDB with over 100 profiles, including title aliases,
blocked/private/network-only accounts and historical job fixtures. Backend
integration tests also validate privacy-safe counts, contact redaction, literal
regex characters, invalid query inputs and batch/seniority independence.


## Super Admin and department administration

Roles are `alumni`, `admin` (Department Admin), and `super_admin`. Legacy `college`
accounts have no administrative privileges until explicitly provisioned. Each
active department has at most one active admin, enforced by a partial unique
MongoDB index. The Super Admin dashboard displays every department and any vacancy.

Super Admin signs in using the Super Admin role and opens `/super-admin`. Its tabs
cover Dashboard, Department Admins, Departments, Analytics, Announcements, Audit
Log, and Unassigned Records. Links open global alumni management, approvals,
imports, events and mentorship oversight. In Manage Alumni, Super Admin can edit
an alumni record's department assignment. Other users cannot change roles or
departments through self-service profiles.

Admin creation displays a randomly generated temporary password once. Share it
securely; the new admin must change it under Account Security and sign in again.
No email credentials are needed. Reset password issues a replacement temporary
password. Deactivate an admin before replacing them or archiving their department.
Removal preserves the account and authored history. Reassignment revokes sessions
and changes future access while leaving existing event/announcement ownership
unchanged. Department codes are stable; names can change. Archival prevents new
registrations and administrative publishing in that department.

All management queries, approvals, imports, reports, events, announcements and
mentorship oversight enforce department boundaries on the server. Mentorship
oversight follows the requester's department. Alumni discovery, connections,
Community Posts and participant-led mentorship remain shared, including for
existing unassigned alumni. Alumni totals include only profiles linked to alumni
accounts; orphan profiles are excluded. Events belong to their owning department
regardless of attendee departments; platform and unassigned totals are separate.

Department announcements can target a graduation batch. Super Admin announcements
are platform-wide and target all departments and batches. Feed, attachment,
notification and email audiences use the same access rule. Announcement attachments
require an authenticated cookie or bearer token, including direct download URLs.
An announcement's audience is fixed after publication. Existing notification
history is preserved; content no longer in the viewer's audience is hidden.

Department events choose owning-department or all-department attendance. Super
Admin can also create platform events. Only events eligible for all departments
appear on the public upcoming list. Event ownership is immutable through event
editing. Ambiguous historical event ownership requires reviewed mapping or a
Super Admin assignment from the Unassigned Records queue.

### Explicit setup and production rollout

Implementation and automated tests use a disposable database. These commands
change the selected database and must be run deliberately by the operator.
Student access, MFA and scheduled announcements remain deferred.

1. Stop API servers/workers and pause writes. Back up MongoDB and uploaded files;
   verify that the backup can be restored. Use your deployment's authenticated
   `mongodump`/snapshot process without placing database credentials in source.
2. From `Backend`, promote the selected existing admin (its password is retained):

   ```bash
   npm run setup:super-admin -- --email selected-admin@example.com
   ```

   For a separate new Super Admin account, set a strong `SUPER_ADMIN_PASSWORD` in
   a secure shell environment (optional `SUPER_ADMIN_NAME`) and run:

   ```bash
   npm run setup:super-admin -- --create --email super-admin@example.com
   ```

   Additional Super Admin accounts use this explicit operator command only.
   The department-admin API cannot create Super Admin accounts.
3. Copy `department-mapping.example.json` to a reviewed mapping file. Review
   department definitions and branch aliases, map each legacy admin's email to a
   department code, and map historical event IDs to a code or `platform`. Never
   infer event ownership from attendees or an admin's current assignment.
4. Generate and review the dry-run report (no application data changes):

   ```bash
   npm run migrate:departments -- --mapping reviewed-departments.json
   ```

   Resolve conflicting admin mappings first. The report lists ambiguous records
   and IDs for review. Missing mappings remain unassigned; unassigned admins
   receive no administrative access. Historical `All branches` announcements
   become platform-wide, and recognised branch announcements retain department
   and batch scope. IDs, content, authored timestamps and notification history
   are preserved. Migration never sends historical notifications.
5. With writes still paused, apply the reviewed mapping:

   ```bash
   npm run migrate:departments -- --mapping reviewed-departments.json --apply
   ```

   Reruns preserve existing department assignments and subsequent edits. Account
   assignments revoke prior sessions. Keep the backup until rollout verification
   is complete. A rollback requires restoring the matching database and code
   backup with writes paused, rather than running old code against the new model.
6. Restart the new backend/frontend. Startup builds the one-active-admin index;
   an index conflict prevents server startup. Verify Super Admin sign-in,
   department admin sign-in, scoped lists, announcements, events and totals.
   Resolve remaining ambiguous content through Unassigned Records. Do not start
   serving traffic with the old unrestricted backend.

### Super Admin verification

```bash
cd Backend
npm test
npm run test:integration
cd ../Frontend
npm run lint
npm run build
npx playwright test --config playwright.super-admin.config.js
```

The live browser suite starts disposable MongoDB, the actual API and a loopback
SMTP capture server. It uses no real email credentials and sends no external mail.
Run the existing rejection, placement, community and directory Playwright configs
for feature regressions. Do not run test helper servers on production interfaces.

## Reliability and privacy repair rollout

The notification index repair is a separate, explicit migration. **Do not start
this release against existing notification history until the dry run is reviewed
and the index migration succeeds.** The server refuses traffic when the faulty
unique sparse index is present or the required partial index is missing. An empty
new database receives the correct index automatically.

From `Backend`, with the intended database configured:

```bash
npm run migrate:notification-index
```

The dry run reports record count, existing index names, invalid-key record IDs,
duplicate keyed records and whether migration is blocked. It makes no database
changes. Resolve reported invalid/duplicate reminder keys through a reviewed
operator correction; the migration never deletes notification history.

Before applying: verify a MongoDB backup, pause application writes and stop API
servers/workers. Then run:

```bash
npm run migrate:notification-index -- --apply
```

The command creates and verifies the named `recipient_reminder_key_unique`
partial unique index first, then removes the old index. Only string reminder keys
participate in uniqueness. Ordinary notifications can coexist for a recipient.
Reruns are safe and retain notification IDs, content, timestamps and read state.
Restart the repaired services, test repeated messages followed by mentorship and
referral actions, and inspect structured failure logs before reopening writes.
Do not restore the old broken index during rollback; use compatible code and the
corrected index, or restore a matched database/code backup with writes paused.
This migration does not replace the separate Super Admin/department setup steps.

Notification delivery is best effort: a secondary notification/email/realtime
failure is logged with operation/request/record identifiers and does not falsely
fail a saved message or other business action. Persistent delivery retries are
not part of this repair. Keyed notification claims suppress duplicate email
scheduling and realtime emissions, including concurrent attempts.

Discovery checks User account eligibility, current profile visibility and
blocking across the directory, assistant, connections, mentor discovery, network
graph and recommendations. Network-only visibility requires an accepted
connection; private profiles are visible only to their owner. Hidden contact
fields are masked. Connection/mentorship opt-outs prevent relevant suggestions
and new actions; existing conversations and relationship records are retained.
Administrative department management continues to use its own protected scope.
Python filters candidates before ranking; Express revalidates cached results
against current account/privacy settings before returning them. An unavailable,
invalid or slow ML response returns HTTP 503 after at most eight seconds of
upstream waiting, without an unsafe cached fallback.

Message bodies must be strings of 1–2,000 characters after trimming. Invalid IDs
and message pagination return HTTP 400, forbidden message actions return 403,
and missing/inaccessible records return 404. Discovery actions against hidden or
blocked profiles return 404. Unexpected errors return a generic 500; rejected
promises are handled by the shared Express wrapper rather than terminating Node.

### Repair verification

Run every Playwright configuration, including `playwright.full-project.config.js`,
after installing Chromium. The full-project suite requires
`ML-Service/.venv/bin/python` with `ML-Service/requirements.txt` installed. Shared
Node/Python policy fixtures live in `fixtures/discovery-policy.json`. The two
former crash probes are permanent test helpers under Backend/tests/helpers.

The repository includes local Postman ML failure simulations in
`postman/simulations`: JSON error, HTML error and a nine-second delay. Run one on
port 4905, point the real API probe at `http://127.0.0.1:4905/ml`, and verify 503.
Use an unused port for the unreachable-service probe. These stand-ins cover the
network/error path; the live suite separately tests the real Python service.
No Postman cloud publication or real email credentials are required.

For isolated production-image verification, use a new Compose project name:

```bash
JWT_SECRET=<test-only-secret> docker compose -p cmrunite-qa -f docker-compose.yml -f docker-compose.qa.yml up -d --build
```

The opt-in QA override binds only localhost port 18080 and allocates volumes
under that project name. It does not reuse the production database. Verify
`/health`, `nginx -t`, UI login/reload and API JSON responses on shared URL prefixes.
`playwright.containers.config.js` exercises test accounts seeded in that disposable
database. Remove only the QA project's containers/volumes when finished.

### Dependency audit scope

Production-only npm audits report zero vulnerabilities in Backend and Frontend.
Full audits also include development tooling: Backend has 19 moderate and 3 high
findings (the high chain is nodemon/chokidar/braces); Frontend has 3 moderate and
6 high findings (Vite and the Tailwind/fast-glob/micromatch/chokidar/braces chains).
These are not deployed production npm dependencies. The remaining development
chains require a separate tooling upgrade and regression check; development
servers should remain local. No force audit upgrades were applied. Recheck
audits before release because advisories change.

## Production preparation

Use Node 24. The supported deployment reference and beginner-oriented operator
steps are in [deploy/PRODUCTION.md](deploy/PRODUCTION.md); privacy operations are
in [deploy/PRIVACY-OPERATIONS.md](deploy/PRIVACY-OPERATIONS.md).

Production uses one HTTPS origin, secure SameSite=Lax cookies, signed browser
CSRF tokens, explicit proxy trust, private authenticated MongoDB, non-root app
containers and encrypted database/upload backups. Obtain GET /auth/csrf and send
data.csrfToken as X-CSRF-Token on cookie/browser mutations. Tokens rotate with
authentication; cookie-free Bearer API calls remain compatible.

The standalone docker-compose.production.yml must not be combined with the legacy
development compose. scripts/test_production.py rehearses the production setup
locally without real email credentials or persistent changes to the host trust
store. scripts/scan_images.py scans read-only image archives without exposing the
Docker socket to a scanner. Hosting, real email, production migrations and hosted
CI verification remain explicit external steps.

Earlier audit totals above describe the prior reliability repair. Consult the
current production-preparation verification report for the new dependency scans;
Nodemon has been replaced by Node watch mode, Tailwind/Vite and Multer upgraded,
and Flask/PyMongo patched. No audit --force upgrades were used.
