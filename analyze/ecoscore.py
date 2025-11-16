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
    # --- Very low impact bio-based fibres (best) ---

    # Hemp generally shows substantially lower GHG and eutrophication than cotton.:contentReference[oaicite:0]{index=0}
    "hemp": 1.1,

    # Flax/linen scores very well in comparative LCAs vs cotton, especially on water and inputs.:contentReference[oaicite:1]{index=1}
    "linen": 1.2,

    # Closed-loop lyocell (e.g. TENCEL) usually outperforms both cotton and generic viscose in Higg/TE matrices.:contentReference[oaicite:2]{index=2}
    "lyocell": 1.3,

    # --- Organic / recycled natural fibres ---

    # Organic cotton has lower GWP and eutrophication than conventional, but still water/land intensive.:contentReference[oaicite:3]{index=3}
    "organic_cotton": 2.4,

    # Mechanical / chemical recycling of cellulosics tends to reduce impacts vs virgin cotton/viscose.:contentReference[oaicite:4]{index=4}
    "recycled_cotton": 2.0,

    # Recycled wool shows an order-of-magnitude reduction in CO₂ vs virgin wool in recent LCAs.:contentReference[oaicite:5]{index=5}
    "recycled_wool": 2.2,

    # --- Down / feather insulation ---

    # Multiple LCAs (commissioned by down industry but ISO-compliant) find ~85–97% lower impact vs polyester fill.:contentReference[oaicite:6]{index=6}
    "down": 2.8,
    "feather": 3.0,

    # --- Regenerated cellulosics / bamboo ---

    # Generic viscose / rayon (wood- or bamboo-based) sits between cotton and synthetics: lower GWP than cotton,
    # but forestry + chemistry issues.:contentReference[oaicite:7]{index=7}
    "viscose": 3.1,
    "rayon": 3.1,

    # Modal is usually a bit better than generic viscose (often from beech, more controlled processes).:contentReference[oaicite:8]{index=8}
    "modal": 2.9,

    # Cupro is a regenerated cellulose (cotton linter) with impacts typically comparable to better MMCFs.
    "cupro": 2.8,

    # “Bamboo” on labels is usually bamboo viscose, not closed-loop lyocell, and carries similar chemistry/forestry risk.:contentReference[oaicite:9]{index=9}
    "bamboo": 2.6,

    # --- Conventional plant / animal fibres ---

    # Conventional cotton repeatedly shows the highest impact among common fibres for GWP, acidification, and water use.:contentReference[oaicite:10]{index=10}
    "cotton": 3.6,

    # Wool has very high climate impact per kg (methane), even when it’s a small % of the product weight.:contentReference[oaicite:11]{index=11}
    "wool": 4.2,

    # Silk is one of the highest-impact fibres in Higg-style scoring, mainly due to energy-intensive sericulture.:contentReference[oaicite:12]{index=12}
    "silk": 4.3,

    # Cashmere has extremely high GHG per kg (hundreds of kg CO₂-eq) due to low yields and grazing impacts.:contentReference[oaicite:13]{index=13}
    "cashmere": 4.9,

    # --- Synthetics & recycled synthetics ---

    # Fossil-based synthetics dominate fibre volume and emissions; polyester is the biggest single driver today.:contentReference[oaicite:14]{index=14}
    "polyester": 3.9,

    # Nylon/polyamide is generally more energy-intensive than polyester, with similar microplastic issues.:contentReference[oaicite:15]{index=15}
    "polyamide": 4.1,

    # Recycled polyester reduces GHG and energy use vs virgin in many LCAs, but still shares microfiber and end-of-life issues.:contentReference[oaicite:16]{index=16}
    "recycled_polyester": 3.4,

    # Recycled nylon / polyamide shows ~20% CO₂-e reduction per kg vs virgin in brand LCAs, with the usual caveats.:contentReference[oaicite:17]{index=17}
    "recycled_polyamide": 3.4,

    # Recycled acrylic: some benefit vs virgin but still a niche / high-impact synthetic.
    "recycled_acrylic": 3.6,

    # Acrylic and elastane are among the higher-impact synthetics per kg in many inventories.
    "acrylic": 4.3,
    "elastane": 4.4,  # spandex/lycra

    # Generic bucket for other synthetics when we only know “poly”.
    "synthetic_other": 4.0,

    # --- Coated synthetics & “vegan” leathers ---

    # PU/PVC “vegan leather” avoids methane, but adds coating chemistry and fossil-based polymers.:contentReference[oaicite:18]{index=18}
    "synthetic_leather": 4.6,

    # PVC is consistently one of the worst polymers in LCAs because of chlorine chemistry and additives.
    "pvc": 4.7,

    # --- High-impact animal-based luxury materials ---

    # Leather & fur carry the upstream impacts of cattle/sheep farming (deforestation, methane) plus tanning/processing.:contentReference[oaicite:19]{index=19}
    "leather": 4.8,
    "fur": 5.0,

    # Fallback when we truly don't know.
    "unknown": 3.5,
}



# Stronger environmental / social certifications
STRONG_CERT_KEYWORDS = [
    # --- Your existing ones ---
    "gots", "global organic textile standard",
    "fairtrade", "fair trade",
    "bluesign",
    "cradle to cradle", "cradle-to-cradle",
    "b corp", "b-corp", "b corporation",

    # --- Strong textile-specific standards / labels ---

    # Global Recycled / Recycled Claim / Organic Content (Textile Exchange)
    "global recycled standard", "global recycling standard", "grs",
    "recycled claim standard", "rcs",
    "organic content standard", "organic cotton standard", "ocs",

    # Holistic textile / fashion standards
    "global organic textile standard (gots)",  # explicit variant
    "grs certified", "rcs certified", "ocs certified",

    # Fairtrade variants
    "fairtrade cotton", "fairtrade textile standard",
    "fair trade certified",

    # Fair labour / social (high bar)
    "fair wear foundation", "fair wear", "fairwear",
    "world fair trade organization", "world fair trade organisation", "wfto",
    "sa8000",

    # Wool: high welfare / traceability
    "zq merino", "zqrx", "zq merino wool",

    # Multi-attribute ecolabels used on textiles
    "eu ecolabel", "european ecolabel",
    "nordic swan", "nordic swan ecolabel", "svanen",

    # Regenerative / advanced organic farm standards
    "regenerative organic certified", "roc",
    "certified regenerative by agw",

    # Vegan / cruelty-free labels explicitly used on fashion
    "peta-approved vegan", "peta approved vegan",
    "vegan trademark", "the vegan society", "vegan society trademark",
    "certified vegan", "vegan action",
]

MODERATE_CERT_KEYWORDS = [
    # --- Your existing ones + full OEKO-TEX family ---

    # OEKO-TEX umbrella and variants
    "oeko-tex", "oekotex", "oe ko tex", "oeko tex",
    "standard 100 by oeko-tex", "oeko-tex standard 100", "standard 100 oeko-tex",
    "made in green by oeko-tex", "oeko-tex made in green",
    "leather standard by oeko-tex", "oeko-tex leather standard",
    "step by oeko-tex", "oeko-tex step",
    "eco passport by oeko-tex", "oeko-tex eco passport",
    "oeko-tex organic cotton",

    # Better Cotton
    "better cotton", "better cotton initiative", "bci",
    "bci cotton", "better cotton standard",

    # Textile Exchange animal / fibre standards (good but narrower)
    "responsible wool standard", "rws",
    "responsible down standard", "rds",
    "responsible alpaca standard", "ras",
    "responsible mohair standard", "rms",

    # Leather Working Group (environmental, but not full lifecycle)
    "leather working group", "lwg",
    "lwg-certified", "lwg certified", "lwg gold rated", "lwg silver rated",

    # Organic farm logos applied to fibre (strong upstream, but no textile-process coverage)
    "usda organic", "usda certified organic",
    "soil association organic", "soil association certified",
    "eu organic", "eu organic logo", "european organic logo",

    # Recycling / content labels closely related to GRS/RCS
    "recycled content certification", "scs recycled content",
    "recycled content certified",

    # Other animal welfare / vegan cues that may appear on fashion pages
    "leaping bunny", "cruelty free international",
    "peta cruelty-free", "peta cruelty free",
]



def _normalize_text(s: Optional[str]) -> str:
    return (s or "").strip().lower()

from typing import Optional, Dict, Any, List

def _infer_material_from_labels(lykdat_raw: Dict[str, Any]) -> Optional[str]:
    """
    Heuristic guess of fabric composition from Lykdat-style labels.

    Returns a materials string like:
        "98% cotton, 2% elastane"
        "Shell: 100% polyester / Fill: 80% down, 20% feather"
        "100% recycled_polyester"

    This is *only* a fallback when brand/retailer materials are missing.
    """

    if not lykdat_raw:
        return None

    labels = lykdat_raw.get("labels") or []
    names: List[str] = []

    # gather text fields we’ve seen in Lykdat responses: name/category/type
    for lab in labels:
        if not isinstance(lab, dict):
            continue
        for key in ("name", "category", "type"):
            val = lab.get(key)
            if isinstance(val, str):
                v = val.strip().lower()
                if v:
                    names.append(v)

    if not names:
        return None

    blob = " ".join(names)

    def has(term: str) -> bool:
        return term in blob

    def has_any(*terms: str) -> bool:
        return any(has(t) for t in terms)

    def has_all(*terms: str) -> bool:
        return all(has(t) for t in terms)

    # --- 1. Very specific / high-signal cases first ---

    # Synthetic leather vs real leather
    if has_any("faux leather", "fake leather", "vegan leather", "pu leather",
               "pu-leather", "synthetic leather", "polyurethane leather"):
        return "100% synthetic_leather"

    if has("leather") and not has_any("faux", "vegan", "pu", "synthetic"):
        return "100% leather"

    # Faux fur vs real fur
    if has_any("faux fur", "fake fur"):
        return "100% synthetic_other"
    if has("fur"):
        return "100% fur"

    # Recycled fibres explicitly called out
    if has_all("recycled", "polyester") or has("recycled polyester") or has("rpet"):
        return "100% recycled_polyester"
    if has_all("recycled", "cotton") or has("recycled cotton"):
        return "100% recycled_cotton"
    if has_all("recycled", "wool") or has("recycled wool"):
        return "100% recycled_wool"
    if has_all("recycled", "nylon") or has_all("recycled", "polyamide"):
        return "100% recycled_polyamide"

    # Cashmere / wool / knitwear where fibre is explicit
    if has("cashmere"):
        return "100% cashmere"
    if has_any("merino", "wool"):
        # many mid-range sweaters are blends, so assume wool-rich
        return "80% wool, 20% polyamide"

    # Explicit bast / cellulose fibres
    if has("hemp"):
        return "100% hemp"
    if has_any("linen", "flax"):
        return "100% linen"
    if has_any("tencel", "lyocell"):
        return "100% lyocell"
    if has("cupro"):
        return "100% cupro"

    # Organic cotton explicitly labelled
    if has("organic cotton"):
        return "100% organic cotton"

    # --- 2. Category- and use-based heuristics with typical blends ---

    # Denim: typical stretch denim is ~98% cotton / 2% elastane.:contentReference[oaicite:20]{index=20}
    if has_any("denim", "jeans", "jean"):
        organic = has("organic")
        if has_any("stretch", "skinny", "slim", "jegging", "super stretch"):
            cotton_key = "organic cotton" if organic else "cotton"
            return f"98% {cotton_key}, 2% elastane"
        if has_any("rigid", "non-stretch", "non stretch"):
            cotton_key = "organic cotton" if organic else "cotton"
            return f"100% {cotton_key}"
        # default denim
        cotton_key = "organic cotton" if organic else "cotton"
        return f"98% {cotton_key}, 2% elastane"

    # Leggings / yoga / gym tights: 80% poly / 20% elastane is a very common spec.:contentReference[oaicite:21]{index=21}
    if has_any("leggings", "legging", "yoga", "gym", "sports bra", "sport bra",
               "bike shorts", "biker shorts", "training tights",
               "running tights", "compression tights"):
        if has_any("nylon", "polyamide"):
            return "80% polyamide, 20% elastane"
        return "80% polyester, 20% elastane"

    # Swimwear: typically ~80% polyamide / 20% elastane.:contentReference[oaicite:22]{index=22}
    if has_any("swimsuit", "swimwear", "bikini", "swim brief", "one-piece", "one piece"):
        if has_any("nylon", "polyamide"):
            return "80% polyamide, 20% elastane"
        return "82% polyester, 18% elastane"

    # Fleece / sherpa: usually polyester-rich.
    if has_any("fleece", "sherpa"):
        return "100% polyester"

    # Hoodies / sweatshirts / joggers: 60/40 cotton-poly is extremely common.:contentReference[oaicite:23]{index=23}
    if has_any("hoodie", "hooded sweatshirt", "sweatshirt",
               "sweatpants", "joggers", "jogger", "track pants"):
        return "60% cotton, 40% polyester"

    # Puffer / quilted / down jackets: assume poly shell + down/feather fill.:contentReference[oaicite:24]{index=24}
    if has_any("puffer", "down jacket", "quilted jacket", "padded jacket"):
        return "Shell: 100% polyester / Fill: 80% down, 20% feather"

    # Tailored suiting: blazers, suit trousers, overcoats are often wool-rich blends.
    if has_any("blazer", "tailored jacket", "suit jacket", "suit trouser",
               "suit pants", "overcoat", "peacoat", "trench coat"):
        if has_any("wool", "merino"):
            return "70% wool, 30% polyester"
        # fallback synthetic suiting
        return "70% polyester, 30% viscose"

    # Tees / polos: split between cotton basics and performance polyester.
    if has_any("t-shirt", "tee", "t shirt", "tank top", "polo"):
        if has_any("performance", "training", "running", "jersey", "dry fit", "dri-fit", "dri fit"):
            return "100% polyester"
        return "100% cotton"

    # Shirts / blouses: if "linen" or "silk" or "satin" appears, we already handled above;
    # otherwise guess cotton.
    if has_any("shirt", "button-down", "oxford", "blouse"):
        return "100% cotton"

    # Dresses / skirts: basic heuristics.
    if has_any("dress", "skirt"):
        if has_any("satin", "chiffon", "crepe", "georgette", "organza"):
            return "100% polyester"
        if has("linen"):
            return "100% linen"
        if has_any("viscose", "rayon", "modal"):
            return "100% viscose"
        return "60% cotton, 40% polyester"

    # --- 3. Fallback: pick strongest explicit material if any ---

    # Try to infer a single clear dominant fibre.
    # Order roughly tracks from lowest to highest impact.
    if has("hemp"):
        return "100% hemp"
    if has_any("linen", "flax"):
        return "100% linen"
    if has_any("tencel", "lyocell"):
        return "100% lyocell"
    if has("bamboo"):
        return "100% bamboo"
    if has("organic cotton"):
        return "100% organic cotton"
    if has("cotton"):
        return "100% cotton"
    if has_any("viscose", "rayon"):
        return "100% viscose"
    if has("modal"):
        return "100% modal"
    if has("cupro"):
        return "100% cupro"
    if has_any("recycled polyester", "recycled_polyester", "rpet"):
        return "100% recycled_polyester"
    if has("polyester"):
        return "100% polyester"
    if has_any("recycled nylon", "recycled polyamide"):
        return "100% recycled_polyamide"
    if has_any("nylon", "polyamide"):
        return "100% polyamide"
    if has("acrylic"):
        return "100% acrylic"
    if has_any("elastane", "spandex", "lycra"):
        return "100% elastane"
    if has("down"):
        return "100% down"
    if has("feather"):
        return "100% feather"

    # If nothing matched strongly, let caller treat as unknown.
    return None

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
        # existing entries ...
        "organic cotton": "organic_cotton",
        "bio cotton": "organic_cotton",
        "recycled cotton": "recycled_cotton",
        "recycled polyester": "recycled_polyester",
        "rpet": "recycled_polyester",

        # NEW recycled aliases
        "recycled wool": "recycled_wool",
        "recycled nylon": "recycled_polyamide",
        "recycled polyamide": "recycled_polyamide",
        "recycled acrylic": "recycled_acrylic",

        # NEW explicit cupro
        "cupro": "cupro",

        # rest of your existing mappings...
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
    if not certifications:
        return base_score

    text = " ".join(certifications).lower()

    strong_present = any(kw in text for kw in STRONG_CERT_KEYWORDS)
    moderate_present = any(kw in text for kw in MODERATE_CERT_KEYWORDS)

    # Optional: count unique strong keywords to gently reward stacking
    strong_count = len({kw for kw in STRONG_CERT_KEYWORDS if kw in text})
    moderate_count = len({kw for kw in MODERATE_CERT_KEYWORDS if kw in text})

    # Base bonuses
    adjustment = 0.0
    if strong_present:
        adjustment -= 0.7
    if moderate_present:
        adjustment -= 0.4

    # Tiny extra bonus per additional distinct cert beyond the first
    if strong_count > 1:
        adjustment -= 0.15 * (strong_count - 1)
    if moderate_count > 1:
        adjustment -= 0.1 * (moderate_count - 1)

    # Cap total adjustment
    adjustment = max(adjustment, -1.5)

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
    print("=== GEMINI ECOSCORE EXPLANATION ===")
    print("=== Gemini system_prompt ===")
    print(system_prompt)
    print("=== Gemini user_prompt ===")
    print(user_prompt)
    print("=== Gemini metadata ===")
    print("model_name:", model_name)
    print("material_tokens:", material_tokens)
    print("certifications:", certifications)
    print("product_title:", product.title, "product_url:", product.url)
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
    import sys
    # sys.stderr.write("🟡 compute_eco_score() CALLED\n")
    # sys.stderr.flush()
    
    # sys.stderr.write(f"   Product: {product.title}\n")
    # sys.stderr.flush()
    # sys.stderr.write(f"   Materials: {product.materials}\n")
    # sys.stderr.flush()
    # --- Step 1: derive materials string & certifications ---

    # Prefer structured tag info if present
    materials_str = product.materials
    certs: List[str] = list(product.certifications or [])
    if not materials_str and lykdat_raw:
        guessed = _infer_material_from_labels(lykdat_raw)
        if guessed:
            materials_str = guessed

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
