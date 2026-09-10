# User manual

## 1. Access

Open `http://127.0.0.1:5173` locally or the institution’s deployed URL.

## 2. Alumni onboarding

1. Select **Create an account**.
2. Enter and verify the alumni email using OTP.
3. Complete academic and career details.
4. Submit registration.
5. Wait for administrator approval.
6. Sign in with the approved alumni role.

## 3. Account recovery and security

- Select **Forgot password?** on the login page.
- Use the email link within 15 minutes.
- Create a password with at least 10 characters, uppercase, lowercase, number
  and symbol.
- Open **Account Security** to change the password, inspect sessions, revoke a
  device or sign out everywhere.

## 4. Profile and privacy

- Use **Profile** to maintain academic, employment, skill, biography and social data.
- Use **Privacy & Trust** to control discoverability, email/phone visibility,
  messages, connection requests and mentor availability.
- Block a user from the Connections page and unblock from Privacy & Trust.
- Select **Export JSON** to download personal data.

## 5. Alumni discovery

### Directory

Filter alumni by name, company, role, batch, branch and location.

### Assistant

Example queries:

- “Find a Python mentor in Bengaluru.”
- “Who works at Microsoft from the 2020 batch?”
- “Find referral contacts for frontend roles.”

Every result shows matching evidence. A connection request initiated through the
assistant asks for confirmation before changing data.

### Network graph

- Solid lines: accepted connections.
- Dotted lines: discovery links from shared company/branch.
- Search/filter the graph, zoom with buttons or wheel, and drag to pan.
- Select a person to view mutual connections and shortest accepted path.

### Recommendations

Choose network, mentor or referral intent. Inspect compatibility and reason
badges. Submit relevant/not-relevant feedback to adapt future ranking.

## 6. Connections and messages

1. Send a connection request from Connections, Directory or Assistant.
2. The recipient accepts or rejects it.
3. Privacy-permitted users can start a direct conversation.
4. New messages and read state synchronize through Socket.IO.

## 7. Mentorship

1. Choose a verified available mentor.
2. Provide topic, mode, goal, expected outcome and message.
3. Mentor accepts and schedules the session.
4. Participants add milestones and progress notes.
5. Mentor completes the engagement.
6. Requester submits rating and feedback.

## 8. Referrals

Submit target role, company, rationale and optional resume/job links/deadline.
Follow the status timeline:

`Requested → Under review → Referred → Interviewing → Selected/Rejected`

## 9. Events and content

- Register or cancel from Events.
- Capacity may place a user on a waitlist.
- Browse Jobs, Announcements, Resources, Stories and Recognition.
- Event check-in state exists; QR scanning is intentionally outside this release.

## 10. Notifications

- Filter by category or unread state.
- Mark one or all notifications read.
- Configure in-app/email channels, digest preference and quiet hours.
- Reminders are created for relevant events, mentoring sessions and referral
  deadlines within 48 hours.

## 11. Administrator guide

Administrators can:

- review pending alumni and record verification notes;
- manage alumni records and bounded CSV imports;
- create/manage events, jobs, announcements and recognition;
- oversee mentorship and referral workflows;
- view live engagement analytics;
- export engagement CSV reports.

## 12. Presentation mode

Open `/demo` to present:

1. problem and solution;
2. architecture;
3. implementation journey;
4. engineering evidence;
5. live feature sequence.

## 13. Common issues

- Empty graph/recommendations: add sufficient approved alumni/profile data.
- ML unavailable: start the Python service.
- Email unavailable: configure email credentials.
- Login rejected: confirm administrator approval and correct role.
- Old interface after deployment: refresh and update/unregister stale service worker.
