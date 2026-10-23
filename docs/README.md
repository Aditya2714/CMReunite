# CMRunite final documentation package

This directory is the submission-ready documentation set for **CMRunite: An
Intelligent and Explainable Alumni Engagement Platform**.

For the easiest reading experience, open the standalone offline handbook:
[`../CMRunite-Complete-Project-Guide.html`](../CMRunite-Complete-Project-Guide.html).
It includes chapter navigation, full-text filtering and print-to-PDF styling.

## Document index

| Document | Purpose |
|---|---|
| [FINAL_YEAR_REPORT.md](FINAL_YEAR_REPORT.md) | Master project report: problem, objectives, design, implementation, results, limitations and conclusion |
| [SRS.md](SRS.md) | Software Requirements Specification with actors, functional and non-functional requirements |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Component, deployment, authentication, recommendation and trust-boundary design |
| [DATABASE_DESIGN.md](DATABASE_DESIGN.md) | Entity relationships, collection responsibilities, indexes and retention considerations |
| [USE_CASES_AND_DFD.md](USE_CASES_AND_DFD.md) | Use-case model and level-0/level-1 data-flow diagrams |
| [API_GUIDE.md](API_GUIDE.md) | API conventions and endpoint catalogue; the machine-readable contract is in `Backend/docs/openapi.yaml` |
| [SECURITY_AND_PRIVACY.md](SECURITY_AND_PRIVACY.md) | Threat model, implemented controls, privacy design and residual risks |
| [ML_EVALUATION.md](ML_EVALUATION.md) | Recommendation algorithm, explainability, offline evaluation and interpretation |
| [TEST_REPORT.md](TEST_REPORT.md) | Automated results, coverage map and manual acceptance checklist |
| [SETUP_AND_DEPLOYMENT.md](SETUP_AND_DEPLOYMENT.md) | macOS/local installation, configuration, production build and troubleshooting |
| [USER_MANUAL.md](USER_MANUAL.md) | Alumni and administrator operating guide |
| [DEMO_AND_VIVA.md](DEMO_AND_VIVA.md) | Final presentation sequence, live-demo checklist and likely viva questions |
| [MILESTONES.md](MILESTONES.md) | Implementation history and deliverables |

## Recommended submission order

1. Use `FINAL_YEAR_REPORT.md` as the primary written report.
2. Include diagrams from `ARCHITECTURE.md`, `DATABASE_DESIGN.md`, and
   `USE_CASES_AND_DFD.md` in the report or presentation.
3. Attach `TEST_REPORT.md`, `ML_EVALUATION.md`, and the OpenAPI document as
   technical evidence.
4. Give evaluators `SETUP_AND_DEPLOYMENT.md` and `USER_MANUAL.md`.
5. Use `/demo` in the running application together with `DEMO_AND_VIVA.md`.

## Evidence status

The documented test totals were measured on 26 July 2026:

- Backend unit tests: **22 passed**
- Backend integration tests: **6 passed**
- ML tests: **9 passed**
- Browser end-to-end tests: **11 passed**
- Frontend lint and production build: **passed**

The recommendation benchmark currently contains four labelled mentor fixtures.
Its results are valid for that starter fixture only and must not be presented as
a large-scale research conclusion.
