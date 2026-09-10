import logging
import os
import re
from datetime import datetime, timezone

import numpy as np
from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("alumni-recommender")

app = Flask(__name__)
CORS(app, origins=os.getenv("CORS_ORIGIN", "http://localhost:4000").split(","))

MONGO_URI = os.getenv("MONGO_URI", "mongodb://127.0.0.1:27017")
DB_NAME = os.getenv("DB_NAME", "alumniDB")
MODEL_VERSION = "hybrid-adaptive-v2"
MAX_TOP_N = 50

client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3000)
db = client[DB_NAME]

MODE_WEIGHTS = {
    "network": {
        "text": 0.35,
        "skills": 0.25,
        "domain": 0.15,
        "branch": 0.10,
        "location": 0.05,
        "experience": 0.10,
    },
    "mentor": {
        "text": 0.25,
        "skills": 0.25,
        "domain": 0.20,
        "branch": 0.05,
        "location": 0.05,
        "experience": 0.20,
    },
    "referral": {
        "text": 0.25,
        "skills": 0.30,
        "domain": 0.20,
        "branch": 0.05,
        "location": 0.05,
        "experience": 0.15,
    },
}


def normalize_text(value):
    return re.sub(r"\s+", " ", str(value or "").strip().lower())


def normalize_skills(skills):
    aliases = {
        "node": "node.js",
        "nodejs": "node.js",
        "reactjs": "react",
        "javascript": "javascript",
        "js": "javascript",
        "machine learning": "machine-learning",
        "ml": "machine-learning",
        "artificial intelligence": "artificial-intelligence",
        "ai": "artificial-intelligence",
    }
    normalized = set()
    for skill in skills or []:
        value = normalize_text(skill)
        if value:
            normalized.add(aliases.get(value, value))
    return normalized


def profile_text(alumni):
    values = [
        alumni.get("branch"),
        alumni.get("degree"),
        alumni.get("domain"),
        alumni.get("company"),
        alumni.get("designation"),
        alumni.get("location"),
        alumni.get("bio"),
        " ".join(alumni.get("skills", [])),
    ]
    for work in alumni.get("workExperiences", []):
        values.extend([work.get("company"), work.get("workTitle"), work.get("industry")])
    for education in alumni.get("education", []):
        values.extend([education.get("course"), education.get("school")])
    return " ".join(filter(None, map(normalize_text, values)))


def exact_match(left, right):
    left_value, right_value = normalize_text(left), normalize_text(right)
    return 1.0 if left_value and left_value == right_value else 0.0


def skill_similarity(left, right):
    left_skills, right_skills = normalize_skills(left), normalize_skills(right)
    if not left_skills or not right_skills:
        return 0.0, []
    matches = sorted(left_skills & right_skills)
    return len(matches) / len(left_skills | right_skills), matches


def experience_score(target, candidate, mode):
    target_year = target.get("endYear") or 0
    candidate_year = candidate.get("endYear") or 0
    if not target_year or not candidate_year:
        return 0.0
    gap = target_year - candidate_year
    if mode == "mentor":
        return min(max(gap, 0) / 10, 1.0)
    return max(0.0, 1 - abs(gap) / 15)


def semantic_scores(target, candidates):
    documents = [profile_text(target)] + [profile_text(candidate) for candidate in candidates]
    if not any(document.strip() for document in documents):
        return np.zeros(len(candidates))
    try:
        word_matrix = TfidfVectorizer(
            stop_words="english", ngram_range=(1, 2), sublinear_tf=True
        ).fit_transform(documents)
        char_matrix = TfidfVectorizer(
            analyzer="char_wb", ngram_range=(3, 5), min_df=1, sublinear_tf=True
        ).fit_transform(documents)
        word_scores = cosine_similarity(word_matrix[0:1], word_matrix[1:]).flatten()
        char_scores = cosine_similarity(char_matrix[0:1], char_matrix[1:]).flatten()
        return (word_scores * 0.7) + (char_scores * 0.3)
    except ValueError:
        return np.zeros(len(candidates))


def feedback_adjustments(feedback):
    positive = {"relevant", "connected", "mentorship_requested"}
    negative = {"not_relevant"}
    return {
        str(item.get("recommendedUser")): (
            0.08 if item.get("action") in positive
            else -0.08 if item.get("action") in negative
            else 0
        )
        for item in (feedback or [])
    }


def build_reasons(candidate, signals, matches, mode):
    reasons = []
    if matches:
        reasons.append({
            "type": "skills",
            "label": f"{len(matches)} matching skill{'s' if len(matches) != 1 else ''}",
            "matches": matches[:8],
        })
    labels = {
        "domain": "Works in a matching career domain",
        "branch": "Same academic branch",
        "location": "Located in the same area",
    }
    for key, label in labels.items():
        if signals[key] > 0:
            reasons.append({"type": key, "label": label})
    if mode == "mentor" and signals["experience"] >= 0.2:
        reasons.append({"type": "experience", "label": "Has relevant senior experience"})
    if signals["text"] >= 0.2:
        reasons.append({"type": "profile", "label": "Similar career and profile interests"})
    if not reasons:
        reasons.append({"type": "discovery", "label": "Suggested to broaden your alumni network"})
    return reasons[:5]


def format_alumni(alumni, score, reasons, signals, mode):
    return {
        "id": str(alumni.get("_id")),
        "userId": str(alumni.get("user")),
        "firstName": alumni.get("firstName", ""),
        "lastName": alumni.get("lastName", ""),
        "branch": alumni.get("branch", ""),
        "degree": alumni.get("degree", ""),
        "endYear": alumni.get("endYear"),
        "company": alumni.get("company", ""),
        "designation": alumni.get("designation", ""),
        "domain": alumni.get("domain", ""),
        "location": alumni.get("location", ""),
        "skills": alumni.get("skills", []),
        "imageUrl": alumni.get("imageUrl", ""),
        "score": round(float(score), 4),
        "compatibility": round(float(score) * 100),
        "reasons": reasons,
        "signals": {key: round(float(value), 4) for key, value in signals.items()},
        "mode": mode,
        "modelVersion": MODEL_VERSION,
    }


def rank_profiles(target, candidates, mode="network", top_n=10, feedback=None):
    mode = mode if mode in MODE_WEIGHTS else "network"
    weights = MODE_WEIGHTS[mode]
    text_scores = semantic_scores(target, candidates)
    adaptive_adjustments = feedback_adjustments(feedback)
    hidden_ids = {
        str(item.get("recommendedUser"))
        for item in (feedback or [])
        if item.get("action") in {"hidden", "not_relevant"}
    }
    results = []
    for index, candidate in enumerate(candidates):
        if str(candidate.get("user")) in hidden_ids:
            continue
        skills, matches = skill_similarity(target.get("skills"), candidate.get("skills"))
        signals = {
            "text": text_scores[index],
            "skills": skills,
            "domain": exact_match(target.get("domain"), candidate.get("domain")),
            "branch": exact_match(target.get("branch"), candidate.get("branch")),
            "location": exact_match(target.get("location"), candidate.get("location")),
            "experience": experience_score(target, candidate, mode),
        }
        score = sum(signals[key] * weight for key, weight in weights.items())
        score = min(max(score + adaptive_adjustments.get(str(candidate.get("user")), 0), 0), 1)
        reasons = build_reasons(candidate, signals, matches, mode)
        results.append(format_alumni(candidate, score, reasons, signals, mode))
    results.sort(key=lambda item: item["score"], reverse=True)
    return results[:top_n]


def parse_request():
    payload = request.get_json(silent=True) or {}
    user_id = payload.get("userId")
    mode = payload.get("mode", "network")
    try:
        top_n = int(payload.get("topN", 10))
    except (TypeError, ValueError):
        top_n = 10
    return user_id, mode, min(max(top_n, 1), MAX_TOP_N)


@app.post("/recommend")
@app.post("/recommend/combined")
@app.post("/recommend/knn")
def recommend():
    try:
        user_id, mode, top_n = parse_request()
        if not user_id:
            return jsonify({"status": "fail", "message": "userId is required"}), 400
        if mode not in MODE_WEIGHTS:
            return jsonify({"status": "fail", "message": "Unsupported recommendation mode"}), 400

        target = db.alumnis.find_one({"user": _object_id(user_id)})
        if not target:
            return jsonify({
                "status": "success",
                "data": {
                    "recommendations": [],
                    "mode": mode,
                    "modelVersion": MODEL_VERSION,
                    "coldStart": True,
                    "message": "Complete your alumni profile to receive recommendations.",
                },
            })

        candidates = list(db.alumnis.find({
            "user": {"$ne": target.get("user")},
            "verified": True,
        }))
        feedback = list(db.recommendationfeedbacks.find({"viewer": target.get("user")}))
        recommendations = rank_profiles(target, candidates, mode, top_n, feedback)
        completeness_fields = ["branch", "domain", "designation", "skills", "bio", "company"]
        completeness = sum(bool(target.get(field)) for field in completeness_fields) / len(completeness_fields)

        return jsonify({
            "status": "success",
            "data": {
                "recommendations": recommendations,
                "mode": mode,
                "modelVersion": MODEL_VERSION,
                "profileCompleteness": round(completeness * 100),
                "coldStart": completeness < 0.5,
                "generatedAt": datetime.now(timezone.utc).isoformat(),
            },
        })
    except Exception as error:
        logger.exception("Recommendation request failed")
        return jsonify({"status": "fail", "message": "Recommendation service error"}), 500


def _object_id(value):
    from bson import ObjectId
    try:
        return ObjectId(value)
    except Exception:
        return value


@app.get("/health")
def health():
    try:
        db.command("ping")
        database_status = "connected"
    except Exception:
        database_status = "unavailable"
    status_code = 200 if database_status == "connected" else 503
    return jsonify({
        "status": "ok" if status_code == 200 else "degraded",
        "database": database_status,
        "modelVersion": MODEL_VERSION,
    }), status_code


if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", "5001")),
        debug=os.getenv("FLASK_DEBUG", "false").lower() == "true",
    )
