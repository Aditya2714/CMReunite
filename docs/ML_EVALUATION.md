# Recommendation and ML evaluation

## 1. Purpose

The recommendation service ranks alumni for three user intents:

- network building;
- mentor discovery;
- referral-contact discovery.

It is designed to remain interpretable when interaction data is limited.

## 2. Input signals

| Signal | Method |
|---|---|
| Profile text | Combined word and character n-gram TF-IDF cosine similarity |
| Skills | Normalized Jaccard similarity with aliases such as Node/Node.js and ML/machine-learning |
| Domain | Normalized exact match |
| Branch | Normalized exact match |
| Location | Normalized exact match |
| Experience | Graduation-year compatibility; mentor mode rewards appropriate seniority |
| Feedback | Bounded positive/negative adjustment and hidden-candidate removal |

Weights differ by network, mentor and referral mode. The implementation is in
`ML-Service/app.py`.

## 3. Explainability

Every result contains:

- score and compatibility percentage;
- mode and model version;
- component signal values;
- structured reasons;
- matching skills where applicable.

This lets evaluators inspect why a result ranked highly.

## 4. Offline methodology

The fixture format contains a target profile, candidate profiles and labelled
relevant user IDs. The evaluator compares:

1. skills-only baseline;
2. content-only TF-IDF baseline;
3. hybrid-adaptive model.

Metrics:

- Precision@K;
- Recall@K;
- Mean Reciprocal Rank;
- NDCG@K.

Run:

```bash
cd ML-Service
.venv/bin/python evaluate.py fixtures/labelled_recommendations.json \
  --mode mentor -k 1 --compare
```

## 5. Current measured starter result

Evaluation date: **26 July 2026**  
Mode: **mentor**  
K: **1**  
Labelled fixtures: **4**

| Model | Precision@1 | Recall@1 | MRR | NDCG@1 |
|---|---:|---:|---:|---:|
| Skills only | 0.75 | 0.75 | 0.875 | 0.75 |
| Content only | 1.00 | 1.00 | 1.00 | 1.00 |
| Hybrid adaptive | 1.00 | 1.00 | 1.00 | 1.00 |

Interpretation: the hybrid and content models rank all four labelled relevant
mentor profiles first, while the skills-only baseline fails one scenario in
which mentorship relevance depends on seniority/domain rather than shared
skills. This is evidence that multi-signal ranking can address that fixture.

## 6. Validity warning

Four curated cases are insufficient for a general accuracy claim. The current
result demonstrates evaluator correctness and model behavior only. A defensible
institutional study should use:

- at least 50–100 reviewed scenarios;
- multiple independent judges;
- all three recommendation modes;
- inter-rater agreement;
- confidence intervals/significance testing;
- coverage, diversity, latency and conversion metrics;
- consented online feedback.

## 7. Reproducibility

- Fixtures are version controlled.
- Candidate sets are identical across compared models.
- Algorithms and metrics are deterministic for the same input.
- Unit tests validate skill normalization, ranking, feedback behavior, metric
  bounds and baseline comparison.

## 8. Limitations and future work

- TF-IDF does not capture deep semantic equivalence.
- Exact categorical matches may miss related domains.
- Feedback adaptation is bounded heuristic adjustment, not learned ranking.
- Sparse profiles create cold-start limitations.
- Future work may add sentence embeddings and learning-to-rank after sufficient
  reviewed and consented data exists.
