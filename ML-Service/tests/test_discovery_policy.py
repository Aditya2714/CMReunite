import json
import unittest
from pathlib import Path
from discovery_policy import visible


class SharedPolicyTests(unittest.TestCase):
    def test_shared_policy_cases(self):
        cases = json.loads((Path(__file__).resolve().parents[2] / "fixtures" / "discovery-policy.json").read_text())
        for case in cases:
            with self.subTest(case=case["name"]):
                options = case["options"]
                self.assertEqual(visible(case["viewer"], case["account"], set(case["connected"]), include_self=options.get("includeSelf", False), purpose=options.get("purpose", "discovery")), case["expected"])
