# Software Requirements Specification

## 1. Introduction

### 1.1 Purpose

CMRunite provides a verified digital platform through which alumni and the
institution can discover people, form professional relationships, conduct
mentorship, manage referrals, participate in events, exchange messages, and
measure engagement.

### 1.2 Product scope

The system consists of a React progressive web application, an Express REST and
Socket.IO backend, MongoDB persistence, and a Python recommendation service.
The application supports alumni and privileged institutional roles.

### 1.3 Actors

| Actor | Responsibilities |
|---|---|
| Visitor | View the landing page, request OTP, register and sign in |
| Alumni | Maintain a profile, discover alumni, connect, message, mentor, request referrals, join events and control privacy |
| Administrator | Verify registrations, manage records/content, oversee workflows and inspect analytics |
| College representative | Publish institutional content and use permitted administrative tools |
| ML service | Rank alumni candidates and return explanations |
| Email provider | Deliver OTP, approval, reset and configured notification emails |

## 2. Functional requirements

### FR-01 Authentication and account security

- The system shall authenticate users using email, password and role.
- Passwords shall be bcrypt-hashed and excluded from default reads.
- Alumni registration shall require OTP verification and administrator approval.
- Each new login shall create an independently revocable session.
- Users shall be able to change passwords, view sessions, revoke sessions and
  sign out everywhere.
- Password-reset tokens shall be random, single-use, hashed at rest and expire
  after 15 minutes.

### FR-02 Alumni profiles and directory

- Alumni shall maintain academic, career, skill, biography and social fields.
- Authenticated users shall search by name, batch, branch, skill, company,
  designation and location.
- Directory results shall respect profile visibility, blocking and contact-field
  preferences.

### FR-03 Connections and graph discovery

- Alumni shall send, accept and reject connection requests.
- Users may include a personalized connection message.
- The graph shall show accepted relationships separately from discovery links.
- The graph shall support search, company filtering, zoom, pan, mutual
  connections and shortest accepted-connection paths.

### FR-04 Mentorship

- Alumni shall discover available verified mentors.
- A request shall capture mentor, topic, communication mode, goal, expected
  outcome and message.
- Participants shall accept, schedule, document progress, complete milestones,
  close and rate mentorships.

### FR-05 Referrals

- Alumni shall request a referral for a role and company.
- Requests may include resume/job links and deadlines.
- Authorized users shall move requests through requested, under-review,
  referred, interviewing and selected/rejected states.
- Every status change shall be timestamped.

### FR-06 Events and content

- Privileged users shall manage events, jobs, announcements, recognition and
  community resources.
- Users shall register for events subject to capacity and waitlisting.
- The application shall persist attendance/check-in state even though QR
  scanning is outside the current scope.

### FR-07 Messaging and notifications

- Accepted or privacy-permitted users shall exchange stored direct messages.
- Socket.IO shall deliver live messages and notifications.
- Users shall filter notifications and configure channels, categories, digest
  frequency and quiet hours.
- The system shall create reminders for events, mentorship sessions and referral
  deadlines within 48 hours.

### FR-08 Intelligent discovery

- The assistant shall parse natural-language alumni queries into grounded
  filters and return profile-backed evidence.
- Mutating assistant actions shall require explicit confirmation.
- The recommendation service shall support network, mentor and referral modes.
- Each recommendation shall contain compatibility, component signals, reasons
  and a model version.

### FR-09 Administration and analytics

- Administrators shall review registrations and manage alumni records.
- Reports shall use live MongoDB counts rather than hard-coded values.
- Analytics shall cover users, connections, mentoring, referrals, events,
  attendance, messages and registration growth.
- Administrators shall export engagement metrics as CSV.

### FR-10 Privacy and data rights

- Users shall control profile visibility, email/phone exposure, messaging,
  connection requests and mentorship availability.
- Users shall block and unblock other users.
- Users shall export their account and activity data as JSON.

## 3. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | Protected operations require authenticated, authorized users |
| NFR-02 | Inputs are bounded and validated; sensitive endpoints are rate-limited |
| NFR-03 | Critical reads use indexes, limits or pagination appropriate to their volume |
| NFR-04 | The frontend is responsive, keyboard-usable and honors reduced-motion preferences |
| NFR-05 | The production frontend is installable and provides an offline fallback |
| NFR-06 | API failures return structured status and message fields |
| NFR-07 | Request IDs and structured logs support diagnosis |
| NFR-08 | Recommendation output is explainable and reproducibly evaluated |
| NFR-09 | Configuration and secrets are supplied through environment variables |
| NFR-10 | Automated unit, integration, ML and browser checks must pass before release |

## 4. Constraints and assumptions

- MongoDB is required for complete operation.
- Email features require valid SMTP/Gmail application credentials.
- The ML service must be running for recommendations.
- The current cache and background queue are process-local.
- The labelled recommendation dataset is a starter dataset, not a statistically
  representative institutional study.

## 5. Acceptance criteria

The release is acceptable when the production frontend builds, lint passes,
backend unit/integration tests pass, ML tests pass, browser journeys pass, and
the manual workflow checklist in `TEST_REPORT.md` completes against a configured
MongoDB database.
