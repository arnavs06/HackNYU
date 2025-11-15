import os
import sys
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional, Tuple
import requests
# ---------- Data models ----------


@dataclass
class ProductMetadata:
    url: str
    title: str
    brand: Optional[str]
    product_name: Optional[str]
    materials: Optional[str]
    origin: Optional[str]
    certifications: List[str]
    price: Optional[float]
    currency: Optional[str]
    eco_notes: Optional[str]


@dataclass
class EcoScore:
    grade: str  # A–F
    impact_score: float  # 1 (best) – 5 (worst) in this heuristic
    material_and_origin: str
    certifications: List[str]
    impact_explanation: str


@dataclass
class ScoredProduct:
    base: ProductMetadata
    eco: EcoScore
    is_alternative: bool
    similarity_hint: Optional[str] = None


# ---------- Helpers: env, HTTP ----------


def get_env(name: str, required: bool = True) -> Optional[str]:
    value = os.getenv(name)
    if required and not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def safe_get(url: str, timeout: float = 10.0) -> Optional[str]:
    try:
        resp = requests.get(url, timeout=timeout, headers={"User-Agent": "EcoRecommender/0.1"})
        if resp.ok and isinstance(resp.text, str):
            return resp.text
    except Exception as e:
        print(f"[warn] Failed to fetch {url}: {e}", file=sys.stderr)
    return None

