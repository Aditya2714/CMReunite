# CMRunite production preparation

This repository is prepared and tested locally. Hosting, a public domain, real
SMTP credentials and a reviewed data migration are still needed before launch.
No script here purchases hosting, pushes source, provisions a Super Admin, or
runs a production data migration automatically.

## Local verification first

Use Node 24, Python 3.13 and Docker Compose v2 supporting `!override`. Run clean
`npm ci` installs in Backend and Frontend. Install the ML requirements in
ML-Service/.venv and install Playwright Chromium from Frontend.

Run backend unit/integration tests, frontend lint/build and all feature
Playwright configurations. The tests use fake accounts, disposable MongoDB and
loopback SMTP. The source also includes local Postman failure simulations.

From the repository root:

```sh
python3 scripts/test_monitor.py
python3 scripts/test_production.py
python3 scripts/scan_images.py --output /tmp/cmrunite-image-audits
```

## Temporary Cloudflare demonstration

For a short demonstration, a Cloudflare Quick Tunnel can terminate public HTTPS
and forward to an edge listener bound only to `127.0.0.1:18080`. Start the tunnel
first so its generated hostname can be used as the application's exact public
origin. Create the private deployment directory outside this repository:

```sh
cloudflared tunnel --url http://127.0.0.1:18080
python3 scripts/deploy.py init --directory /secure/cmrunite-demo \
  --domain generated-name.trycloudflare.com \
  --repository /secure/cmrunite-demo-backups
python3 scripts/deploy.py config --cloudflare-tunnel \
  --env-file /secure/cmrunite-demo/runtime.private.env \
  --project cmrunite-cloudflare-demo
python3 scripts/deploy.py up --cloudflare-tunnel \
  --env-file /secure/cmrunite-demo/runtime.private.env \
  --project cmrunite-cloudflare-demo
```

Keep the tunnel process and Docker running. The generated URL is temporary and
changes when the Quick Tunnel is recreated, so a new URL requires updating the
private environment file and restarting the application. Stop the stack with
the matching `down --cloudflare-tunnel` command. Quick Tunnels are appropriate
for disposable demo data; do not expose real alumni personal data through one.

The production rehearsal builds real images and starts only localhost ports
18081 and 18443. It validates HTTPS against its own temporary CA, uses secure
cookies, checks CSRF/origin/rate-limit enforcement and database permissions, and
restores an encrypted backup into a separate empty database. It compares every
collection's contents and an uploaded file. Both temporary deployments and their
volumes are removed afterward. No CA is installed on your computer. Playwright's
certificate exception is restricted to this local test configuration.

## Prepare private configuration after choosing a domain

Keep deployment configuration outside the source checkout:

```sh
python3 scripts/deploy.py init --directory /secure/cmrunite --domain alumni.college-domain.org --repository /separate-backup-disk/cmrunite
```

This generates independent random credentials and a `runtime.private.env` file;
it starts nothing. The secrets directory is mode 0700. Individual secret files
are readable inside the explicitly selected non-root containers; the protected
parent prevents other host users from reading them. Protect the deployment
folder and Docker access. Never commit filled configuration or backup keys.
Copy the backup password into separate secure recovery storage. Losing it makes
encrypted backups unrecoverable. The repository directory must be on a separate
backup disk or replicated off-host before launch; a local path alone does not
protect against losing the server.

Fill EMAIL_USER, SMTP_HOST/PORT/SECURE and the smtp_password secret. Production
SMTP requires TLS. The Gmail service fallback remains available. Fill the
placement address and enable PLACEMENT_JOB_EMAIL_ENABLED only after testing.
ALERT_WEBHOOK_URL is optional during preparation and must use HTTPS in a live
deployment; an institution-operated webhook can receive the monitor's text alerts.
Until configured, alerts are emitted in JSON logs and external delivery is unverified.

Set APP_VERSION and BACKEND_IMAGE/FRONTEND_IMAGE/ML_IMAGE plus
MONGODB_IMAGE/MONGO_TOOLS_IMAGE/EDGE_IMAGE/BACKUP_IMAGE to approved release
images pinned by digest for live deployment; `:local` tags are for local builds.
The reference deployment uses a single public origin, a Caddy TLS edge, private
application/database networks, authenticated MongoDB and a read-only ML database
account. Default network CIDRs are configurable if they overlap existing networks.
Only ports 80/443 are published. Keep the server firewall restricted accordingly.
Additional CDNs/proxies require reviewed trusted-proxy configuration; do not
set Express trust proxy to true or trust arbitrary forwarded headers.

## Validate, build, migrate, then start

```sh
python3 scripts/deploy.py config --env-file /secure/cmrunite/runtime.private.env --project cmrunite-production
python3 scripts/deploy.py build --env-file /secure/cmrunite/runtime.private.env --project cmrunite-production
```

Do not start a new public installation until DNS points to the selected server,
TLS issuance is possible and the institution approves the release. Caddy stores
certificates on persistent volumes and renews them automatically. Its local CA
configuration is for the disposable rehearsal only, never a public launch.

For an existing installation, pause writes and workers and take verified MongoDB
and upload backups with the existing deployment's credentials. Do not attach an
existing database volume to a newly generated credential set: MongoDB's user
initialization runs only on an empty volume. Restore into a reviewed empty target
or explicitly configure existing database users through the operator.

Follow the main README's notification-index, department and credential migration
instructions, including dry-run reports, mapping review and explicit apply.
Run the existing Community Posts migration explicitly as well; production startup
no longer imports historical records automatically. Container operator commands use `node -r ./src/config/bootstrap scripts/...`;
the backend runtime deliberately contains no npm development tooling. Super Admin
provisioning remains an explicit operator command. Never recreate the old sparse
notification index during rollback. Keep database/code versions compatible.

After migrations and approval:

```sh
python3 scripts/deploy.py up --env-file /secure/cmrunite/runtime.private.env --project cmrunite-production
python3 scripts/deploy.py status --env-file /secure/cmrunite/runtime.private.env --project cmrunite-production
```

Verify real OTP/reset/approval/rejection/announcement/placement emails, attachment
permissions, all roles, repeated messages and realtime updates. Configure sender
SPF/DKIM/DMARC when using a custom email domain. Real provider acceptance and inbox
delivery remain operator checks. An explicit mail verification CLI is available
as `node -r ./src/config/bootstrap scripts/verifyEmail.js recipient@example.org`.

## Backups and recovery

Initialize the encrypted repository once using `deploy.py init-backup` with the
same env-file/project arguments. Daily backups briefly stop the backend so the
database and uploads form a consistent application snapshot. The supplied
`cmrunite-backup.service` and `.timer` are examples to review/install on the
selected Linux host; they are not installed by this preparation. The nightly
02:00 scheduled-backup command stops the backend, backs up, verifies data and
retains 30 days, then restarts the backend even when backup fails. The monitor
alerts when no successful backup is recorded within 26 hours.

For manual operations, stop writes/workers first. `deploy.py backup` refuses to
run while the project's backend is running. `verify-backup` checks encrypted
repository contents; `prune-backups` implements the 30-day retention policy.
Restore into a new deployment with the original backup repository/password:
start only its MongoDB service, then run `deploy.py restore` with the same
arguments plus `--confirm-restore cmrunite-<target-project>`. Restoration refuses
nonempty application databases or uploads and never uses `--drop`. Verify data
before starting compatible application code. A failed partial restoration must
be inspected and retried into a fresh target. Keep the source intact.

Daily backups target at most 24 hours of data loss; the initial restore target
is four hours. The institution must approve those targets. Perform regular
restore drills and keep credentials/recovery keys separately from backups.
Application shutdown drains in-flight requests/jobs for up to 30 seconds. General
notifications remain best effort; there is no new durable notification outbox.
The existing placement worker retains its previously implemented database leases.

## Monitoring and release gate

`/health/live` checks the API process; `/health/ready` checks MongoDB availability.
An ML outage degrades recommendations without removing the core API from service.
The existing `/health` contract retains dependency details. The private monitor
checks every minute, alerts after three consecutive problem checks and records
recovery. It checks availability, recent errors/latency, notification failures,
ML failures, backup age and filesystem space. `/internal/status` requires a secret
and is blocked at the public frontend. Logs rotate; persistent state survives
monitor restarts. Connect real alert delivery and verify it before launch.

Run scans again for the actual selected image digests. Use scan_images.py with
--include-infrastructure to include Caddy, MongoDB and backup tooling; ensure those
images have been pulled first. The default local scan covers the four application
images, not these separately maintained infrastructure images. Do not waive high/critical findings implicitly. CI must pass
on the intended repository; local execution is not evidence of a hosted run.
Before opening access, run a representative staging load test and a recovery drill
on the chosen server. Local functional checks do not certify production capacity.
