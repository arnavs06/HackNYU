from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import List
from uuid import uuid4

from .schemas import EcoScore, ImpactFlag, ScanResult

MATERIALS = [
    {
        "name": "100% Polyester",
        "score": 42,
        "grade": "D",
        "flags": ["High Microplastic", "High Carbon"],
    },
    {
        "name": "100% Organic Cotton",
        "score": 86,
        "grade": "A",
        "flags": ["Low Impact", "Biodegradable"],
    },
    {
        "name": "60% Cotton / 40% Polyester",
        "score": 65,
        "grade": "C",
        "flags": ["Medium Carbon", "Some Microplastic"],
    },
    {
        "name": "100% Linen",
        "score": 91,
        "grade": "A",
        "flags": ["Very Low Impact", "Natural Fiber"],
    },
    {
        "name": "100% Viscose",
        "score": 55,
        "grade": "C",
        "flags": ["High Water Usage", "Chemical Processing"],
    },
]

COUNTRIES = [
    {"name": "Bangladesh", "laborRisk": "medium"},
    {"name": "Portugal", "laborRisk": "low"},
    {"name": "China", "laborRisk": "medium"},
    {"name": "India", "laborRisk": "medium"},
    {"name": "Italy", "laborRisk": "low"},
    {"name": "Vietnam", "laborRisk": "medium"},
]

TIP_BANK = {
    "high": [
        "Choose organic or recycled fibers next time.",
        "Look for third-party certifications like GOTS or Fair Trade.",
        "Wash in colder water to reduce microplastic shedding.",
    ],
    "medium": [
        "Consider blends with more natural fibers.",
        "Support brands that publish supply-chain audits.",
        "Repair and reuse garments to extend their life.",
    ],
    "low": [
        "Great pick—share it with friends!",
        "Keep balancing style with sustainability.",
    ],
}


def _severity_from_score(score: int) -> str:
    if score >= 75:
        return "low"
    if score >= 55:
        return "medium"
    return "high"


def generate_mock_scan(user_id: str | None = None, *, minutes_ago: int | None = None) -> ScanResult:
    material = random.choice(MATERIALS)
    country = random.choice(COUNTRIES)

    score_variation = random.randint(-5, 5)
    score = max(0, min(100, material["score"] + score_variation))

    grade = _grade_from_score(score)
    severity = _severity_from_score(score)

    flags: List[ImpactFlag] = [
        ImpactFlag(type="microplastic", severity=severity, label=material["flags"][0]),
        ImpactFlag(type="carbon", severity="medium", label=material["flags"][1]),
    ]

    if country["laborRisk"] != "low":
        flags.append(
            ImpactFlag(
                type="labor",
                severity="medium",
                label="Medium Labor Risk",
            )
        )

    eco = EcoScore(score=score, grade=grade, flags=flags)

    confidence = round(random.uniform(0.85, 0.98), 2)

    tip_key = "low" if score >= 75 else "medium" if score >= 55 else "high"
    tips = random.sample(TIP_BANK[tip_key], k=min(2, len(TIP_BANK[tip_key])))

    timestamp = datetime.utcnow()
    if minutes_ago is not None:
        timestamp -= timedelta(minutes=minutes_ago)

    explanation = (
        f"This item is made from {material['name']} and produced in {country['name']}. "
        "Those inputs drive the eco-score due to their combined material and labor impact."
    )

    return ScanResult(
        id=str(uuid4()),
        timestamp=timestamp,
        material=material["name"],
        country=country["name"],
        ecoScore=eco,
        explanation=explanation,
        improvementTips=tips,
        confidence=confidence,
        userId=user_id,
    )


def seed_history(store, *, user_id: str, count: int = 5) -> None:
    for i in range(count):
        scan = generate_mock_scan(user_id, minutes_ago=(i + 1) * 120)
        store.add_scan(scan)


def _grade_from_score(score: int) -> str:
    if score >= 90:
        return "A"
    if score >= 80:
        return "A"
    if score >= 70:
        return "B"
    if score >= 60:
        return "C"
    if score >= 50:
        return "D"
    return "F"
