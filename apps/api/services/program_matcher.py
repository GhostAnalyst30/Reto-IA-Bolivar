"""Keyword/score matcher: characterization + vocational + twin chat → academic programs."""
from __future__ import annotations

import re

from core.supabase_client import get_supabase

DOMAINS = ("tech", "industrial", "business", "research", "creative")

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "tech": [
        "sistemas", "software", "program", "datos", "data", "comput", "tecnolog",
        "informát", "informatic", "digital", "algoritm", "redes", "ia", "inteligencia",
    ],
    "industrial": [
        "industrial", "procesos", "logíst", "logist", "producción", "produccion",
        "calidad", "operaciones", "manufactura", "cadena", "suministro",
    ],
    "business": [
        "administr", "empresa", "negocios", "finanzas", "marketing", "gestión",
        "gestion", "emprend", "comercio", "contad",
    ],
    "research": [
        "investig", "ciencias", "laboratorio", "posgrado", "científico", "cientifico",
    ],
    "creative": [
        "diseño", "diseno", "arte", "creativ", "comunicaci", "audiovisual",
    ],
}

CHAR_TAG_TO_DOMAIN = {
    "intereses": None,  # handled via choice text
    "visual": "creative",
    "kinestesico": "industrial",
    "auditivo": "business",
}

CHOICE_TO_DOMAIN = {
    "tecnología": "tech",
    "tecnologia": "tech",
    "emprendimiento": "business",
    "investigación": "research",
    "investigacion": "research",
    "bienestar": "business",
    "artes": "creative",
    "trabajar en una empresa": "business",
    "emprender": "business",
    "estudiar un posgrado": "research",
    "investigar": "research",
}

CHAT_KEYWORDS = {
    "tech": ["program", "código", "codigo", "software", "app", "datos", "python", "sistema"],
    "industrial": ["proceso", "planta", "logística", "logistica", "producción", "calidad"],
    "business": ["negocio", "empresa", "emprend", "finanza", "marketing", "lider"],
    "research": ["investig", "tesis", "laboratorio", "ciencia"],
    "creative": ["diseño", "diseno", "creativ", "arte"],
}


def _empty_vector() -> dict[str, float]:
    return {d: 0.0 for d in DOMAINS}


def _normalize(vec: dict[str, float]) -> dict[str, float]:
    total = sum(max(0.0, v) for v in vec.values())
    if total <= 0:
        return _empty_vector()
    return {k: max(0.0, v) / total for k, v in vec.items()}


def features_from_characterization(responses: list[dict] | None) -> dict[str, float]:
    vec = _empty_vector()
    if not responses:
        return vec
    for r in responses:
        tags = r.get("tags") or []
        val = r.get("value")
        if isinstance(val, str):
            key = val.strip().lower()
            domain = CHOICE_TO_DOMAIN.get(key)
            if domain:
                vec[domain] += 2.0
            continue
        if not isinstance(val, (int, float)):
            continue
        score = float(val)
        if r.get("reverse"):
            score = 6.0 - score
        weight = max(0.0, score - 2.5)
        for t in tags:
            if t in ("intereses", "motivacion", "metas"):
                continue
            mapped = CHAR_TAG_TO_DOMAIN.get(t)
            if mapped:
                vec[mapped] += weight
            if t == "visual":
                vec["creative"] += weight * 0.5
                vec["tech"] += weight * 0.3
    return _normalize(vec)


def features_from_vocational(
    responses: list[dict] | None,
    questions: list[dict] | None = None,
) -> dict[str, float]:
    vec = _empty_vector()
    if not responses:
        return vec
    q_by_id = {q["id"]: q for q in (questions or [])}
    for r in responses:
        q = q_by_id.get(r.get("question_id"), {})
        val = r.get("value")
        tags = r.get("tags") or q.get("tags") or []
        domain_map = q.get("domain_map") or {}

        if isinstance(val, str):
            domain = domain_map.get(val) or CHOICE_TO_DOMAIN.get(val.strip().lower())
            if domain:
                vec[domain] += 2.5
            continue
        if isinstance(val, (int, float)):
            weight = max(0.0, float(val) - 2.5)
            for t in tags:
                if t in DOMAINS:
                    vec[t] += weight
    return _normalize(vec)


def features_from_chat(messages: list[dict] | None) -> dict[str, float]:
    vec = _empty_vector()
    if not messages:
        return vec
    blob = " ".join(
        (m.get("content") or "").lower()
        for m in messages
        if m.get("role") == "user"
    )
    blob = re.sub(r"\s+", " ", blob)
    for domain, kws in CHAT_KEYWORDS.items():
        hits = sum(1 for kw in kws if kw in blob)
        vec[domain] += float(hits)
    return _normalize(vec)


def features_from_twin(twin: dict | None) -> dict[str, float]:
    """Boost domains from twin interests / learning style."""
    vec = _empty_vector()
    if not twin:
        return vec
    interests = " ".join(twin.get("interests") or []).lower()
    for domain, kws in DOMAIN_KEYWORDS.items():
        if any(kw in interests for kw in kws):
            vec[domain] += 1.5
    style = (twin.get("learning_style") or "").lower()
    if "kinest" in style:
        vec["industrial"] += 0.5
    if "visual" in style:
        vec["creative"] += 0.4
        vec["tech"] += 0.3
    return _normalize(vec)


def combine_features(
    characterization: dict[str, float],
    vocational: dict[str, float],
    chat: dict[str, float],
    twin_boost: dict[str, float] | None = None,
) -> tuple[dict[str, float], dict[str, float]]:
    """Returns (combined, weights_used)."""
    sources = []
    weights = []
    if any(characterization.values()):
        sources.append(characterization)
        weights.append(0.35)
    if any(vocational.values()):
        sources.append(vocational)
        weights.append(0.45)
    chat_merged = dict(chat)
    if twin_boost and any(twin_boost.values()):
        for k in DOMAINS:
            chat_merged[k] = chat_merged.get(k, 0) + twin_boost.get(k, 0)
        chat_merged = _normalize(chat_merged)
    if any(chat_merged.values()):
        sources.append(chat_merged)
        weights.append(0.20)

    if not sources:
        return _empty_vector(), {}

    total_w = sum(weights)
    weights = [w / total_w for w in weights]
    combined = _empty_vector()
    for src, w in zip(sources, weights):
        for k in DOMAINS:
            combined[k] += src.get(k, 0) * w
    return _normalize(combined), {
        "characterization": 0.35 if any(characterization.values()) else 0,
        "vocational": 0.45 if any(vocational.values()) else 0,
        "chat": 0.20 if any(chat_merged.values()) else 0,
    }


def program_domain_affinity(name: str, description: str | None = None) -> dict[str, float]:
    blob = f"{name} {description or ''}".lower()
    vec = _empty_vector()
    for domain, kws in DOMAIN_KEYWORDS.items():
        hits = sum(1 for kw in kws if kw in blob)
        vec[domain] += float(hits)
    if not any(vec.values()):
        # soft default spread so unknown programs still appear
        for d in DOMAINS:
            vec[d] = 0.2
    return _normalize(vec)


def score_programs(
    student_vec: dict[str, float],
    programs: list[dict],
) -> list[dict]:
    ranked = []
    for p in programs:
        pvec = program_domain_affinity(p.get("name") or "", p.get("description"))
        score = sum(student_vec.get(d, 0) * pvec.get(d, 0) for d in DOMAINS)
        ranked.append({
            "id": p.get("id"),
            "name": p.get("name"),
            "description": p.get("description"),
            "score": round(float(score), 4),
            "domains": pvec,
        })
    ranked.sort(key=lambda x: x["score"], reverse=True)
    if ranked and ranked[0]["score"] > 0:
        top = ranked[0]["score"]
        for r in ranked:
            r["affinity"] = round(r["score"] / top, 4) if top else 0.0
    else:
        for r in ranked:
            r["affinity"] = 0.0
    return ranked


async def build_recommendation(user_id: str, *, persist: bool = False, top_k: int = 3) -> dict:
    sb = get_supabase()

    twin_res = sb.table("digital_twin_profiles").select("*").eq("user_id", user_id).limit(1).execute()
    twin = twin_res.data[0] if twin_res.data else None

    psych = sb.table("psychometric_assessments").select("responses, status").eq("user_id", user_id).limit(1).execute()
    psych_row = psych.data[0] if psych.data else None
    char_responses = (psych_row or {}).get("responses") if (psych_row or {}).get("status") == "completed" else None

    voc = sb.table("vocational_assessments").select("*").eq("user_id", user_id).limit(1).execute()
    voc_row = voc.data[0] if voc.data else None
    voc_responses = (voc_row or {}).get("responses") if (voc_row or {}).get("status") == "completed" else None
    voc_questions = (voc_row or {}).get("questions")

    user_row = sb.table("users").select("institution_id").eq("id", user_id).limit(1).execute()
    inst = (user_row.data[0].get("institution_id") if user_row.data else None)

    chat_msgs: list[dict] = []
    chats = (
        sb.table("chats")
        .select("id")
        .eq("user_id", user_id)
        .eq("chat_type", "digital_twin")
        .order("updated_at", desc=True)
        .limit(3)
        .execute()
    )
    chat_ids = [c["id"] for c in (chats.data or [])]
    if chat_ids:
        msgs = (
            sb.table("messages")
            .select("role, content, chat_id")
            .in_("chat_id", chat_ids)
            .eq("role", "user")
            .order("created_at", desc=True)
            .limit(40)
            .execute()
        )
        chat_msgs = list(reversed(msgs.data or []))

    programs_q = sb.table("academic_programs").select("id, name, description, is_active").eq("is_active", True)
    if inst:
        programs_q = programs_q.eq("institution_id", inst)
    programs = programs_q.execute().data or []

    char_vec = features_from_characterization(char_responses)
    voc_vec = features_from_vocational(voc_responses, voc_questions)
    chat_vec = features_from_chat(chat_msgs)
    twin_vec = features_from_twin(twin)
    combined, weights = combine_features(char_vec, voc_vec, chat_vec, twin_vec)

    ranked = score_programs(combined, programs)
    top = ranked[:top_k]

    feature_nodes = [
        {"id": d, "label": d, "weight": round(combined.get(d, 0), 4)}
        for d in DOMAINS
        if combined.get(d, 0) > 0.05
    ]
    if twin and twin.get("learning_style"):
        feature_nodes.append({
            "id": "style",
            "label": f"estilo:{twin['learning_style']}",
            "weight": 0.5,
        })
    for interest in (twin or {}).get("interests") or []:
        feature_nodes.append({
            "id": f"int-{interest[:24]}",
            "label": interest,
            "weight": 0.4,
        })

    payload = {
        "features": combined,
        "feature_nodes": feature_nodes[:8],
        "source_weights": weights,
        "sources": {
            "characterization": bool(char_responses),
            "vocational": bool(voc_responses),
            "chat": bool(chat_msgs),
            "twin": bool(twin),
        },
        "programs": ranked,
        "recommended": top,
        "programs_active_count": len(programs),
    }

    if persist and voc_row:
        from datetime import datetime, timezone
        sb.table("vocational_assessments").update({
            "recommended_programs": top,
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }).eq("user_id", user_id).execute()

    return payload
