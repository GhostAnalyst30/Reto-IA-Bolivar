"""Tests for the de-biased program matcher."""
import asyncio
import unittest

from agents.vocational_questions import _normalize_weights
from services.program_matcher import (
    combine_features,
    features_from_characterization,
    features_from_vocational,
    program_domain_affinity,
    score_programs,
)


class VocationalNormalizationTests(unittest.TestCase):
    def test_domain_map_normalized_to_unit_sum(self):
        from agents.vocational_questions import get_vocational_questions

        for q in get_vocational_questions():
            dmap = q.get("domain_map") or {}
            for option_value, weights in dmap.items():
                total = sum(max(0.0, float(w)) for w in weights.values())
                self.assertAlmostEqual(
                    total, 1.0, places=5,
                    msg=f"{q['id']} option {option_value} sums {total}, expected 1.0",
                )

    def test_normalize_weights_preserves_proportions(self):
        out = _normalize_weights({"tech": 3.0, "science": 1.0})
        self.assertAlmostEqual(out["tech"], 0.75)
        self.assertAlmostEqual(out["science"], 0.25)
        self.assertAlmostEqual(sum(out.values()), 1.0)

    def test_normalize_weights_zero_returns_zeros(self):
        out = _normalize_weights({"tech": 0.0, "science": 0.0})
        self.assertEqual(sum(out.values()), 0.0)


class CharacterizationVocationalBlockTests(unittest.TestCase):
    def test_characterization_vocational_block_feeds_domains(self):
        from agents.question_agent import get_fixed_questions

        questions = get_fixed_questions()
        q_by_id = {q["id"]: q for q in questions}
        # Answer c13 (Tecnología) and c16 (oficina_tecnica) -> tech leaning
        responses = [
            {"question_id": "c13", "value": "Tecnologia", "tags": q_by_id["c13"]["tags"]},
            {"question_id": "c16", "value": "oficina_tecnica", "tags": q_by_id["c16"]["tags"]},
        ]
        vec = features_from_characterization(responses, questions)
        self.assertGreater(vec["tech"], 0.3)
        self.assertGreater(vec["tech"], vec["society"])

    def test_characterization_likert_does_not_feed_domains(self):
        """Psychometric Likert answers must not map to domains (no stereotyping)."""
        responses = [
            {"question_id": "c7", "value": 5, "tags": ["visual"]},      # visual -> creative (old bias)
            {"question_id": "c10", "value": 5, "tags": ["kinestesico"]},  # kinestesico -> industrial (old bias)
            {"question_id": "c9", "value": 5, "tags": ["auditivo"]},   # auditivo -> business (old bias)
        ]
        vec = features_from_characterization(responses, [])
        # All-zero vector: Likert no longer feeds the domain vector
        self.assertEqual(sum(vec.values()), 0.0)

    def test_characterization_balanced_answers_produce_balanced_vector(self):
        from agents.question_agent import get_fixed_questions

        questions = get_fixed_questions()
        q_by_id = {q["id"]: q for q in questions}
        # Pick the first option of each vocational question c16-c20
        responses = []
        for qid in ("c16", "c17", "c18", "c19", "c20"):
            q = q_by_id[qid]
            first_opt = q["options"][0]
            responses.append({"question_id": qid, "value": first_opt["value"], "tags": q["tags"]})
        vec = features_from_characterization(responses, questions)
        # The vector should be non-zero and normalized
        self.assertGreater(sum(vec.values()), 0.0)
        self.assertAlmostEqual(sum(vec.values()), 1.0, places=5)


class CombineFeaturesTests(unittest.TestCase):
    def test_combine_equal_weights_when_all_sources_present(self):
        char = {"tech": 0.5, "industrial": 0.5, "engineering": 0, "science": 0, "business": 0, "creative": 0, "society": 0}
        voc = {"tech": 0.5, "industrial": 0.5, "engineering": 0, "science": 0, "business": 0, "creative": 0, "society": 0}
        chat = {"tech": 0.5, "industrial": 0.5, "engineering": 0, "science": 0, "business": 0, "creative": 0, "society": 0}
        combined, weights = combine_features(char, voc, chat)
        # All three sources present -> equal weights (no fixed 0.35/0.45/0.20 bias)
        self.assertAlmostEqual(weights["characterization"], 1 / 3, places=3)
        self.assertAlmostEqual(weights["vocational"], 1 / 3, places=3)
        self.assertAlmostEqual(weights["chat"], 1 / 3, places=3)

    def test_combine_renormalizes_missing_sources(self):
        combined, weights = combine_features(
            {},
            {"tech": 1.0, "industrial": 0, "engineering": 0, "science": 0, "business": 0, "creative": 0, "society": 0},
            {},
        )
        self.assertGreater(combined["tech"], 0.9)
        self.assertNotIn("characterization", weights)
        self.assertAlmostEqual(weights["vocational"], 1.0, places=3)


class ProgramAffinityTests(unittest.TestCase):
    def test_program_affinity_multi_match_no_break(self):
        # "Ingeniería Ambiental" must accumulate science + industrial + engineering,
        # not stop at the first substring match.
        vec = program_domain_affinity("Ingeniería Ambiental", "Escuela de Ingeniería")
        self.assertGreater(vec["science"], 0.0)
        self.assertGreater(vec["industrial"], 0.0)
        self.assertGreater(vec["engineering"], 0.0)

    def test_program_affinity_uses_domain_tags_from_db(self):
        tags = {"tech": 0.8, "engineering": 0.15, "science": 0.05}
        vec = program_domain_affinity("Whatever Name", "ignored", domain_tags=tags)
        self.assertAlmostEqual(vec["tech"], 0.8, places=3)
        self.assertAlmostEqual(vec["engineering"], 0.15, places=3)
        # Normalized to sum 1
        self.assertAlmostEqual(sum(vec.values()), 1.0, places=3)


class ScoreProgramsTests(unittest.TestCase):
    def test_score_programs_prefers_sistemas(self):
        student = {
            "tech": 0.7, "industrial": 0.05, "engineering": 0.05,
            "science": 0.05, "business": 0.05, "creative": 0.05, "society": 0.05,
        }
        programs = [
            {"id": "1", "name": "Ingeniería de Sistemas y Computación", "description": "Escuela de Transformación Digital",
             "domain_tags": {"tech": 0.8, "engineering": 0.15, "science": 0.05}},
            {"id": "2", "name": "Administración de Empresas", "description": "Escuela de Negocios",
             "domain_tags": {"business": 0.85, "society": 0.1, "industrial": 0.05}},
        ]
        ranked = score_programs(student, programs)
        self.assertEqual(ranked[0]["name"], "Ingeniería de Sistemas y Computación")

    def test_score_programs_society_path(self):
        student = {
            "tech": 0.05, "industrial": 0.05, "engineering": 0.05,
            "science": 0.05, "business": 0.1, "creative": 0.05, "society": 0.65,
        }
        programs = [
            {"id": "1", "name": "Derecho", "description": "Escuela de Negocios, Leyes y Sociedad",
             "domain_tags": {"society": 0.9, "business": 0.1}},
            {"id": "2", "name": "Ciencia de Datos", "description": "Escuela de Transformación Digital",
             "domain_tags": {"tech": 0.6, "science": 0.3, "business": 0.1}},
        ]
        ranked = score_programs(student, programs)
        self.assertEqual(ranked[0]["name"], "Derecho")


class EmbeddingBlendTests(unittest.TestCase):
    def test_blend_with_embeddings_mocked(self):
        async def fake_embed_text(text):
            return [1.0, 0.0]

        def fake_cosine_sim(a, b):
            return 1.0 if a == b else 0.0

        import core.embeddings as emb

        orig_embed = emb.embed_text
        orig_cos = emb.cosine_sim
        emb.embed_text = fake_embed_text
        emb.cosine_sim = fake_cosine_sim

        student = {"tech": 0.9, "industrial": 0.05, "engineering": 0.05,
                   "science": 0, "business": 0, "creative": 0, "society": 0}
        programs = [
            {"id": "p1", "name": "Ingeniería de Sistemas", "description": "Digital",
             "domain_tags": {"tech": 0.8, "engineering": 0.15, "science": 0.05}},
            {"id": "p2", "name": "Diseño", "description": "Creativo",
             "domain_tags": {"creative": 0.85, "business": 0.1, "tech": 0.05}},
        ]
        ranked = score_programs(student, programs)

        # Simulate the blend logic from build_recommendation in isolation
        emb_by_pid = {"p1": [1.0, 0.0], "p2": [0.0, 1.0]}
        sims = {pid: fake_cosine_sim([1.0, 0.0], v) for pid, v in emb_by_pid.items()}
        max_domain = max((r["score"] for r in ranked), default=0.0) or 1.0
        max_sim = max(sims.values()) or 1.0
        for r in ranked:
            domain_norm = r["score"] / max_domain
            sim_norm = sims.get(r["id"], 0.0) / max_sim
            r["final_score"] = round(0.7 * domain_norm + 0.3 * sim_norm, 4)
        ranked.sort(key=lambda x: x["final_score"], reverse=True)

        emb.embed_text = orig_embed
        emb.cosine_sim = orig_cos

        self.assertEqual(ranked[0]["name"], "Ingeniería de Sistemas")
        self.assertGreater(ranked[0]["final_score"], 0.7)


if __name__ == "__main__":
    unittest.main()
