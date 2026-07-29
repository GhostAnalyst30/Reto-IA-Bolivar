"""Keyword/score matcher: characterization + vocational + twin chat → academic programs."""
from __future__ import annotations

import re

from core.supabase_client import get_supabase

# Dominios alineados al catálogo UTB (escuelas y familias de pregrado)
DOMAINS = (
    "tech",
    "industrial",
    "engineering",
    "science",
    "business",
    "creative",
    "society",
)

DOMAIN_LABELS: dict[str, str] = {
    "tech": "Tecnología digital",
    "industrial": "Procesos industriales",
    "engineering": "Ingeniería aplicada",
    "science": "Ciencias aplicadas",
    "business": "Negocios y economía",
    "creative": "Diseño y comunicación",
    "society": "Sociedad y personas",
}

# Alias legacy (preguntas/tests antiguos) → dominio actual
DOMAIN_ALIASES: dict[str, str] = {
    "research": "science",
}

DOMAIN_KEYWORDS: dict[str, list[str]] = {
    "tech": [
        "sistemas", "computación", "computacion", "software", "program", "datos", "data",
        "informát", "informatic", "digital", "algoritm", "redes", "ia", "inteligencia",
        "ciencia de datos",
    ],
    "industrial": [
        "industrial", "procesos", "logíst", "logist", "producción", "produccion",
        "calidad", "operaciones", "manufactura", "cadena", "suministro",
    ],
    "engineering": [
        "civil", "eléctric", "electric", "electrón", "electron", "mecánic", "mecanic",
        "mecatrón", "mecatron", "naval", "infraestruct", "automatiz", "robót", "robot",
        "energ", "circuit",
    ],
    "science": [
        "ambiental", "químic", "quimic", "bioméd", "biomed", "laboratorio", "investig",
        "ciencias", "sostenib", "salud", "material",
    ],
    "business": [
        "administr", "empresa", "negocios", "finanzas", "marketing", "gestión", "gestion",
        "emprend", "comercio", "contad", "econom", "internacional",
    ],
    "creative": [
        "diseño", "diseno", "arquitect", "arte", "creativ", "comunicaci", "audiovisual",
        "medios", "marca", "contenido",
    ],
    "society": [
        "derecho", "psicolog", "política", "politica", "relaciones internacionales",
        "justicia", "sociedad", "diplomacia", "bienestar", "humano",
    ],
}

CHAR_TAG_TO_DOMAIN = {
    "intereses": None,
    "visual": "creative",
    "kinestesico": "industrial",
    "auditivo": "business",
}

CHOICE_TO_DOMAIN = {
    "tecnología": "tech",
    "tecnologia": "tech",
    "emprendimiento": "business",
    "investigación": "science",
    "investigacion": "science",
    "bienestar": "society",
    "artes": "creative",
    "trabajar en una empresa": "business",
    "emprender": "business",
    "estudiar un posgrado": "science",
    "investigar": "science",
}

CHAT_KEYWORDS = {
    "tech": ["program", "código", "codigo", "software", "app", "datos", "python", "sistema", "ia"],
    "industrial": ["proceso", "planta", "logística", "logistica", "producción", "calidad"],
    "engineering": ["máquina", "maquina", "circuito", "obra", "estructur", "mecán", "electr"],
    "science": ["ambiental", "química", "quimica", "bioméd", "laboratorio", "ciencia"],
    "business": ["negocio", "empresa", "emprend", "finanza", "marketing", "lider", "contab"],
    "creative": ["diseño", "diseno", "creativ", "arte", "arquitect", "comunic"],
    "society": ["derecho", "psicolog", "política", "politica", "justicia", "sociedad"],
}
    "tech": ["program", "código", "codigo", "software", "app", "datos", "python", "sistema", "ia"],
    "industrial": ["proceso", "planta", "logística", "logistica", "producción", "calidad"],
    "engineering": ["máquina", "maquina", "circuito", "obra", "estructur", "mecán", "electr"],
    "science": ["ambiental", "química", "quimica", "bioméd", "laboratorio", "ciencia"],
    "business": ["negocio", "empresa", "emprend", "finanza", "marketing", "lider", "contab"],
    "creative": ["diseño", "diseno", "creativ", "arte", "arquitect", "comunic"],
    "society": ["derecho", "psicolog", "política", "politica", "justicia", "sociedad"],
}


def _resolve_domain(name: str) -> str | None:
    if name in DOMAINS:
        return name
    return DOMAIN_ALIASES.get(name)


def _empty_vector() -> dict[str, float]:
    return {d: 0.0 for d in DOMAINS}


def _normalize(vec: dict[str, float]) -> dict[str, float]:
    total = sum(max(0.0, v) for v in vec.values())
    if total <= 0:
        return _empty_vector()
    return {k: max(0.0, v) / total for k, v in vec.items()}


def _add_domain(vec: dict[str, float], domain: str | None, weight: float) -> None:
    resolved = _resolve_domain(domain) if domain else None
    if resolved and weight > 0:
        vec[resolved] = vec.get(resolved, 0.0) + weight


def _apply_domain_weights(vec: dict[str, float], mapping: object, scale: float = 1.0) -> None:
    """Accepts 'tech', {'tech': 2.5, 'science': 1.0}, or None."""
    if mapping is None:
        return
    if isinstance(mapping, str):
        _add_domain(vec, mapping, 2.5 * scale)
        return
    if isinstance(mapping, dict):
        for domain, weight in mapping.items():
            try:
                _add_domain(vec, str(domain), float(weight) * scale)
            except (TypeError, ValueError):
                continue


def _l1_norm(vec: dict[str, float]) -> float:
    return sum(max(0.0, float(v)) for v in vec.values())


def features_from_characterization(
    responses: list[dict] | None,
    questions: list[dict] | None = None,
) -> dict[str, float]:
    """Build a domain vector from the vocational block of characterization.

    Only choice questions carrying an explicit per-option ``domain_map``
    (c13, c15, c16-c20) feed the matcher. Likert psychometric responses
    (c1-c12) are intentionally ignored here: they describe motivation,
    wellbeing and learning styles, not vocational orientation, and mapping
    learning styles to domains (visual->creative, kinestesico->industrial,
    auditivo->business) was a stereotypical bias. Those Likert answers still
    feed the Digital Twin (twin_agent) and dropout-risk scoring.
    """
    vec = _empty_vector()
    if not responses:
        return vec
    q_by_id = {q["id"]: q for q in (questions or [])}
    for r in responses:
        val = r.get("value")
        if not isinstance(val, str):
            continue
        q = q_by_id.get(r.get("question_id"), {})
        opt_map = None
        for opt in q.get("options") or []:
            if isinstance(opt, dict) and opt.get("value") == val:
                opt_map = opt.get("domain_map")
                break
        if opt_map is None:
            # Legacy vocational tree: domain_map keyed by option value at q level
            qmap = q.get("domain_map") or {}
            if qmap:
                opt_map = qmap.get(val)
        if opt_map:
            _apply_domain_weights(vec, opt_map)
        else:
            domain = CHOICE_TO_DOMAIN.get(val.strip().lower())
            if domain:
                _add_domain(vec, domain, 1.0)
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
            # Prefer option value key; also try full label for legacy answers
            mapped = domain_map.get(val)
            if mapped is None:
                for opt in q.get("options") or []:
                    if isinstance(opt, dict) and opt.get("label") == val:
                        mapped = domain_map.get(opt.get("value"))
                        break
            if mapped is not None:
                _apply_domain_weights(vec, mapped)
            else:
                domain = CHOICE_TO_DOMAIN.get(val.strip().lower())
                _add_domain(vec, domain, 2.5)
            continue
        if isinstance(val, (int, float)):
            weight = max(0.0, float(val) - 2.5)
            for t in tags:
                resolved = _resolve_domain(t) if t not in ("dominio",) else None
                if resolved:
                    _add_domain(vec, resolved, weight)
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
        vec["engineering"] += 0.3
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
    """Returns (combined, weights_used).

    Weights are adaptive and proportional to each source's signal magnitude
    (L1 norm), not hard-coded. Since each source vector is normalized to sum 1,
    all present sources contribute equally when they carry comparable signal,
    eliminating the previous fixed 35/45/20 bias that always favored the
    vocational test over characterization and chat.
    """
    sources: list[dict[str, float]] = []
    raw_weights: list[float] = []
    labels: list[str] = []

    if any(characterization.values()):
        sources.append(characterization)
        raw_weights.append(max(_l1_norm(characterization), 1e-6))
        labels.append("characterization")
    if any(vocational.values()):
        sources.append(vocational)
        raw_weights.append(max(_l1_norm(vocational), 1e-6))
        labels.append("vocational")

    chat_merged = dict(chat)
    if twin_boost and any(twin_boost.values()):
        for k in DOMAINS:
            chat_merged[k] = chat_merged.get(k, 0) + twin_boost.get(k, 0)
        chat_merged = _normalize(chat_merged)
    if any(chat_merged.values()):
        sources.append(chat_merged)
        raw_weights.append(max(_l1_norm(chat_merged), 1e-6))
        labels.append("chat")

    if not sources:
        return _empty_vector(), {}

    total_w = sum(raw_weights)
    weights = [w / total_w for w in raw_weights]
    combined = _empty_vector()
    for src, w in zip(sources, weights):
        for k in DOMAINS:
            combined[k] += src.get(k, 0) * w
    return _normalize(combined), {label: w for label, w in zip(labels, weights)}


_EXPLICIT_PROGRAM_WEIGHTS: list[tuple[str, dict[str, float]]] = [
    ("sistemas", {"tech": 1.0}),
    ("ciencia de datos", {"tech": 0.75, "science": 0.25}),
    ("industrial", {"industrial": 1.0}),
    ("civil", {"engineering": 1.0}),
    ("eléctrica", {"engineering": 1.0}),
    ("electrica", {"engineering": 1.0}),
    ("electrónica", {"engineering": 0.85, "tech": 0.15}),
    ("electronica", {"engineering": 0.85, "tech": 0.15}),
    ("mecánica", {"engineering": 1.0}),
    ("mecanica", {"engineering": 1.0}),
    ("mecatrónica", {"engineering": 0.7, "tech": 0.3}),
    ("mecatronica", {"engineering": 0.7, "tech": 0.3}),
    ("naval", {"engineering": 1.0}),
    ("ambiental", {"science": 0.85, "industrial": 0.15}),
    ("química", {"science": 0.9, "industrial": 0.1}),
    ("quimica", {"science": 0.9, "industrial": 0.1}),
    ("biomédica", {"science": 0.7, "engineering": 0.3}),
    ("biomedica", {"science": 0.7, "engineering": 0.3}),
    ("arquitectura", {"creative": 0.75, "engineering": 0.25}),
    ("diseño", {"creative": 1.0}),
    ("diseno", {"creative": 1.0}),
    ("comunicación social", {"creative": 0.85, "society": 0.15}),
    ("comunicacion social", {"creative": 0.85, "society": 0.15}),
    ("marketing", {"business": 0.65, "creative": 0.25, "tech": 0.1}),
    ("administración", {"business": 1.0}),
    ("administracion", {"business": 1.0}),
    ("contaduría", {"business": 1.0}),
    ("contaduria", {"business": 1.0}),
    ("economía", {"business": 0.85, "society": 0.15}),
    ("economia", {"business": 0.85, "society": 0.15}),
    ("finanzas", {"business": 1.0}),
    ("derecho", {"society": 1.0}),
    ("ciencia política", {"society": 0.9, "business": 0.1}),
    ("ciencia politica", {"society": 0.9, "business": 0.1}),
    ("psicología", {"society": 0.9, "science": 0.1}),
    ("psicologia", {"society": 0.9, "science": 0.1}),
    # Generic "ingeniería" needle: any program with "Ingeniería" in its name
    # carries engineering affinity on top of its specific family match. This is
    # only used when domain_tags are absent (DB tags take priority in production).
    ("ingeniería", {"engineering": 1.0}),
    ("ingenieria", {"engineering": 1.0}),
]


def program_domain_affinity(
    name: str,
    description: str | None = None,
    domain_tags: dict | None = None,
) -> dict[str, float]:
    """Domain vector for a program.

    Priority:
      1. ``domain_tags`` from the DB (the curated source of truth, set by the
         021 migration). Removes the keyword-heuristic bias.
      2. Accumulate ALL explicit substring matches (no ``break``): a program
         named "Ingeniería Ambiental" now contributes science + industrial +
         engineering instead of only the first match.
      3. Keyword fallback for programs without any explicit match.
    """
    if domain_tags:
        vec = {d: float(domain_tags.get(d, 0.0)) for d in DOMAINS}
        return _normalize(vec)

    blob = f"{name} {description or ''}".lower()
    vec = _empty_vector()
    for needle, weights in _EXPLICIT_PROGRAM_WEIGHTS:
        if needle in blob:
            for d, w in weights.items():
                vec[d] += w

    if not any(vec.values()):
        for domain, kws in DOMAIN_KEYWORDS.items():
            hits = sum(1 for kw in kws if kw in blob)
            vec[domain] += float(hits)

    if not any(vec.values()):
        for d in DOMAINS:
            vec[d] = 0.2
    return _normalize(vec)


def score_programs(
    student_vec: dict[str, float],
    programs: list[dict],
) -> list[dict]:
    ranked = []
    for p in programs:
        pvec = program_domain_affinity(
            p.get("name") or "",
            p.get("description"),
            domain_tags=p.get("domain_tags"),
        )
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

    psych = sb.table("psychometric_assessments").select("responses, status, questions").eq("user_id", user_id).limit(1).execute()
    psych_row = psych.data[0] if psych.data else None
    char_responses = (psych_row or {}).get("responses") if (psych_row or {}).get("status") == "completed" else None
    char_questions = (psych_row or {}).get("questions")
    if not char_questions:
        try:
            from agents.question_agent import get_fixed_questions
            char_questions = get_fixed_questions()
        except Exception:
            char_questions = []

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

    programs_q = sb.table("academic_programs").select("id, name, description, is_active, domain_tags").eq("is_active", True)
    if inst:
        programs_q = programs_q.eq("institution_id", inst)
    programs = programs_q.execute().data or []

    char_vec = features_from_characterization(char_responses, char_questions)
    voc_vec = features_from_vocational(voc_responses, voc_questions)
    chat_vec = features_from_chat(chat_msgs)
    twin_vec = features_from_twin(twin)
    combined, weights = combine_features(char_vec, voc_vec, chat_vec, twin_vec)

    ranked = score_programs(combined, programs)

    # ── Capa ligera de embeddings (blend dominio + similitud textual) ───────────
    student_text = _build_student_text(char_responses, char_questions, voc_responses, voc_questions)
    embedding_used = False
    if student_text:
        try:
            from core.embeddings import embed_text, cosine_sim
            student_emb = await embed_text(student_text)
            prog_emb_rows = sb.table("program_embeddings").select("program_id, embedding").execute().data or []
            emb_by_pid = {row["program_id"]: row["embedding"] for row in prog_emb_rows}
            if student_emb and emb_by_pid:
                sims = {}
                for r in ranked:
                    pid = r.get("id")
                    pvec = emb_by_pid.get(pid)
                    if pvec:
                        sims[pid] = cosine_sim(student_emb, pvec)
                if sims:
                    max_domain = max((r["score"] for r in ranked), default=0.0) or 1.0
                    max_sim = max(sims.values()) or 1.0
                    for r in ranked:
                        domain_norm = r["score"] / max_domain
                        sim_norm = sims.get(r["id"], 0.0) / max_sim
                        blended = 0.7 * domain_norm + 0.3 * sim_norm
                        r["embedding_sim"] = round(float(sims.get(r["id"], 0.0)), 4)
                        r["final_score"] = round(float(blended), 4)
                    ranked.sort(key=lambda x: x.get("final_score", x["score"]), reverse=True)
                    if ranked and ranked[0].get("final_score", 0) > 0:
                        top_s = ranked[0]["final_score"]
                        for r in ranked:
                            r["affinity"] = round(r["final_score"] / top_s, 4) if top_s else 0.0
                    embedding_used = True
        except Exception:
            embedding_used = False

    top = ranked[:top_k]

    feature_nodes = [
        {
            "id": d,
            "label": DOMAIN_LABELS.get(d, d),
            "weight": round(combined.get(d, 0), 4),
        }
        for d in DOMAINS
        if combined.get(d, 0) > 0.05
    ]

    payload = {
        "features": combined,
        "feature_nodes": feature_nodes[:8],
        "source_weights": weights,
        "sources": {
            "characterization": bool(char_responses),
            "vocational": bool(voc_responses),
            "chat": bool(chat_msgs),
            "twin": bool(twin),
            "embedding": embedding_used,
        },
        "student_text": student_text,
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


def _build_student_text(
    char_responses: list[dict] | None,
    char_questions: list[dict] | None,
    voc_responses: list[dict] | None,
    voc_questions: list[dict] | None,
) -> str:
    """Concatenate the labels of the chosen options as the student's 'voice'.

    This text is embedded and compared against program embeddings, so the
    recommendation aligns to what the student actually answered rather than
    only to hand-picked domain keywords.
    """
    fragments: list[str] = []

    char_q_by_id = {q["id"]: q for q in (char_questions or [])}
    for r in char_responses or []:
        val = r.get("value")
        if not isinstance(val, str):
            continue
        q = char_q_by_id.get(r.get("question_id"), {})
        for opt in q.get("options") or []:
            if isinstance(opt, dict) and opt.get("value") == val:
                fragments.append(opt.get("label") or val)
                break
        else:
            fragments.append(val)

    voc_q_by_id = {q["id"]: q for q in (voc_questions or [])}
    for r in voc_responses or []:
        val = r.get("value")
        if not isinstance(val, str):
            continue
        q = voc_q_by_id.get(r.get("question_id"), {})
        for opt in q.get("options") or []:
            if isinstance(opt, dict) and opt.get("value") == val:
                fragments.append(opt.get("label") or val)
                break
        else:
            fragments.append(val)

    return ". ".join(fragments)
