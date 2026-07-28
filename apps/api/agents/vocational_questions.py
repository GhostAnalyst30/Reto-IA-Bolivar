"""Preguntas fijas del test vocacional (sin IA)."""
from __future__ import annotations

VOCATIONAL_QUESTIONS: list[dict] = [
    {
        "id": "v1",
        "text": "¿Qué tipo de problemas disfrutas resolver?",
        "type": "choice",
        "options": [
            "Errores de software o automatizar tareas",
            "Mejorar procesos y eficiencia en una organización",
            "Ideas de negocio y gestión de equipos",
            "Preguntas de investigación y experimentos",
        ],
        "tags": ["dominio"],
        "domain_map": {
            "Errores de software o automatizar tareas": "tech",
            "Mejorar procesos y eficiencia en una organización": "industrial",
            "Ideas de negocio y gestión de equipos": "business",
            "Preguntas de investigación y experimentos": "research",
        },
    },
    {
        "id": "v2",
        "text": "Me atrae trabajar con programación, datos o sistemas digitales",
        "type": "likert",
        "tags": ["tech"],
    },
    {
        "id": "v3",
        "text": "Me interesa optimizar cadenas de producción, logística o calidad",
        "type": "likert",
        "tags": ["industrial"],
    },
    {
        "id": "v4",
        "text": "Disfruto planificar, liderar proyectos o analizar mercados",
        "type": "likert",
        "tags": ["business"],
    },
    {
        "id": "v5",
        "text": "Prefiero roles creativos, diseño o comunicación visual",
        "type": "likert",
        "tags": ["creative"],
    },
    {
        "id": "v6",
        "text": "¿En qué entorno te imaginas trabajando?",
        "type": "choice",
        "options": [
            "Empresa de tecnología / startup",
            "Planta industrial o consultoría de procesos",
            "Empresa, banco o emprendimiento propio",
            "Laboratorio, universidad o centro de I+D",
        ],
        "tags": ["dominio"],
        "domain_map": {
            "Empresa de tecnología / startup": "tech",
            "Planta industrial o consultoría de procesos": "industrial",
            "Empresa, banco o emprendimiento propio": "business",
            "Laboratorio, universidad o centro de I+D": "research",
        },
    },
    {
        "id": "v7",
        "text": "Las matemáticas aplicadas y la modelación me resultan estimulantes",
        "type": "likert",
        "tags": ["tech", "industrial", "research"],
    },
    {
        "id": "v8",
        "text": "Me motiva el trabajo con personas, ventas o gestión de clientes",
        "type": "likert",
        "tags": ["business"],
    },
    {
        "id": "v9",
        "text": "¿Qué asignatura o actividad te motiva más?",
        "type": "choice",
        "options": [
            "Programación / algoritmos",
            "Estadística / operaciones",
            "Economía / marketing",
            "Ciencias / laboratorio",
        ],
        "tags": ["dominio"],
        "domain_map": {
            "Programación / algoritmos": "tech",
            "Estadística / operaciones": "industrial",
            "Economía / marketing": "business",
            "Ciencias / laboratorio": "research",
        },
    },
    {
        "id": "v10",
        "text": "Me interesa la sostenibilidad, la cadena de suministro o la mejora continua",
        "type": "likert",
        "tags": ["industrial"],
    },
    {
        "id": "v11",
        "text": "Quiero construir productos digitales o soluciones tecnológicas",
        "type": "likert",
        "tags": ["tech"],
    },
    {
        "id": "v12",
        "text": "Me atrae emprender o administrar recursos financieros",
        "type": "likert",
        "tags": ["business"],
    },
]


def get_vocational_questions() -> list[dict]:
    return [dict(q) for q in VOCATIONAL_QUESTIONS]
