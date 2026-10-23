# Use cases and data-flow diagrams

## 1. Use-case model

```mermaid
flowchart LR
    V["Visitor"] --> U1["Verify email and register"]
    V --> U2["Sign in / recover account"]

    A["Alumni"] --> U3["Maintain profile and privacy"]
    A --> U4["Search and connect"]
    A --> U5["Message alumni"]
    A --> U6["Request or provide mentorship"]
    A --> U7["Track referrals"]
    A --> U8["Register for events"]
    A --> U9["Use assistant and recommendations"]
    A --> U10["Manage sessions and export data"]

    AD["Administrator"] --> U11["Verify accounts"]
    AD --> U12["Manage alumni and content"]
    AD --> U13["Review mentorship/referrals"]
    AD --> U14["View analytics and export reports"]

    ML["ML service"] --> U15["Rank and explain matches"]
```

## 2. Level-0 context diagram

```mermaid
flowchart LR
    Alumni["Alumni user"] -->|profiles, searches, workflow requests| System["CMRunite"]
    System -->|matches, messages, statuses, notifications| Alumni
    Admin["Administrator"] -->|verification, content, moderation| System
    System -->|reports, queues, analytics| Admin
    System <-->|profile data and rankings| ML["Recommendation service"]
    System <-->|persistent records| DB[("MongoDB")]
    System -->|OTP, approval, reset, alerts| Email["Email provider"]
```

## 3. Level-1 application data flow

```mermaid
flowchart TD
    UI["React PWA"] --> Auth["Authentication and session management"]
    UI --> Profiles["Profile, privacy and directory"]
    UI --> Engage["Connections, mentorship, referrals and events"]
    UI --> Comms["Messaging and notifications"]
    UI --> Intelligence["Assistant, graph and recommendations"]
    UI --> Admin["Administration and analytics"]

    Auth --> Users[("Users and sessions")]
    Profiles --> Users
    Profiles --> Alumni[("Alumni profiles")]
    Engage --> Workflows[("Workflow collections")]
    Comms --> Messages[("Conversations, messages, notifications")]
    Intelligence --> Alumni
    Intelligence --> Graph[("Connections")]
    Intelligence --> ML["Flask ML service"]
    Admin --> Users
    Admin --> Workflows
```

## 4. Authentication sequence

```mermaid
sequenceDiagram
    participant U as User
    participant F as React
    participant A as Express
    participant D as MongoDB
    U->>F: Submit email, password and role
    F->>A: POST /auth/login
    A->>D: Find user and compare bcrypt hash
    A->>D: Create revocable AuthSession
    A-->>F: HTTP-only JWT cookie + safe DTO
    F->>A: GET /auth/me
    A->>D: Validate user and active session
    A-->>F: Restored authenticated profile
```

## 5. Password reset sequence

```mermaid
sequenceDiagram
    participant U as User
    participant A as Express
    participant D as MongoDB
    participant E as Email
    U->>A: Request reset for email
    A->>D: Find approved account
    A->>D: Store SHA-256 token hash + 15-minute expiry
    A-->>U: Generic response
    A->>E: Send raw token in reset link
    U->>A: Submit token + strong new password
    A->>D: Match hash and expiry
    A->>D: Save bcrypt password; clear token; revoke sessions
    A-->>U: Reset completed
```

## 6. Recommendation data flow

```mermaid
flowchart LR
    P["Target profile"] --> N["Normalization"]
    C["Candidate profiles"] --> N
    N --> TF["Word/character TF-IDF"]
    N --> SK["Skill Jaccard"]
    N --> EX["Domain, branch, location, experience"]
    TF --> H["Mode-weighted hybrid score"]
    SK --> H
    EX --> H
    FB["Explicit feedback"] --> H
    H --> R["Ranked results + reasons + signals"]
```

## 7. Trust-sensitive assistant action

```mermaid
sequenceDiagram
    participant U as Alumni
    participant UI as Assistant UI
    participant API as Assistant API
    U->>UI: Connect with a result
    UI->>API: Preview connect action
    API-->>UI: Confirmation required + named target
    U->>UI: Explicitly confirm
    UI->>API: Confirmed action
    API->>API: Recheck blocking, privacy, self-action and duplicates
    API-->>UI: Connection request created
```
