"""Generate curated eco-friendly picks from heuristic scores.

This script reuses the EcoScore pipeline so recommendation data flows from the
same heuristics as the main scan feature. Run it whenever you want to refresh
the frontend's eco picks JSON.
"""
from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any, Dict, List

from base import ProductMetadata
from ecoscore import compute_eco_score

CURATED_ITEMS: List[Dict[str, Any]] = [
    {
        "id": "pick_organic_tee",
        "title": "Organic Cotton Daily Tee",
        "brand": "Evergreen Threads",
        "materials": "100% organic cotton",
        "origin": "Portugal",
        "certifications": ["GOTS"],
        "price": 32.0,
        "currency": "USD",
        "category": "Tops",
        "description": "Soft everyday tee knit from long-staple organic cotton with low-water dyeing.",
        "url": "https://example.com/evergreen-tee",
    },
    {
        "id": "pick_hemp_denim",
        "title": "Hemp Blend Workwear Jacket",
        "brand": "North Loop",
        "materials": "55% hemp, 45% organic cotton",
        "origin": "USA",
        "certifications": ["Fair Trade Certified"],
        "price": 148.0,
        "currency": "USD",
        "category": "Outerwear",
        "description": "Durable hemp canvas with organic cotton lining, sewn in a fair-trade facility.",
        "url": "https://example.com/northloop-jacket",
    },
    {
        "id": "pick_recycled_jogger",
        "title": "Recycled Bottle Joggers",
        "brand": "CycleForm",
        "materials": "85% recycled polyester, 15% elastane",
        "origin": "Vietnam",
        "certifications": ["bluesign"],
        "price": 78.0,
        "currency": "USD",
        "category": "Bottoms",
        "description": "Technical joggers spun from post-consumer bottles with bluesign-approved finishing.",
        "url": "https://example.com/cycleform-joggers",
    },
    {
        "id": "pick_linen_dress",
        "title": "European Linen Midi",
        "brand": "Coastline Atelier",
        "materials": "100% linen",
        "origin": "Lithuania",
        "certifications": ["OEKO-TEX"],
        "price": 165.0,
        "currency": "USD",
        "category": "Dresses",
        "description": "Breathable linen sourced from low-impact flax farms with OEKO-TEX dyeing.",
        "url": "https://example.com/coastline-linen",
    },
    {
        "id": "pick_bamboo_set",
        "title": "Bamboo Everyday Set",
        "brand": "Kind Pulse",
        "materials": "70% bamboo lyocell, 30% organic cotton",
        "origin": "India",
        "certifications": ["Fair Trade Certified"],
        "price": 98.0,
        "currency": "USD",
        "category": "Loungewear",
        "description": "Naturally cooling bamboo lyocell blended with cotton for year-round comfort.",
        "url": "https://example.com/kindpulse-set",
    },
    {
        "id": "pick_repair_denim",
        "title": "Repaired Vintage Denim",
        "brand": "Second Stitch",
        "materials": "Upcycled cotton denim",
        "origin": "USA",
        "certifications": ["B Corp"],
        "price": 120.0,
        "currency": "USD",
        "category": "Bottoms",
        "description": "Rescued vintage denim re-cut and mended for a lower-impact wardrobe staple.",
        "url": "https://example.com/secondstitch-denim",
    },
]


def _score_to_100(impact_score: float) -> int:
    return max(0, min(100, int((6 - impact_score) / 5 * 100)))


def generate_recommendations() -> List[Dict[str, Any]]:
    picks: List[Dict[str, Any]] = []
    for item in CURATED_ITEMS:
        product = ProductMetadata(
            url=item["url"],
            title=item["title"],
            brand=item["brand"],
            product_name=item["title"],
            materials=item["materials"],
            origin=item["origin"],
            certifications=item.get("certifications", []),
            price=item["price"],
            currency=item["currency"],
            eco_notes=item.get("category"),
        )

        tag_structured = {
            "materials": item["materials"],
            "origin": item["origin"],
            "certifications": item.get("certifications", []),
        }

        eco = compute_eco_score(product=product, tag_structured=tag_structured)
        picks.append(
            {
                "id": item["id"],
                "title": item["title"],
                "brand": item["brand"],
                "material": item["materials"],
                "ecoScore": _score_to_100(eco.impact_score),
                "grade": eco.grade,
                "url": item["url"],
                "price": f"${item['price']:.0f}",
                "currency": item["currency"],
                "description": item["description"],
                "category": item.get("category"),
            }
        )

    picks.sort(key=lambda rec: rec["ecoScore"], reverse=True)
    return picks


def export_to_json(target: Path) -> None:
    data = generate_recommendations()
    target.parent.mkdir(parents=True, exist_ok=True)
    with target.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    print(f"✅ Wrote {len(data)} picks to {target}")


if __name__ == "__main__":
    frontend_data = Path(__file__).resolve().parents[1] / "frontend" / "src" / "data" / "eco_picks.json"
    export_to_json(frontend_data)
