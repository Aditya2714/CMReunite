# Setup and deployment guide

## 1. Prerequisites

For local macOS development:

- Node.js 20 or newer
- npm
- Python 3.11 or newer
- MongoDB Community Edition or a MongoDB Atlas URI
- Git (optional when using the ZIP)

Check:

```bash
node --version
npm --version
python3 --version
mongosh --version
```

## 2. Transfer the project

The source ZIP may exclude generated dependencies:

- `Backend/node_modules`
- `Frontend/node_modules`
- `Frontend/dist`
- `ML-Service/.venv`
- Playwright output
- `.git` if version history is unnecessary

Do not share populated `.env` files publicly.

## 3. MongoDB on macOS

Install with Homebrew when needed:

```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

Verify:

```bash
mongosh --eval "db.runCommand({ ping: 1 })"
```

## 4. Backend

```bash
cd Alumni-Connect/Backend
cp .env.sample .env
npm install
```

Set at minimum:

```dotenv
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/alumniDB
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
JWT_SECRET=replace-with-a-long-random-secret
ML_SERVICE_URL=http://127.0.0.1:5001
PUBLIC_API_URL=http://127.0.0.1:4000
FRONTEND_URL=http://127.0.0.1:5173
```

Email credentials are optional until delivery is enabled. Privileged accounts use
the explicit `setup:super-admin` command; startup never creates an admin:

```dotenv
EMAIL_USER=
EMAIL_PASS=
```

Generate a strong JWT secret:

```bash
openssl rand -hex 32
```

Start:

```bash
npm run dev
```

Optional demo data:

```bash
npm run seed:demo
```

## 5. ML service

```bash
cd Alumni-Connect/ML-Service
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

The service listens on port `5001`.

## 6. Frontend

```bash
cd Alumni-Connect/Frontend
npm install
npm run dev
```

Open `http://127.0.0.1:5173`.

The development proxy forwards API requests to port `4000`.

## 7. Start order

1. MongoDB
2. Backend
3. ML service
4. Frontend

Health checks:

```bash
curl http://127.0.0.1:4000/health
curl http://127.0.0.1:5001/health
```

## 8. Verification

```bash
cd Backend
npm test
npm run test:integration

cd ../ML-Service
.venv/bin/python -m unittest discover -s tests -v

cd ../Frontend
npm run lint
npm run build
npm run test:e2e
```

The integration and browser suites open local ports and may require permission
in restricted environments.

## 9. Production frontend

```bash
cd Frontend
npm run build
npm run preview
```

The build includes the PWA manifest, icon, service worker and offline page. The
service worker is registered only in production mode.

## 10. Docker alternative

Although local execution does not require Docker, the repository includes an
optional Compose deployment:

```bash
cp .env.docker.example .env
# Replace every placeholder.
docker compose config --quiet
docker compose up --build
```

## 11. Production checklist

- HTTPS enabled
- production CORS allow-list
- long random JWT secret
- secure database credentials and network rules
- configured SMTP credentials
- managed uploads/object storage
- automated backups
- centralized logs and alerts
- Redis/durable worker for multiple backend instances
- database migrations executed against a backup
- all automated and manual acceptance checks passed

## 12. Troubleshooting

### Backend cannot connect

Confirm MongoDB is running and `MONGODB_URI` includes the correct database.

### Recommendations unavailable

Start the ML service and confirm `ML_SERVICE_URL`.

### Reset/OTP email does not arrive

Configure `EMAIL_USER` and an application-specific `EMAIL_PASS`. Check the
backend background-job log.

### Frontend shows stale code

Stop Vite, restart `npm run dev`, and hard-refresh. For installed PWA builds,
unregister an old service worker or deploy a new cache version.

### Port already in use

Identify the exact owning process before stopping it:

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:4000 -sTCP:LISTEN
lsof -nP -iTCP:5001 -sTCP:LISTEN
```

For department migration, backups, explicit Super Admin provisioning and rollout, follow the Super Admin and department administration section in the root README. Never apply production migrations from the test servers.
