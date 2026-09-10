"""Reproducible offline evaluation for labelled recommendation fixtures.

Input JSON format:
[
  {
    "target": {...},
    "candidates": [{...}],
    "relevantUserIds": ["..."]
  }
]
"""

import argparse
import json
import math

from app import rank_profiles, semantic_scores, skill_similarity


def precision_at_k(ranked_ids, relevant_ids, k):
    selected = ranked_ids[:k]
    return len(set(selected) & set(relevant_ids)) / k if k else 0


def recall_at_k(ranked_ids, relevant_ids, k):
    return len(set(ranked_ids[:k]) & set(relevant_ids)) / len(relevant_ids) if relevant_ids else 0


def reciprocal_rank(ranked_ids, relevant_ids):
    for index, user_id in enumerate(ranked_ids, start=1):
        if user_id in relevant_ids:
            return 1 / index
    return 0


def ndcg_at_k(ranked_ids, relevant_ids, k):
    dcg = sum(
        1 / math.log2(index + 2)
        for index, user_id in enumerate(ranked_ids[:k])
        if user_id in relevant_ids
    )
    ideal = sum(1 / math.log2(index + 2) for index in range(min(len(relevant_ids), k)))
    return dcg / ideal if ideal else 0


def rank_baseline(target, candidates, algorithm):
    if algorithm == "skills-only":
        scored = [
            (skill_similarity(target.get("skills"), candidate.get("skills"))[0], candidate)
            for candidate in candidates
        ]
    elif algorithm == "content-only":
        scored = list(zip(semantic_scores(target, candidates), candidates))
    else:
        raise ValueError(f"Unknown baseline: {algorithm}")
    scored.sort(key=lambda item: item[0], reverse=True)
    return [str(candidate["user"]) for _, candidate in scored]


def evaluate(fixtures, mode, k, algorithm="hybrid-adaptive"):
    rows = []
    for fixture in fixtures:
        if algorithm == "hybrid-adaptive":
            ranked = rank_profiles(
                fixture["target"],
                fixture["candidates"],
                mode=mode,
                top_n=max(k, len(fixture["candidates"])),
            )
            ranked_ids = [item["userId"] for item in ranked]
        else:
            ranked_ids = rank_baseline(fixture["target"], fixture["candidates"], algorithm)
        relevant = set(fixture["relevantUserIds"])
        rows.append({
            "precision": precision_at_k(ranked_ids, relevant, k),
            "recall": recall_at_k(ranked_ids, relevant, k),
            "mrr": reciprocal_rank(ranked_ids, relevant),
            "ndcg": ndcg_at_k(ranked_ids, relevant, k),
        })
    metrics = {
        metric: round(sum(row[metric] for row in rows) / len(rows), 4) if rows else 0
        for metric in ["precision", "recall", "mrr", "ndcg"]
    }
    metrics["fixtures"] = len(rows)
    metrics["mode"] = mode
    metrics["k"] = k
    metrics["algorithm"] = algorithm
    return metrics


def compare(fixtures, mode, k):
    models = [
        evaluate(fixtures, mode, k, algorithm)
        for algorithm in ["skills-only", "content-only", "hybrid-adaptive"]
    ]
    best_score = max((row["ndcg"], row["mrr"], row["recall"]) for row in models)
    winners = [
        row["algorithm"] for row in models
        if (row["ndcg"], row["mrr"], row["recall"]) == best_score
    ]
    return {
        "dataset": "Labelled alumni recommendation fixtures",
        "mode": mode,
        "k": k,
        "models": models,
        "winner": " + ".join(winners),
        "methodology": [
            "Ground-truth relevant alumni are labelled in version-controlled fixtures.",
            "All models rank the same candidate sets.",
            "Precision, recall, reciprocal rank and NDCG are reported at the same K.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("fixtures")
    parser.add_argument("--mode", choices=["network", "mentor", "referral"], default="network")
    parser.add_argument("-k", type=int, default=5)
    parser.add_argument("--compare", action="store_true")
    args = parser.parse_args()
    with open(args.fixtures, encoding="utf-8") as fixture_file:
        data = json.load(fixture_file)
    report = compare(data, args.mode, args.k) if args.compare else evaluate(data, args.mode, args.k)
    print(json.dumps(report, indent=2))
