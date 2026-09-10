import json
import unittest
from pathlib import Path

from evaluate import compare, evaluate, rank_baseline


class EvaluationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        fixture_path = Path(__file__).parent.parent / "fixtures" / "labelled_recommendations.json"
        cls.fixtures = json.loads(fixture_path.read_text(encoding="utf-8"))

    def test_baselines_rank_every_candidate(self):
        fixture = self.fixtures[0]
        ranked = rank_baseline(fixture["target"], fixture["candidates"], "skills-only")
        self.assertEqual(len(ranked), len(fixture["candidates"]))

    def test_evaluation_metrics_are_bounded(self):
        report = evaluate(self.fixtures, "mentor", 1)
        for metric in ["precision", "recall", "mrr", "ndcg"]:
            self.assertGreaterEqual(report[metric], 0)
            self.assertLessEqual(report[metric], 1)

    def test_comparison_includes_baselines_and_hybrid(self):
        report = compare(self.fixtures, "mentor", 1)
        self.assertEqual(
            [model["algorithm"] for model in report["models"]],
            ["skills-only", "content-only", "hybrid-adaptive"],
        )
        self.assertIn("hybrid-adaptive", report["winner"])


if __name__ == "__main__":
    unittest.main()
