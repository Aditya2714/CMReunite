# API guide

The complete machine-readable contract is
[`Backend/docs/openapi.yaml`](../Backend/docs/openapi.yaml). This guide groups
the implemented endpoints by responsibility.

## 1. Conventions

- Local base URL: `http://127.0.0.1:4000`
- Authentication: HTTP-only `jwt` cookie; bearer token is also accepted by
  protected middleware.
- Request/response bodies: JSON unless the endpoint explicitly returns CSV,
  JSON download or accepts multipart form data.
- Successful responses use `status: "success"`.
- Errors use `status: "fail"` or `status: "error"` with a safe `message`.
- Backend responses include `X-Request-Id`.

## 2. Authentication

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate and create a revocable device session |
| GET | `/auth/me` | Restore current session |
| POST | `/auth/logout` | Revoke current session and clear cookie |
| POST | `/auth/forgot-password` | Request generic reset response/email |
| POST | `/auth/reset-password` | Consume reset token and set strong password |
| POST | `/auth/change-password` | Verify current password and revoke other sessions |
| GET | `/auth/sessions` | List login/device history |
| DELETE | `/auth/sessions/{sessionId}` | Revoke one owned session |
| POST | `/auth/logout-all` | Revoke every session |
| POST | `/otp/send` | Send registration OTP |
| POST | `/otp/verify` | Verify OTP |
| POST | `/register` | Submit alumni registration |

## 3. Profiles and privacy

| Method | Endpoint | Purpose |
|---|---|---|
| GET/PUT | `/profile/me` | Read/update current profile |
| GET/PATCH | `/profile/privacy` | Read/update privacy controls |
| POST/DELETE | `/profile/blocked/{userId}` | Block/unblock member |
| GET | `/profile/export` | Download personal data JSON |
| GET | `/profile/activity-summary` | Live dashboard counts |
| GET | `/alumni` | Filtered, privacy-aware directory |
| GET | `/alumni/{id}` | Alumni profile |

## 4. Relationships and communication

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/connections` | Accepted, incoming, outgoing and suggested connections |
| POST | `/connections/{alumniId}` | Send privacy-checked request |
| PATCH | `/connections/{connectionId}` | Accept/reject request |
| GET/POST | `/messages` | List conversations/send message |
| GET | `/messages/{conversationId}` | Read participant-authorized messages |
| GET | `/notifications` | Paginated/filterable notifications |
| GET/PATCH | `/notifications/preferences` | Notification settings |
| PATCH | `/notifications/read-all` | Mark all read |

## 5. Mentorship and referrals

| Method | Endpoint | Purpose |
|---|---|---|
| GET/POST | `/mentorship` | List/create mentorship |
| GET | `/mentorship/mentors` | Privacy-aware available mentors |
| PATCH | `/mentorship/{requestId}` | Lifecycle, scheduling and feedback |
| POST | `/mentorship/{requestId}/progress` | Milestones and progress notes |
| GET/POST | `/referrals` | List/create referrals |
| PATCH | `/referrals/{referralId}` | Assignment, pipeline and status history |

## 6. Intelligence

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/assistant/query` | Parse and rank grounded directory matches |
| POST | `/assistant/action` | Preview/confirm actions or navigate to workflows |
| GET | `/network/graph` | Nodes, accepted edges and discovery links |
| POST | `/ml/recommendations` | Proxy purpose-specific hybrid recommendations |
| POST | `/ml/feedback` | Record relevance/conversion feedback |
| GET | `/ml/evaluation` | Reproducible benchmark report |

## 7. Content and events

| Prefix | Capabilities |
|---|---|
| `/event` | Upcoming/all events, create/update/delete, register, check-in |
| `/jobs` | Create, list, update and delete jobs |
| `/announcements` | Targeted announcements and attachments |
| `/recognition` | Achievement creation and moderation |
| `/community` | Stories, forum topics/replies and resources |
| `/contributions` | Campaigns and pledges |

## 8. Administration and operations

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/admin/overview` | Live counts, distributions, growth and engagement |
| GET | `/admin/reports/export` | Engagement CSV |
| GET | `/admin/pending-alumni` | Verification queue |
| GET | `/admin/users` | User administration |
| PATCH | `/admin/users/{userId}/approval` | Approval/rejection |
| POST | `/bulk/bulkImport` | Bounded CSV import |
| GET | `/health` | Backend/database/ML health |
| GET | `/api-docs` | OpenAPI YAML |

## 9. Example request

```bash
curl -c cookies.txt \
  -H "Content-Type: application/json" \
  -d '{"email":"alumni@example.com","password":"StrongPass123!","role":"alumni"}' \
  http://127.0.0.1:4000/auth/login

curl -b cookies.txt http://127.0.0.1:4000/profile/activity-summary
```

Never place production credentials in shell history or checked-in files.
