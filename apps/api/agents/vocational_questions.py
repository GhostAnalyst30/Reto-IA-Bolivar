"""Test vocacional UTB: árbol binario que guía hacia familias de programas.

Cada pregunta tiene exactamente 2 opciones. La respuesta define la siguiente
pregunta (`next`) y aporta pesos a dominios alineados con el catálogo UTB:

  tech         → Sistemas, Ciencia de Datos
  industrial   → Ingeniería Industrial
  engineering  → Civil, Eléctrica, Electrónica, Mecánica, Mecatrónica, Naval
  science      → Ambiental, Química, Biomédica
  creative     → Arquitectura, Diseño, Comunicación Social
  business     → Admin, Contaduría, Economía, Finanzas, Marketing digital
  society      → Derecho, Ciencia Política, Psicología
"""
from __future__ import annotations

# Pregunta raíz del árbol
ROOT_QUESTION_ID = "v0_1"


def _q(
    id: str,
    text: str,
    left: tuple[str, str, str | None, dict[str, float]],
    right: tuple[str, str, str | None, dict[str, float]],
    *,
    hint: str | None = None,
) -> dict:
    """left/right = (value, label, next_id|None, domain_weights).

    Each option's domain_weights is normalized to sum 1.0 so that every
    question contributes the same total weight regardless of the domain.
    This removes the magnitude bias where tech-heavy paths accumulated
    more weight than other paths.
    """
    lv, ll, ln, ld = left
    rv, rl, rn, rd = right
    item: dict = {
        "id": id,
        "text": text,
        "type": "binary",
        "options": [
            {"value": lv, "label": ll, "next": ln},
            {"value": rv, "label": rl, "next": rn},
        ],
        "domain_map": {lv: _normalize_weights(ld), rv: _normalize_weights(rd)},
        "tags": ["dominio"],
    }
    if hint:
        item["hint"] = hint
    return item


def _normalize_weights(weights: dict[str, float]) -> dict[str, float]:
    """Scale weights so they sum to 1.0 (preserves relative proportions)."""
    total = sum(max(0.0, float(w)) for w in weights.values())
    if total <= 0:
        return {k: 0.0 for k in weights}
    return {k: max(0.0, float(v)) / total for k, v in weights.items()}


VOCATIONAL_QUESTIONS: list[dict] = [
    # ── Nivel 0: cadena inicial común (10 preguntas para todos) ───────────
    # Cada pregunta aporta pesos a varios dominios antes de entrar al árbol
    # binario, dando una señal más rica y un test de ~15 preguntas.
    _q(
        "v0_1",
        "¿Cómo prefieres enfrentar un problema nuevo?",
        (
            "analyze_data",
            "Analizando datos y buscando patrones objetivos",
            "v0_2",
            {"tech": 1.4, "science": 1.2, "business": 0.5},
        ),
        (
            "talk_people",
            "Conversando con personas y entendiendo su contexto",
            "v0_2",
            {"society": 1.4, "business": 0.8, "creative": 0.4},
        ),
        hint="No hay respuestas correctas: responde con lo que te salga más natural.",
    ),
    _q(
        "v0_2",
        "Cuando trabajas en equipo, ¿qué rol asumirías con más gusto?",
        (
            "lead_organize",
            "Liderar, organizar y tomar decisiones",
            "v0_3",
            {"business": 1.5, "industrial": 0.8},
        ),
        (
            "create_ideas",
            "Crear, diseñar o proponer ideas nuevas",
            "v0_3",
            {"creative": 1.5, "tech": 0.4},
        ),
    ),
    _q(
        "v0_3",
        "¿Qué tipo de entorno te hace sentir más productivo?",
        (
            "lab_workshop",
            "Un laboratorio, taller o espacio técnico",
            "v0_4",
            {"science": 1.3, "engineering": 1.2, "industrial": 0.9},
        ),
        (
            "office_studio",
            "Una oficina, un estudio o un espacio con personas",
            "v0_4",
            {"business": 1.1, "creative": 1.1, "society": 0.9},
        ),
    ),
    _q(
        "v0_4",
        "Si tuvieras tiempo libre, ¿qué elegirías hacer?",
        (
            "tech_tinker",
            "Programar, armar algo digital o experimentar con tecnología",
            "v0_5",
            {"tech": 1.6, "engineering": 0.5},
        ),
        (
            "read_write",
            "Leer, escribir, debatir o crear contenido",
            "v0_5",
            {"creative": 1.3, "society": 1.0},
        ),
    ),
    _q(
        "v0_5",
        "¿Qué te da más satisfacción?",
        (
            "build_work",
            "Ver funcionar algo que diseñé o construí",
            "v0_6",
            {"engineering": 1.4, "tech": 1.1, "industrial": 0.8},
        ),
        (
            "help_people",
            "Ayudar a alguien a entenderse o mejorar su situación",
            "v0_6",
            {"society": 1.5, "creative": 0.4},
        ),
    ),
    _q(
        "v0_6",
        "En una decisión importante, ¿en qué confías más?",
        (
            "evidence",
            "En los números, la evidencia y los datos",
            "v0_7",
            {"tech": 1.1, "business": 1.1, "science": 1.0},
        ),
        (
            "intuition",
            "En la intuición, las personas y las emociones",
            "v0_7",
            {"society": 1.3, "creative": 0.9},
        ),
    ),
    _q(
        "v0_7",
        "¿Qué tipo de problemas del mundo te gustaría abordar?",
        (
            "sustainability_health",
            "Sostenibilidad, salud, ambiente o ciencia aplicada",
            "v0_8",
            {"science": 1.5, "industrial": 0.5},
        ),
        (
            "justice_education",
            "Justicia, educación, bienestar o convivencia social",
            "v0_8",
            {"society": 1.5, "creative": 0.4},
        ),
    ),
    _q(
        "v0_8",
        "¿Cómo te imaginas tu día a día profesional ideal?",
        (
            "plan_ops",
            "Planificando proyectos, procesos u operaciones",
            "v0_9",
            {"industrial": 1.4, "business": 1.0, "engineering": 0.5},
        ),
        (
            "design_products",
            "Diseñando productos, espacios o mensajes",
            "v0_9",
            {"creative": 1.5, "tech": 0.4},
        ),
    ),
    _q(
        "v0_9",
        "¿Qué actividad te resulta más atractiva?",
        (
            "optimize_measure",
            "Optimizar sistemas, medir resultados y mejorar la eficiencia",
            "v0_10",
            {"industrial": 1.4, "tech": 1.1},
        ),
        (
            "negotiate_lead",
            "Negociar, vender, convencer o liderar equipos",
            "v0_10",
            {"business": 1.5, "society": 0.6},
        ),
    ),
    _q(
        "v0_10",
        "Si pudieras destacar en una habilidad, ¿cuál elegirías?",
        (
            "logical_math",
            "Pensamiento lógico-matemático y resolución técnica",
            "v1",
            {"tech": 1.3, "engineering": 1.2, "science": 0.9},
        ),
        (
            "communication_empathy",
            "Comunicación, empatía y comprensión del entorno humano",
            "v1",
            {"society": 1.3, "creative": 0.9, "business": 0.6},
        ),
    ),
    # ── Nivel 1: gran bifurcación ───────────────────────────────────────────
    _q(
        "v1",
        "Cuando imaginas tu futuro profesional, ¿qué te atrae más?",
        (
            "stem",
            "Crear, construir o resolver con ciencia, tecnología o diseño",
            "v2_stem",
            {"engineering": 1.2, "tech": 1.2, "science": 1.0, "industrial": 1.0, "creative": 0.9},
        ),
        (
            "people",
            "Entender personas, organizaciones, la economía o las normas sociales",
            "v2_people",
            {"business": 1.4, "society": 1.4, "creative": 0.5},
        ),
        hint="No hay respuesta correcta: elegimos la orientación más cercana a ti.",
    ),
    # ── Rama STEM / diseño ──────────────────────────────────────────────────
    _q(
        "v2_stem",
        "¿En qué tipo de retos te gusta más trabajar?",
        (
            "digital",
            "Lo digital: software, datos, medios o transformación online",
            "v3_digital",
            {"tech": 2.2, "creative": 0.8, "business": 0.4},
        ),
        (
            "physical",
            "Lo físico o material: obras, máquinas, procesos, ambiente o productos",
            "v3_physical",
            {"engineering": 1.8, "industrial": 1.4, "science": 1.2, "creative": 0.7},
        ),
    ),
    # Digital → tech vs comunicación/marketing
    _q(
        "v3_digital",
        "Dentro de lo digital, ¿qué te motiva más?",
        (
            "build_data",
            "Construir sistemas, programar o analizar datos",
            "v4_tech",
            {"tech": 2.5, "science": 0.6},
        ),
        (
            "comms_market",
            "Comunicar, diseñar mensajes o transformar negocios con lo digital",
            "v4_comms",
            {"creative": 1.8, "business": 1.6, "tech": 0.5},
        ),
    ),
    _q(
        "v4_tech",
        "Si tuvieras que elegir un enfoque, ¿cuál te describe mejor?",
        (
            "software",
            "Programar, crear apps, redes o soluciones de software",
            "v5_systems",
            {"tech": 2.8},
        ),
        (
            "data",
            "Analizar datos, encontrar patrones y tomar decisiones con evidencia",
            "v5_data",
            {"tech": 2.0, "science": 1.2, "business": 0.4},
        ),
    ),
    _q(
        "v5_systems",
        "¿Qué tipo de proyecto tecnológico te emociona más?",
        (
            "systems_ai",
            "Sistemas, computación, inteligencia artificial o plataformas digitales",
            None,
            {"tech": 3.0},
        ),
        (
            "systems_applied",
            "Aplicar la tecnología a procesos, productos o entornos reales",
            None,
            {"tech": 2.0, "industrial": 1.0, "engineering": 0.8},
        ),
    ),
    _q(
        "v5_data",
        "¿Para qué te gustaría usar los datos principalmente?",
        (
            "data_science",
            "Modelos, predicción e investigación basada en datos",
            None,
            {"tech": 2.4, "science": 1.6},
        ),
        (
            "data_business",
            "Decisiones de negocio, mercado o operaciones",
            None,
            {"tech": 1.8, "business": 1.6, "industrial": 0.6},
        ),
    ),
    _q(
        "v4_comms",
        "En comunicación y transformación digital, ¿hacia dónde te inclinas?",
        (
            "comms",
            "Contar historias, medios, audiencias y contenido",
            "v5_comms",
            {"creative": 2.6, "society": 0.6},
        ),
        (
            "marketing",
            "Estrategia de marca, clientes y marketing digital",
            "v5_marketing",
            {"business": 2.2, "creative": 1.4, "tech": 0.5},
        ),
    ),
    _q(
        "v5_comms",
        "¿Qué rol te imaginas más?",
        (
            "comms_media",
            "Periodismo, medios, redes o producción de mensajes",
            None,
            {"creative": 2.8, "society": 0.8},
        ),
        (
            "comms_design",
            "Diseño visual, experiencia de usuario o identidad creativa",
            None,
            {"creative": 2.8, "tech": 0.5},
        ),
    ),
    _q(
        "v5_marketing",
        "¿Qué te motiva más del marketing digital?",
        (
            "mkt_strategy",
            "Estrategia, crecimiento de marca y transformación del negocio",
            None,
            {"business": 2.6, "creative": 1.2, "tech": 0.6},
        ),
        (
            "mkt_creative",
            "Campañas creativas, contenido y conexión con audiencias",
            None,
            {"creative": 2.2, "business": 1.8},
        ),
    ),
    # Físico → ingeniería / industrial / ciencia / diseño espacial
    _q(
        "v3_physical",
        "Ante un desafío concreto, ¿qué te llama más la atención?",
        (
            "build_machines",
            "Diseñar o mejorar máquinas, estructuras, energía o automatización",
            "v4_eng",
            {"engineering": 2.4, "industrial": 0.8},
        ),
        (
            "processes_life",
            "Mejorar procesos, cuidar el ambiente o trabajar con la vida y materiales",
            "v4_life",
            {"industrial": 1.6, "science": 1.8, "creative": 0.8},
        ),
    ),
    _q(
        "v4_eng",
        "¿Qué familia de ingeniería se acerca más a ti?",
        (
            "infra_energy",
            "Infraestructura, energía o sistemas eléctricos/electrónicos",
            "v5_infra",
            {"engineering": 2.6},
        ),
        (
            "mech_auto",
            "Máquinas, vehículos, robótica o sistemas mecánicos",
            "v5_mech",
            {"engineering": 2.6, "industrial": 0.5},
        ),
    ),
    _q(
        "v5_infra",
        "¿Qué escenario te imaginas más?",
        (
            "civil",
            "Obras, ciudades, construcciones e infraestructura civil",
            None,
            {"engineering": 2.8, "creative": 0.4},
        ),
        (
            "electro",
            "Energía, circuitos, electrónica o sistemas de control",
            None,
            {"engineering": 2.8, "tech": 0.6},
        ),
    ),
    _q(
        "v5_mech",
        "¿Hacia dónde te gustaría orientar esa ingeniería?",
        (
            "mechanical",
            "Mecánica, diseño de máquinas o sistemas navales",
            None,
            {"engineering": 2.8},
        ),
        (
            "mechatronics",
            "Mecatrónica, automatización e integración con electrónica",
            None,
            {"engineering": 2.4, "tech": 1.0, "industrial": 0.6},
        ),
    ),
    _q(
        "v4_life",
        "¿Qué tipo de impacto te motiva más?",
        (
            "ops_design",
            "Optimizar operaciones, calidad y cadenas de valor, o diseñar espacios/productos",
            "v5_ops_design",
            {"industrial": 1.8, "creative": 1.4, "business": 0.5},
        ),
        (
            "science_health",
            "Ambiente, química, salud o tecnología aplicada a la vida",
            "v5_science",
            {"science": 2.4, "engineering": 0.8},
        ),
    ),
    _q(
        "v5_ops_design",
        "Entre estas dos rutas, ¿cuál eliges?",
        (
            "industrial",
            "Ingeniería industrial: procesos, logística, calidad y mejora continua",
            None,
            {"industrial": 3.0, "business": 0.6},
        ),
        (
            "arch_design",
            "Arquitectura o diseño: espacios, formas y experiencia de uso",
            None,
            {"creative": 2.8, "engineering": 0.6},
        ),
    ),
    _q(
        "v5_science",
        "¿En qué área aplicada te ves más?",
        (
            "env_chem",
            "Ambiente, sostenibilidad o procesos químicos",
            None,
            {"science": 2.8, "industrial": 0.6},
        ),
        (
            "biomed",
            "Salud, dispositivos médicos o ingeniería biomédica",
            None,
            {"science": 2.6, "engineering": 1.0, "tech": 0.4},
        ),
    ),
    # ── Rama personas / sociedad / negocios ─────────────────────────────────
    _q(
        "v2_people",
        "¿Qué te interesa explorar primero?",
        (
            "org_economy",
            "Organizaciones, dinero, mercados y cómo crecen los negocios",
            "v3_business",
            {"business": 2.4},
        ),
        (
            "law_people",
            "Personas, justicia, política o el bienestar humano",
            "v3_society",
            {"society": 2.4, "creative": 0.3},
        ),
    ),
    _q(
        "v3_business",
        "En el mundo de los negocios, ¿qué te atrae más?",
        (
            "manage_finance",
            "Administrar, contabilidad, finanzas o economía",
            "v4_finance",
            {"business": 2.6},
        ),
        (
            "market_grow",
            "Mercados, clientes, marcas y crecimiento comercial",
            "v4_market",
            {"business": 2.0, "creative": 1.0},
        ),
    ),
    _q(
        "v4_finance",
        "¿Con qué tipo de decisiones te sientes más cómodo?",
        (
            "admin_ops",
            "Liderar equipos, operaciones y estrategia empresarial",
            "v5_admin",
            {"business": 2.6, "industrial": 0.5},
        ),
        (
            "numbers",
            "Números, estados financieros, costos o modelos económicos",
            "v5_numbers",
            {"business": 2.8},
        ),
    ),
    _q(
        "v5_admin",
        "¿Cómo te imaginas tu aporte en una organización?",
        (
            "admin",
            "Administración general, emprendimiento y gestión de empresas",
            None,
            {"business": 3.0},
        ),
        (
            "intl_finance",
            "Finanzas y negocios internacionales",
            None,
            {"business": 2.8, "society": 0.4},
        ),
    ),
    _q(
        "v5_numbers",
        "¿Qué enfoque numérico prefieres?",
        (
            "accounting",
            "Contaduría, auditoría y control financiero",
            None,
            {"business": 3.0},
        ),
        (
            "economics",
            "Economía, política pública y análisis de mercados",
            None,
            {"business": 2.4, "society": 1.0},
        ),
    ),
    _q(
        "v4_market",
        "¿Hacia dónde apuntas en mercados y clientes?",
        (
            "mkt_digital",
            "Marketing y transformación digital",
            None,
            {"business": 2.2, "creative": 1.6, "tech": 0.6},
        ),
        (
            "mkt_intl",
            "Negocios internacionales, comercio y expansión",
            None,
            {"business": 2.8, "society": 0.5},
        ),
    ),
    _q(
        "v3_society",
        "Cuando piensas en aportar a la sociedad, ¿qué camino te llama más?",
        (
            "justice_policy",
            "Normas, derechos, instituciones o relaciones internacionales",
            "v4_law",
            {"society": 2.6},
        ),
        (
            "mind_wellbeing",
            "Comportamiento humano, salud mental y acompañamiento a personas",
            "v4_psych",
            {"society": 2.4, "science": 0.6},
        ),
    ),
    _q(
        "v4_law",
        "¿Qué escenario te motiva más?",
        (
            "law",
            "Derecho, justicia y resolución de conflictos",
            None,
            {"society": 3.0},
        ),
        (
            "politics",
            "Ciencia política, diplomacia y relaciones internacionales",
            None,
            {"society": 2.8, "business": 0.4},
        ),
    ),
    _q(
        "v4_psych",
        "En el trabajo con personas, ¿qué te resuena más?",
        (
            "psychology",
            "Psicología: comprender y acompañar procesos humanos",
            None,
            {"society": 2.8, "science": 0.8},
        ),
        (
            "psych_org",
            "Personas en organizaciones: bienestar, talento y clima laboral",
            None,
            {"society": 2.0, "business": 1.2},
        ),
    ),
]


def get_vocational_questions() -> list[dict]:
    return [dict(q) for q in VOCATIONAL_QUESTIONS]


def get_root_question_id() -> str:
    return ROOT_QUESTION_ID
