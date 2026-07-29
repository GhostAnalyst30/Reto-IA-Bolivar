"""Tests for program keyword matcher."""
import unittest

from services.program_matcher import (
    combine_features,
    features_from_characterization,
    features_from_vocational,
    score_programs,
)


class ProgramMatcherTests(unittest.TestCase):
    def test_tech_leaning_vocational_binary_tree(self):
        questions = [
            {
                "id": "v1",
                "options": [
                    {"value": "stem", "label": "Ciencia y tecnología", "next": "v2"},
                    {"value": "people", "label": "Personas", "next": None},
                ],
                "domain_map": {
                    "stem": {"tech": 2.0, "engineering": 1.0},
                    "people": {"business": 2.0},
                },
            },
            {
                "id": "v2",
                "options": [
                    {"value": "software", "label": "Software", "next": None},
                    {"value": "data", "label": "Datos", "next": None},
                ],
                "domain_map": {
                    "software": {"tech": 3.0},
                    "data": {"tech": 2.0, "science": 1.0},
                },
            },
        ]
        responses = [
            {"question_id": "v1", "value": "stem"},
            {"question_id": "v2", "value": "software"},
        ]
        vec = features_from_vocational(responses, questions)
        self.assertGreater(vec["tech"], vec["business"])
        self.assertGreater(vec["tech"], vec["society"])

    def test_characterization_choice(self):
        responses = [
            {"question_id": "c13", "value": "Tecnología", "tags": ["intereses"]},
            {"question_id": "c7", "value": 5, "tags": ["visual"]},
        ]
        vec = features_from_characterization(responses)
        self.assertGreater(vec["tech"] + vec["creative"], 0)

    def test_score_programs_prefers_sistemas(self):
        student = {
            "tech": 0.7,
            "industrial": 0.05,
            "engineering": 0.05,
            "science": 0.05,
            "business": 0.05,
            "creative": 0.05,
            "society": 0.05,
        }
        programs = [
            {"id": "1", "name": "Ingeniería de Sistemas y Computación", "description": "Escuela de Transformación Digital"},
            {"id": "2", "name": "Administración de Empresas", "description": "Escuela de Negocios"},
        ]
        ranked = score_programs(student, programs)
        self.assertEqual(ranked[0]["name"], "Ingeniería de Sistemas y Computación")

    def test_score_programs_society_path(self):
        student = {
            "tech": 0.05,
            "industrial": 0.05,
            "engineering": 0.05,
            "science": 0.05,
            "business": 0.1,
            "creative": 0.05,
            "society": 0.65,
        }
        programs = [
            {"id": "1", "name": "Derecho", "description": "Escuela de Negocios, Leyes y Sociedad"},
            {"id": "2", "name": "Ciencia de Datos", "description": "Escuela de Transformación Digital"},
        ]
        ranked = score_programs(student, programs)
        self.assertEqual(ranked[0]["name"], "Derecho")

    def test_combine_renormalizes_missing_sources(self):
        combined, weights = combine_features(
            {},
            {
                "tech": 1.0,
                "industrial": 0,
                "engineering": 0,
                "science": 0,
                "business": 0,
                "creative": 0,
                "society": 0,
            },
            {},
        )
        self.assertGreater(combined["tech"], 0.5)
        self.assertEqual(weights.get("vocational"), 0.45)


if __name__ == "__main__":
    unittest.main()
