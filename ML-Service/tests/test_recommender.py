import unittest

from app import feedback_adjustments, normalize_skills, rank_profiles, skill_similarity


class RecommenderTests(unittest.TestCase):
    def setUp(self):
        self.target = {
            "_id": "target-profile",
            "user": "target-user",
            "firstName": "Target",
            "skills": ["ReactJS", "Node", "MongoDB"],
            "domain": "Software",
            "branch": "CSE",
            "location": "Bengaluru",
            "endYear": 2024,
            "designation": "Developer",
        }
        self.match = {
            "_id": "match-profile",
            "user": "match-user",
            "firstName": "Match",
            "skills": ["React", "Node.js", "AWS"],
            "domain": "Software",
            "branch": "CSE",
            "location": "Bengaluru",
            "endYear": 2019,
            "designation": "Senior Engineer",
        }
        self.other = {
            "_id": "other-profile",
            "user": "other-user",
            "firstName": "Other",
            "skills": ["Accounting"],
            "domain": "Finance",
            "branch": "Commerce",
            "location": "Delhi",
            "endYear": 2023,
        }

    def test_skill_aliases_are_normalized(self):
        self.assertEqual(normalize_skills(["ReactJS", "Node"]), {"react", "node.js"})

    def test_skill_similarity_returns_matches(self):
        score, matches = skill_similarity(self.target["skills"], self.match["skills"])
        self.assertGreater(score, 0)
        self.assertEqual(matches, ["node.js", "react"])

    def test_hybrid_ranking_prefers_relevant_profile(self):
        results = rank_profiles(self.target, [self.other, self.match], "mentor", 2)
        self.assertEqual(results[0]["userId"], "match-user")
        self.assertTrue(results[0]["reasons"])

    def test_feedback_hides_recommendations(self):
        feedback = [{"recommendedUser": "match-user", "action": "hidden"}]
        results = rank_profiles(self.target, [self.match, self.other], "network", 10, feedback)
        self.assertNotIn("match-user", [item["userId"] for item in results])

    def test_top_n_is_respected(self):
        results = rank_profiles(self.target, [self.match, self.other], "network", 1)
        self.assertEqual(len(results), 1)

    def test_positive_feedback_produces_a_bounded_boost(self):
        adjustments = feedback_adjustments([
            {"recommendedUser": "match-user", "action": "relevant"},
            {"recommendedUser": "other-user", "action": "not_relevant"},
        ])
        self.assertEqual(adjustments["match-user"], 0.08)
        self.assertEqual(adjustments["other-user"], -0.08)


if __name__ == "__main__":
    unittest.main()
