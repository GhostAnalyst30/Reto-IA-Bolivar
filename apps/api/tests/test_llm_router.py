"""Tests for OpenRouter multi-model fallback and counselor escalation."""
import unittest
from unittest.mock import patch

from core.config import Settings
from core import llm_router


class OpenRouterModelChainTests(unittest.TestCase):
    def test_chain_prefers_primary_and_caps_at_max(self):
        s = Settings(
            llm_model_tutor="model-a:free",
            llm_openrouter_free_models="model-a:free,model-b:free,model-c:free,model-d:free,model-e:free,model-f:free",
            llm_max_openrouter_attempts=5,
        )
        chain = s.openrouter_model_chain()
        self.assertEqual(chain[0], "model-a:free")
        self.assertEqual(len(chain), 5)
        self.assertNotIn("model-f:free", chain)

    def test_chain_dedupes(self):
        s = Settings(
            llm_model_tutor="x:free",
            llm_openrouter_free_models="x:free,y:free,x:free",
            llm_max_openrouter_attempts=5,
        )
        self.assertEqual(s.openrouter_model_chain(), ["x:free", "y:free"])


def _provider_patches(*, models_csv: str, primary: str = "model-a:free"):
    return (
        patch.object(llm_router.settings, "openrouter_api_key", "sk-test"),
        patch.object(llm_router.settings, "huggingface_api_key", ""),
        patch.object(llm_router.settings, "llm_provider_order", "openrouter,huggingface"),
        patch.object(llm_router.settings, "guardrails_enabled", False),
        patch.object(llm_router.settings, "llm_model_tutor", primary),
        patch.object(llm_router.settings, "llm_openrouter_free_models", models_csv),
        patch.object(llm_router.settings, "llm_max_openrouter_attempts", 5),
    )


class CompleteWithFallbackTests(unittest.IsolatedAsyncioTestCase):
    async def test_succeeds_on_third_openrouter_model(self):
        calls: list[str] = []

        async def fake_complete(messages, model):
            calls.append(model)
            if model != "model-c:free":
                raise RuntimeError("fail")
            return "respuesta ok"

        patches = _provider_patches(
            models_csv="model-a:free,model-b:free,model-c:free",
            primary="model-a:free",
        )
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], \
             patch.object(llm_router, "_openrouter_complete", side_effect=fake_complete):
            reasoning, answer, provider = await llm_router.complete_with_fallback(
                [{"role": "user", "content": "hola"}],
                skip_thinking=True,
            )

        self.assertEqual(answer, "respuesta ok")
        self.assertEqual(provider, "openrouter")
        self.assertEqual(calls, ["model-a:free", "model-b:free", "model-c:free"])

    async def test_rate_limit_skips_to_next_model(self):
        calls: list[str] = []

        async def fake_complete(messages, model):
            calls.append(model)
            if model == "model-a:free":
                raise Exception("Error code: 429 - rate limit")
            return "ok after 429"

        patches = _provider_patches(models_csv="model-a:free,model-b:free")
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], \
             patch.object(llm_router, "_openrouter_complete", side_effect=fake_complete):
            _, answer, provider = await llm_router.complete_with_fallback(
                [{"role": "user", "content": "hola"}],
                skip_thinking=True,
            )

        self.assertEqual(answer, "ok after 429")
        self.assertEqual(provider, "openrouter")
        self.assertEqual(calls, ["model-a:free", "model-b:free"])

    async def test_total_failure_escalates_to_counselor(self):
        async def always_fail(messages, model):
            raise RuntimeError("down")

        patches = _provider_patches(models_csv="a:free,b:free", primary="a:free")
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], \
             patch.object(llm_router, "_openrouter_complete", side_effect=always_fail):
            _, answer, provider = await llm_router.complete_with_fallback(
                [{"role": "user", "content": "hola"}],
                skip_thinking=True,
                escalate_on_failure=True,
            )

        self.assertEqual(provider, "counselor")
        self.assertIn("bienestar", answer.lower())

    async def test_stream_marks_counselor_on_failure(self):
        async def always_fail(messages, model):
            raise RuntimeError("down")

        patches = _provider_patches(models_csv="a:free", primary="a:free")
        with patches[0], patches[1], patches[2], patches[3], patches[4], patches[5], patches[6], \
             patch.object(llm_router, "_openrouter_complete", side_effect=always_fail):
            events = []
            async for ev in llm_router.stream_with_fallback(
                [{"role": "user", "content": "hola"}],
                skip_thinking=True,
                escalate_on_failure=True,
            ):
                events.append(ev)

        done = next(e for e in events if e.get("type") == "done")
        self.assertTrue(done.get("counselor"))
        self.assertEqual(done.get("provider"), "counselor")


class SessionsRouterMountedTests(unittest.TestCase):
    def test_sessions_router_included(self):
        from main import app
        paths = {getattr(r, "path", "") for r in app.routes}
        self.assertTrue(
            any(p.startswith("/sessions") for p in paths),
            f"sessions routes missing from app; got {sorted(p for p in paths if p)}",
        )


if __name__ == "__main__":
    unittest.main()
