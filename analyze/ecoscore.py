import os
import re
from typing import Any, Dict, List, Optional, Tuple

from base import ProductMetadata, EcoScore
from helper import get_env

# Gemini config
GEMINI_API_ENV_PRIMARY = "GEMINI_API_KEY"
GEMINI_API_ENV_SECONDARY = "GOOGLE_API_KEY"

try:
    import google.generativeai as genai  # type: ignore
except ImportError:  # pragma: no cover
    genai = None  # type: ignore


# ---------------------------------------------------------------------------
# Material parsing + scoring heuristic
# ---------------------------------------------------------------------------

# 1–5 impact scores (1 = best / lowest impact, 5 = worst / highest impact)
# These are simplified, heuristic scores informed by public LCA comparisons
# and fibre rankings (organic natural fibres & some recycled fibres generally
# lower impact; synthetics & leather generally higher; leather/wool have very
# high methane & land-use footprints). :contentReference[oaicite:1]{index=1}
MATERIAL_IMPACT = {
    "hemp": 1.2,
    "linen": 1.3,          # flax
    "lyocell": 1.6,        # e.g. TENCEL
    "bamboo": 2.0,         # heavily process-dependent, but often viscose-like
    "organic_cotton": 2.0, # less pesticide / water impact than conventional
    "recycled_cotton": 2.2,
    "recycled_polyester": 2.5,
    "wool": 3.5,           # high methane but durable; very rough heuristic
    "silk": 3.8,
    "cashmere": 4.2,

    "cotton": 3.0,         # conventional cotton: high water & pesticide use :contentReference[oaicite:2]{index=2}
    "viscose": 3.1,        # generic man-made cellulosics
    "modal": 3.0,
    "rayon": 3.1,

    "polyester": 4.0,      # fossil-based, microplastics :contentReference[oaicite:3]{index=3}
    "polyamide": 4.0,      # nylon
    "acrylic": 4.2,
    "synthetic_other": 4.0,
    "elastane": 4.3,       # spandex/lycra
    "synthetic_leather": 4.3,  # PU, "vegan leather" etc.
    "pvc": 4.8,

    "leather": 5.0,        # high methane + land use :contentReference[oaicite:4]{index=4}
    "fur": 5.0,

    "unknown": 3.5,        # neutral-ish default when we can't tell
}


# Stronger environmental / social certifications
STRONG_CERT_KEYWORDS = [
    "gots", "global organic textile standard",
    "fairtrade", "fair trade",
    "bluesign",
    "cradle to cradle", "cradle-to-cradle",
    "b corp", "b-corp", "b corporation",
]

# Moderate certifications / schemes
MODERATE_CERT_KEYWORDS = [
    "oeko-tex", "oekotex", "oe ko tex",
    "better cotton", "bci",
    "responsible wool standard", "rws",
    "leather working group", "lwg",
]


def _normalize_text(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _detect_material_tokens(materials: Optional[str]) -> List[Tuple[str, Optional[float]]]:
    """
    Parse a free-form materials string into (material_key, percentage) tuples.

    Examples:
      "80% cotton, 20% polyester" ->
        [("cotton", 80), ("polyester", 20)]
      "leather" -> [("leather", None)]
      "Outer: 100% organic cotton / Lining: recycled polyester" ->
        [("organic_cotton", 100), ("recycled_polyester", None)]
    """
    if not materials:
        return [("unknown", None)]

    text = materials.lower()

    # Common aliases / pre-normalization
    repl = {
        "organic cotton": "organic_cotton",
        "bio cotton": "organic_cotton",
        "recycled cotton": "recycled_cotton",
        "recycled polyester": "recycled_polyester",
        "rpet": "recycled_polyester",
        "polyamide": "polyamide",
        "nylon": "polyamide",
        "flax": "linen",
        "tencel": "lyocell",
        "lyocell": "lyocell",
        "modal": "modal",
        "viscose": "viscose",
        "rayon": "rayon",
        "bamboo": "bamboo",
        "hemp": "hemp",
        "linen": "linen",
        "wool": "wool",
        "merino": "wool",
        "silk": "silk",
        "cashmere": "cashmere",
        "leather": "leather",
        "genuine leather": "leather",
        "real leather": "leather",
        "faux leather": "synthetic_leather",
        "vegan leather": "synthetic_leather",
        "pu leather": "synthetic_leather",
        "polyurethane": "synthetic_leather",
        "pvc": "pvc",
        "polyester": "polyester",
        "elastane": "elastane",
        "spandex": "elastane",
        "lycra": "elastane",
        "acrylic": "acrylic",
    }

    for k, v in repl.items():
        text = text.replace(k, v)

    # Split by commas, slashes, semicolons
    parts = re.split(r"[,/;]+", text)
    tokens: List[Tuple[str, Optional[float]]] = []

    for part in parts:
        part = part.strip()
        if not part:
            continue

        # Look for percentage
        m = re.search(r"(\d+\.?\d*)\s*%", part)
        pct: Optional[float] = None
        if m:
            try:
                pct = float(m.group(1))
            except ValueError:
                pct = None

        # Identify the main material keyword in this part
        key = None
        for mat_key in MATERIAL_IMPACT.keys():
            if mat_key in part:
                key = mat_key
                break

        if not key:
            # Generic bucket for synthetics / unknowns
            if "poly" in part or "acrylic" in part or "elastane" in part:
                key = "synthetic_other"
            else:
                key = "unknown"

        tokens.append((key, pct))

    # If we have percentages, we may end up with totals != 100; that's okay
    return tokens or [("unknown", None)]


def _weighted_material_impact(tokens: List[Tuple[str, Optional[float]]]) -> float:
    """
    Compute a weighted average impact score from material tokens.
    If no percentages are provided, treat each material equally.
    """
    if not tokens:
        return MATERIAL_IMPACT["unknown"]

    # If any token has a percentage, treat them as weighted
    if any(pct is not None for _, pct in tokens):
        total_pct = sum(pct or 0.0 for _, pct in tokens)
        if total_pct <= 0:
            # fallback to equal weights
            weights = [1.0] * len(tokens)
        else:
            weights = [(pct or 0.0) / total_pct for _, pct in tokens]
    else:
        # Equal weights
        weights = [1.0 / len(tokens)] * len(tokens)

    impact = 0.0
    for (mat_key, _), w in zip(tokens, weights):
        impact_val = MATERIAL_IMPACT.get(mat_key, MATERIAL_IMPACT["unknown"])
        impact += w * impact_val

    return impact


def _adjust_for_certifications(
    base_score: float,
    certifications: List[str],
) -> float:
    """
    Adjust impact score based on presence of trusted fashion certifications.

    Stronger certifications (GOTS, Fairtrade, bluesign, etc.) slightly improve
    the score; medium certifications (OEKO-TEX, BCI, RWS, LWG, etc.) improve it
    a bit less. :contentReference[oaicite:5]{index=5}
    """
    if not certifications:
        return base_score

    text = " ".join(certifications).lower()

    strong_hits = sum(1 for kw in STRONG_CERT_KEYWORDS if kw in text)
    moderate_hits = sum(1 for kw in MODERATE_CERT_KEYWORDS if kw in text)

    # Each strong cert improves by 0.7, each moderate by 0.4, capped
    adjustment = -0.7 * strong_hits - 0.4 * moderate_hits
    adjustment = max(adjustment, -1.5)  # don't over-reward

    return base_score + adjustment


def _clamp_score(score: float) -> float:
    return max(1.0, min(5.0, score))


def _score_to_grade(score: float) -> str:
    """
    Map numeric impact score (1–5) to A–E grade.

      1.0–1.6 → A (lowest impact)
      1.6–2.5 → B
      2.5–3.4 → C
      3.4–4.3 → D
      4.3–5.0 → E (highest impact)
    """
    if score <= 1.6:
        return "A"
    if score <= 2.5:
        return "B"
    if score <= 3.4:
        return "C"
    if score <= 4.3:
        return "D"
    return "E"


# ---------------------------------------------------------------------------
# Gemini explanation helper
# ---------------------------------------------------------------------------

def _configure_gemini(explicit_key: Optional[str] = None) -> str:
    """Configure google-generativeai with an API key and return it."""
    if genai is None:
        raise RuntimeError(
            "google-generativeai is not installed. Install via `pip install google-generativeai`."
        )

    key = explicit_key or os.getenv(GEMINI_API_ENV_PRIMARY) or os.getenv(
        GEMINI_API_ENV_SECONDARY
    )
    if not key:
        raise RuntimeError(
            f"Missing Gemini API key. Set {GEMINI_API_ENV_PRIMARY} or {GEMINI_API_ENV_SECONDARY}."
        )

    genai.configure(api_key=key)
    return key


def _gemini_explanation(
    grade: str,
    impact_score: float,
    product: ProductMetadata,
    material_tokens: List[Tuple[str, Optional[float]]],
    certifications: List[str],
    extra_context: Optional[Dict[str, Any]] = None,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
) -> str:
    """
    Use Gemini to generate a short summary (2–3 sentences) explaining the eco score.

    If Gemini is unavailable or errors, a simple fallback explanation is returned.
    """
    try:
        _configure_gemini(api_key)
    except Exception as e:
        # Fallback: simple explanation
        return (
            f"Assigned Eco grade {grade} based on materials '{product.materials or 'unknown'}' "
            f"and certifications {certifications or ['none']}, mapped to an impact score of "
            f"{impact_score:.1f} on a 1–5 scale (1 = lowest impact, 5 = highest)."
        )

    material_summary_parts = []
    for mat_key, pct in material_tokens:
        if pct is not None:
            material_summary_parts.append(f"{pct:.0f}% {mat_key}")
        else:
            material_summary_parts.append(mat_key)
    material_summary = ", ".join(material_summary_parts) or "unknown materials"

    cert_text = ", ".join(certifications) if certifications else "no major environmental certifications found"
    origin_text = product.origin or "unknown origin"

    extra_str = ""
    if extra_context:
        # Keep this short; just surface a couple of useful flags
        notes = []
        eco_notes = extra_context.get("eco_notes") or product.eco_notes
        if eco_notes:
            notes.append(f"extra notes: {eco_notes[:200]}")
        if product.brand:
            notes.append(f"brand: {product.brand}")
        extra_str = "; ".join(notes)

    system_prompt = (
        "You are an assistant that explains eco-scores for fashion products in clear, "
        "non-technical language. You receive: (1) a grade A–E, where A is lowest "
        "environmental impact and E is highest; (2) a numeric impact score from 1–5 "
        "(1 = best); and (3) basic metadata about the product. You must summarise "
        "in 2–3 short sentences why the product likely received this score. Focus "
        "on material choices, presence or absence of certifications, and any hints "
        "about origin or sustainability notes. Do NOT mention that this is a "
        "heuristic or that a model generated the score."
    )

    user_prompt = f"""
Eco score details:
- Grade: {grade}
- Numeric impact_score (1=lowest impact, 5=highest impact): {impact_score:.2f}
- Materials: {material_summary}
- Origin: {origin_text}
- Certifications: {cert_text}
- Product title: {product.title}
- Brand: {product.brand or 'unknown'}
- URL: {product.url}
- Additional context: {extra_str or 'none'}

Write a short explanation (2–3 sentences) for a shopper that says WHY this item
got this grade, in terms of materials, certifications, and likely environmental impact.
Do not mention the underlying algorithm or scoring logic.
"""

    try:
        model = genai.GenerativeModel(
            model_name,
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            [{"role": "user", "parts": [user_prompt]}]
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Empty Gemini response")
        # Keep explanation fairly short
        if len(text) > 600:
            text = text[:600]
        return text
    except Exception:
        # Robust fallback if the API call fails for any reason
        return (
            f"Eco grade {grade} reflects the estimated impact of the materials "
            f"({material_summary}) and the limited certification signal ({cert_text}), "
            f"mapped to an impact score of {impact_score:.1f} on a 1–5 scale."
        )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def compute_eco_score(
    product: ProductMetadata,
    tag_structured: Optional[Dict[str, Any]] = None,
    lykdat_raw: Optional[Dict[str, Any]] = None,
    gemini_api_key: Optional[str] = None,
) -> EcoScore:
    """
    Compute an EcoScore (grade A–E + explanation) for a single product.

    Heuristic steps:
      1) Parse product.materials (optionally overridden/augmented by tag_structured
         if it contains more precise material_composition or materials fields).
      2) Map dominant fibre mix to an impact score between 1 and 5 using
         MATERIAL_IMPACT and a weighted average.
      3) Adjust the score downwards (better) for credible sustainability
         certifications (GOTS, Fairtrade, OEKO-TEX, etc.).
      4) Clamp to [1, 5] and convert to a letter grade A–E.
      5) Use Gemini to generate a short explanatory summary if available;
         otherwise fall back to a simple template.
    """
    # --- Step 1: derive materials string & certifications ---

    # Prefer structured tag info if present
    materials_str = product.materials
    certs: List[str] = list(product.certifications or [])

    if tag_structured:
        # tag_structured["materials"] may be a string
        ts_materials = tag_structured.get("materials")
        if isinstance(ts_materials, str) and ts_materials.strip():
            materials_str = ts_materials

        # tag_structured may also have material_composition as a list of dicts
        comp = tag_structured.get("material_composition")
        if isinstance(comp, list) and comp:
            parts = []
            for m in comp:
                if not isinstance(m, dict):
                    continue
                name = m.get("material") or m.get("name")
                pct = m.get("percentage")
                if name and pct is not None:
                    parts.append(f"{pct}% {name}")
                elif name:
                    parts.append(str(name))
            if parts:
                materials_str = ", ".join(parts)

        ts_certs = tag_structured.get("certifications")
        if isinstance(ts_certs, list):
            for c in ts_certs:
                if c and c not in certs:
                    certs.append(str(c))
        elif isinstance(ts_certs, str) and ts_certs.strip():
            if ts_certs not in certs:
                certs.append(ts_certs)

    # --- Step 2: material mix → base impact score ---

    tokens = _detect_material_tokens(materials_str)
    base_material_score = _weighted_material_impact(tokens)

    # --- Step 3: adjust for certifications ---

    adjusted_score = _adjust_for_certifications(base_material_score, certs)
    final_score = _clamp_score(adjusted_score)

    # --- Step 4: numeric score → letter grade ---

    grade = _score_to_grade(final_score)

    # --- Step 5: material + origin summary string ---

    mat_orig = (materials_str or "unknown materials").strip()
    if product.origin:
        mat_orig = f"{mat_orig} | origin: {product.origin}"

    # --- Step 6: explanation (Gemini if available, else fallback) ---

    extra_context: Dict[str, Any] = {
        "eco_notes": product.eco_notes,
        "lykdat_labels": (lykdat_raw or {}).get("labels") if isinstance(lykdat_raw, dict) else None,
    }

    explanation = _gemini_explanation(
        grade=grade,
        impact_score=final_score,
        product=product,
        material_tokens=tokens,
        certifications=certs,
        extra_context=extra_context,
        api_key=gemini_api_key,
    )

    return EcoScore(
        grade=grade,
        impact_score=final_score,
        material_and_origin=mat_orig,
        certifications=certs,
        impact_explanation=explanation,
    )
