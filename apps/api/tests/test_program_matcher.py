"""Tests for program keyword matcher."""
import unittest

from services.program_matcher import (
    combine_features,
    features_from_characterization,
    features_from_vocational,
    score_programs,
)


class ProgramMatcherTests(unittest.TestCase):
    def test_tech_leaning_vocational(self):
        questions = [
            {
                "id": "v1",
                "domain_map": {"Errores de software o automatizar tareas": "tech"},
                "tags": ["dominio"],
            },
            {"id": "v2", "tags": ["tech"]},
        ]
        responses = [
            {"question_id": "v1", "value": "Errores de software o automatizar tareas"},
            {"question_id": "v2", "value": 5, "tags": ["tech"]},
        ]
        vec = features_from_vocational(responses, questions)
        self.assertGreater(vec["tech"], vec["business"])

    def test_characterization_choice(self):
        responses = [
            {"question_id": "c13", "value": "Tecnología", "tags": ["intereses"]},
            {"question_id": "c7", "value": 5, "tags": ["visual"]},
        ]
        vec = features_from_characterization(responses)
        self.assertGreater(vec["tech"] + vec["creative"], 0)

    def test_score_programs_prefers_sistemas(self):
        student = {"tech": 0.7, "industrial": 0.1, "business": 0.1, "research": 0.05, "creative": 0.05}
        programs = [
            {"id": "1", "name": "Ingeniería de Sistemas", "description": "Software y datos"},
            {"id": "2", "name": "Administración de Empresas", "description": "Gestión y negocios"},
        ]
        ranked = score_programs(student, programs)
        self.assertEqual(ranked[0]["name"], "Ingeniería de Sistemas")

    def test_combine_renormalizes_missing_sources(self):
        combined, weights = combine_features(
            {},
            {"tech": 1.0, "industrial": 0, "business": 0, "research": 0, "creative": 0},
            {},
        )
        self.assertGreater(combined["tech"], 0.5)
        self.assertEqual(weights.get("vocational"), 0.45)


if __name__ == "__main__":
    unittest.main()
