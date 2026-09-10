# System architecture

## Container architecture

```mermaid
flowchart LR
    U["Alumni / Administrator"] --> N["Nginx + React SPA"]
    N --> B["Express API"]
    B --> M[("MongoDB")]
    B --> ML["Flask recommendation service"]
    ML --> M
    B --> E["Email / OTP provider"]
    B --> F["Persistent upload volume"]
    B --> Q["In-process background job queue"]
    N --> SW["PWA service worker + offline shell"]
    B <-->|"Socket.IO"| N
```

## Authentication and authorization

```mermaid
sequenceDiagram
    participant U as Alumni
    participant UI as React
    participant API as Express
    participant DB as MongoDB
    U->>UI: Verify email and register
    UI->>API: OTP verification + alumni registration
    API->>DB: Hashed pending account
    Note over API,DB: Administrator verifies identity
    U->>API: Login
    API->>DB: Compare bcrypt hash
    API-->>UI: HTTP-only JWT cookie
    UI->>API: GET /auth/me
    API-->>UI: Safe user DTO
    UI->>API: Protected workflow request
    API->>API: Role and ownership checks
```

Every new JWT contains a random `jti` linked to an `AuthSession`. Protected
middleware verifies both token signature and active server-side session.
Password change, reset, device revocation and logout-all invalidate sessions.

## Recommendation pipeline

```mermaid
flowchart TD
    P["Verified alumni profiles"] --> C["Cleaning and normalization"]
    C --> T["Word + character n-gram semantic similarity"]
    C --> S["Skill Jaccard similarity"]
    C --> D["Domain / branch / location signals"]
    C --> X["Experience-gap signal"]
    T --> H["Mode-specific hybrid score"]
    S --> H
    D --> H
    X --> H
    F["User feedback"] --> A["Adaptive score adjustment"]
    A --> H
    H --> R["Ranked recommendations"]
    R --> E["Structured explanation reasons"]
```

## Major collections

```mermaid
erDiagram
    USER ||--o| ALUMNI : has
    USER ||--o{ CONNECTION : participates
    USER ||--o{ MENTORSHIP : requests
    USER ||--o{ MENTORSHIP : mentors
    USER ||--o{ REFERRAL : requests
    USER ||--o{ EVENT_REGISTRATION : creates
    EVENT ||--o{ EVENT_REGISTRATION : contains
    USER ||--o{ NOTIFICATION : receives
    USER ||--o{ CONVERSATION : participates
    CONVERSATION ||--o{ MESSAGE : contains
    USER ||--o{ RECOMMENDATION_FEEDBACK : provides
    USER ||--o{ AUTH_SESSION : creates
    USER ||--o{ JOB : creates
```

## Trust boundaries

- Browser state is not proof of authentication; `/auth/me` validates the cookie.
- Credentials exist only on `User` and are excluded from normal queries.
- Administrator provisioning is controlled by environment variables.
- Mutations require role and resource-ownership checks.
- ML results include only verified alumni and exclude the requesting user.
- Uploaded bulk data is CSV-only to minimize parser attack surface.
- Socket connections validate the same signed JWT used by HTTP requests.
- Conversations are readable only by their participants.
- Directory, assistant, graph, mentoring, messaging and connections enforce
  privacy preferences and blocking at the backend.
- Assistant mutations require a named confirmation preview before execution.
- The PWA service worker caches navigation shell/static assets, not private API responses.

## Scalability controls

- High-volume alumni, notification, conversation, and message reads are paginated.
- Recommendation responses use a short-lived per-user cache invalidated by feedback.
- Email delivery is moved off the request path through a background job queue.
- Search and workflow fields have compound and text indexes.
- CSV uploads are memory-limited, record-limited, extension/MIME checked, and reject binary content.
- Cache and queue storage is process-local for this deployment; their service interfaces
  can be replaced by Redis and a durable worker for multi-instance production.
