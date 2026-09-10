# Demonstration and viva guide

## 1. Before the presentation

- Start MongoDB, backend, ML service and frontend.
- Confirm `/health`, ML `/health`, login and demo accounts.
- Ensure at least several approved profiles, connections, mentorships and referrals exist.
- Open `/demo` in one tab and admin/alumni accounts in separate browser contexts.
- Keep terminal test output and `ML_EVALUATION.md` ready.
- Never expose `.env` or credentials on screen.

## 2. Ten-minute demonstration

1. **Project overview — 60 seconds**
   - Open `/demo`.
   - Explain fragmented alumni data and the proposed active network.
2. **Architecture and security — 60 seconds**
   - Show React → Express/Socket.IO → MongoDB → Flask.
   - Mention bcrypt, HTTP-only JWT, revocable sessions and authorization.
3. **Grounded assistant — 75 seconds**
   - Ask for a Python mentor.
   - Show evidence and confirmed connection action.
4. **Graph intelligence — 75 seconds**
   - Filter company, zoom/pan, select an alumnus, show mutuals/path.
5. **Mentorship and referral depth — 90 seconds**
   - Show goals/milestones/scheduling.
   - Show referral pipeline and history.
6. **Explainable recommendation — 90 seconds**
   - Switch intent, show signals/reasons and benchmark page.
7. **Privacy and account security — 75 seconds**
   - Show visibility/contact controls and session revocation.
8. **Analytics, PWA and evidence — 75 seconds**
   - Show live admin reports, test totals and installable/offline support.

## 3. Short demonstration fallback

If limited to five minutes:

1. `/demo` problem and architecture
2. assistant query
3. network path
4. recommendation reasons/evaluation
5. privacy/account security
6. test evidence

## 4. Likely viva questions

### Why is this more than a CRUD portal?

It combines verified multi-role workflows, lifecycle histories, real-time
communication, graph algorithms, explainable purpose-specific ranking,
privacy enforcement, revocable sessions and reproducible evaluation.

### Why a separate ML service?

Python/scikit-learn provides a focused ranking environment and keeps ML
dependencies independent from the transactional Node API. Express remains the
authentication and policy boundary.

### Is the assistant a generative AI?

No. It is deliberately grounded and deterministic: it parses intent/keywords,
scores stored profile fields and shows evidence. This avoids paid-service
dependency and fabricated alumni facts.

### How does shortest path work?

The frontend constructs adjacency from accepted-connection edges and applies
breadth-first search. BFS returns the minimum-hop path in an unweighted graph.

### Why use a hybrid recommender?

Text captures broad profile overlap, while skills, domain, branch, location and
experience add controlled interpretable signals. Mode-specific weights reflect
different purposes.

### Is the current ML accuracy generalizable?

No. Four fixtures verify methodology and demonstrate model behavior. A proper
study needs many independently reviewed scenarios, all modes and statistical
analysis.

### How are passwords protected?

Passwords are bcrypt-hashed, excluded from default queries and never serialized.
Strong-password rules apply to changes/resets.

### How are sessions revoked if JWTs are stateless?

Each JWT contains a random `jti` linked to an `AuthSession`. Middleware checks
that record, so logout, reset or manual revocation invalidates the token.

### Why hash password reset tokens?

If the database is exposed, the attacker cannot directly use the stored hash as
the reset token. The raw token exists only in the email link and expires in 15 minutes.

### How is privacy enforced?

The backend filters directory, assistant, graph and mentor results; redacts
contacts; and rejects blocked/disallowed message and connection actions.

### Why HTTP-only cookies?

Frontend JavaScript cannot read them, reducing token theft via XSS. SameSite and
Secure are adjusted for production.

### What happens if Socket.IO disconnects?

MongoDB remains the source of truth. Messages/notifications persist and are
available after reconnection.

### What does the PWA cache?

The navigation shell and static assets. It does not cache private API responses
or perform offline mutations.

### What would change for production scale?

Managed MongoDB, object storage, Redis cache, durable job workers, centralized
logging/monitoring, replicas, CSRF hardening, penetration/load tests and larger
reviewed ML data.

## 5. Honest limitations to state

- small labelled recommendation dataset;
- deterministic assistant rather than general LLM;
- process-local cache/queue;
- external email configuration;
- no production-scale load or independent security audit;
- no automated account-deletion retention workflow.

Owning these limitations demonstrates engineering judgment rather than weakness.
