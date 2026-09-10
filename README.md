# CMReunite Alumni Connect

CMReunite is a full-stack alumni engagement platform for alumni networking,
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

Set `MONGODB_URI`, `JWT_SECRET`, mail credentials, and explicit administrator
credentials in `.env`. The backend listens on port `4000` by default.

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

Public administrator registration is intentionally disabled. The initial
administrator is provisioned only when `ADMIN_EMAIL` and `ADMIN_PASSWORD` are
explicitly configured.

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
