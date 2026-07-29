"""Banco fijo de preguntas de caracterización (sin IA).

Bloques:
  c1-c12  Psicometrico Likert (motivacion, bienestar, estilos de aprendizaje).
          Alimentan el Digital Twin (twin_agent) y el score de riesgo
          (psychometric_scoring). NO alimentan el vector de dominio del matcher.
  c13     Interes general (choice) - tag `intereses` (twin_agent) + domain_map.
  c14     Situacion socioeconomica (choice) - tag `socioeconomico` (solo riesgo).
  c15     Meta al terminar la carrera (choice) - tag `metas` (twin_agent) + domain_map.
  c16-c20 Preguntas vocacionales (choice) - tag `vocacional` con domain_map
          balanceado (cada opcion suma 1.0). Alinean el matcher a las respuestas
          reales del estudiante, sin sesgo de magnitud entre dominios.
"""
from __future__ import annotations


FIXED_CHARACTERIZATION_QUESTIONS: list[dict] = [
    # ── Bloque psicometrico c1-c12 (Twin + riesgo, no matcher) ──────────────────
    {"id": "c1", "text": "Me siento motivado/a para continuar mis estudios universitarios", "type": "likert", "tags": ["motivacion"]},
    {"id": "c2", "text": "Tengo claridad sobre mis metas academicas a corto plazo", "type": "likert", "tags": ["metas"]},
    {"id": "c3", "text": "Me resulta facil organizar mi tiempo entre clases, estudio y vida personal", "type": "likert", "tags": ["organizacion"]},
    {"id": "c4", "text": "Siento apoyo de mi familia o red cercana en mi proceso universitario", "type": "likert", "tags": ["social"]},
    {"id": "c5", "text": "Experimento niveles de estres que afectan mi rendimiento academico", "type": "likert", "tags": ["bienestar", "estres"], "reverse": True},
    {"id": "c6", "text": "Participo activamente en actividades extracurriculares o grupos estudiantiles", "type": "likert", "tags": ["social"]},
    {"id": "c7", "text": "Prefiero aprender con material visual (diagramas, videos, infografias)", "type": "likert", "tags": ["visual"]},
    {"id": "c8", "text": "Me siento comodo/a pidiendo ayuda a docentes o companeros", "type": "likert", "tags": ["social"]},
    {"id": "c9", "text": "Aprendo mejor escuchando explicaciones o discutiendo los temas en voz alta", "type": "likert", "tags": ["auditivo"]},
    {"id": "c10", "text": "Prefiero aprender haciendo: practicas, laboratorios o proyectos", "type": "likert", "tags": ["kinestesico"]},
    {"id": "c11", "text": "Duermo lo suficiente y mantengo habitos saludables durante el semestre", "type": "likert", "tags": ["bienestar"]},
    {"id": "c12", "text": "Considero que mi programa academico se ajusta a mis intereses profesionales", "type": "likert", "tags": ["intereses", "motivacion"]},
    # ── Bloque vocacional c13-c20 (alimenta el matcher de programas) ────────────
    {"id": "c13", "text": "¿Que area te interesa mas para oportunidades futuras?",     "type": "choice", "tags": ["intereses"],
     "options": [
        {"value": "Tecnologia", "label": "Tecnologia", "domain_map": {"tech": 0.8, "engineering": 0.15, "science": 0.05}},
        {"value": "Emprendimiento", "label": "Emprendimiento", "domain_map": {"business": 0.7, "tech": 0.2, "creative": 0.1}},
        {"value": "Investigacion", "label": "Investigacion", "domain_map": {"science": 0.8, "tech": 0.15, "engineering": 0.05}},
        {"value": "Bienestar", "label": "Bienestar", "domain_map": {"society": 0.7, "science": 0.2, "creative": 0.1}},
        {"value": "Artes", "label": "Artes", "domain_map": {"creative": 0.85, "society": 0.1, "business": 0.05}},
     ]},
    {"id": "c14", "text": "¿Como describirias tu situacion economica actual?",
     "type": "choice", "tags": ["socioeconomico"],
     "options": [
        {"value": "Estable", "label": "Estable"},
        {"value": "Regular", "label": "Regular"},
        {"value": "Requiere apoyo", "label": "Requiere apoyo"},
        {"value": "Prefiero no decir", "label": "Prefiero no decir"},
     ]},
    {"id": "c15", "text": "¿Cual es tu meta principal al terminar la carrera?",
     "type": "choice", "tags": ["metas"],
     "options": [
        {"value": "Trabajar en una empresa", "label": "Trabajar en una empresa", "domain_map": {"business": 0.7, "industrial": 0.2, "tech": 0.1}},
        {"value": "Emprender", "label": "Emprender", "domain_map": {"business": 0.7, "creative": 0.2, "tech": 0.1}},
        {"value": "Estudiar un posgrado", "label": "Estudiar un posgrado", "domain_map": {"science": 0.6, "tech": 0.25, "society": 0.15}},
        {"value": "Investigar", "label": "Investigar", "domain_map": {"science": 0.8, "tech": 0.15, "engineering": 0.05}},
        {"value": "Aún no lo sé", "label": "Aún no lo sé", "domain_map": {"creative": 0.2, "society": 0.2, "business": 0.2, "tech": 0.2, "science": 0.2}},
     ]},
    {"id": "c16", "text": "¿En que entorno te ves trabajando con mas gusto?",
     "type": "choice", "tags": ["vocacional"],
     "options": [
        {"value": "oficina_tecnica", "label": "Oficina tecnica o digital, resolviendo problemas con datos y software", "domain_map": {"tech": 0.7, "business": 0.2, "science": 0.1}},
        {"value": "obra_campo", "label": "Obra, campo o planta industrial, viendo procesos y maquinaria", "domain_map": {"industrial": 0.6, "engineering": 0.3, "science": 0.1}},
        {"value": "laboratorio", "label": "Laboratorio o clinica, investigando o cuidando la vida y la salud", "domain_map": {"science": 0.7, "engineering": 0.2, "society": 0.1}},
        {"value": "estudio_medios", "label": "Estudio, agencia o medios, creando contenido y experiencias", "domain_map": {"creative": 0.7, "business": 0.2, "society": 0.1}},
     ]},
    {"id": "c17", "text": "¿Que te da mas satisfaccion al terminar un proyecto?",
     "type": "choice", "tags": ["vocacional"],
     "options": [
        {"value": "sistema_funciona", "label": "Ver un sistema o app funcionando y resolviendo el problema", "domain_map": {"tech": 0.75, "engineering": 0.2, "business": 0.05}},
        {"value": "proceso_optimo", "label": "Optimizar un proceso y medir mejoras concretas de eficiencia", "domain_map": {"industrial": 0.6, "engineering": 0.3, "business": 0.1}},
        {"value": "ayudar_persona", "label": "Ayudar a una persona o comunidad a mejorar su situacion", "domain_map": {"society": 0.7, "creative": 0.2, "science": 0.1}},
        {"value": "crear_disfrutar", "label": "Crear algo que otras personas disfruten o valoren", "domain_map": {"creative": 0.7, "business": 0.2, "tech": 0.1}},
     ]},
    {"id": "c18", "text": "¿Que materia o actividad disfrutas mas?",
     "type": "choice", "tags": ["vocacional"],
     "options": [
        {"value": "programar_logica", "label": "Programar o resolver problemas logicos y matematicos", "domain_map": {"tech": 0.7, "engineering": 0.2, "science": 0.1}},
        {"value": "disenar_construir", "label": "Disenar o construir estructuras, maquinas o circuitos", "domain_map": {"engineering": 0.7, "industrial": 0.2, "creative": 0.1}},
        {"value": "analizar_mercados", "label": "Analizar mercados, finanzas o estrategias de negocio", "domain_map": {"business": 0.75, "society": 0.15, "tech": 0.1}},
        {"value": "mente_sociedad", "label": "Comprender la mente humana o el funcionamiento de la sociedad", "domain_map": {"society": 0.7, "science": 0.2, "creative": 0.1}},
     ]},
    {"id": "c19", "text": "¿Que impacto quieres generar con tu trabajo?",
     "type": "choice", "tags": ["vocacional"],
     "options": [
        {"value": "innovar_tech", "label": "Innovar con tecnologia, datos o inteligencia artificial", "domain_map": {"tech": 0.75, "science": 0.2, "engineering": 0.05}},
        {"value": "cuidar_ambiente", "label": "Cuidar el ambiente, la salud o los materiales", "domain_map": {"science": 0.6, "engineering": 0.3, "industrial": 0.1}},
        {"value": "construir_infra", "label": "Construir infraestructura, obras o sistemas fisicos", "domain_map": {"engineering": 0.7, "industrial": 0.2, "creative": 0.1}},
        {"value": "defender_derechos", "label": "Defender derechos, acompanar personas o fortalecer la comunidad", "domain_map": {"society": 0.75, "creative": 0.15, "business": 0.1}},
     ]},
    {"id": "c20", "text": "¿Con que tipo de proyectos te identificas mas?",
     "type": "choice", "tags": ["vocacional"],
     "options": [
        {"value": "apps_datos_ia", "label": "Apps, datos, IA y plataformas digitales", "domain_map": {"tech": 0.75, "engineering": 0.2, "business": 0.05}},
        {"value": "maquinas_energia", "label": "Maquinas, energia, automatizacion y robotica", "domain_map": {"engineering": 0.7, "tech": 0.2, "industrial": 0.1}},
        {"value": "campanas_marca", "label": "Campanas, marca, contenido y comunicacion", "domain_map": {"creative": 0.7, "business": 0.2, "society": 0.1}},
        {"value": "finanzas_gestion", "label": "Finanzas, gestion y estrategia de organizaciones", "domain_map": {"business": 0.75, "society": 0.15, "industrial": 0.1}},
     ]},
]


def get_fixed_questions() -> list[dict]:
    """Banco fijo ordenado para la encuesta de caracterización (sin LLM)."""
    return [dict(q) for q in FIXED_CHARACTERIZATION_QUESTIONS]
