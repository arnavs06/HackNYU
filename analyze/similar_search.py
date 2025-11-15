import os
import mimetypes
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

import requests

from analyze.helper import get_env, safe_get
from analyze.base import ProductMetadata

# ---------- Lykdat Global Search config ----------

LYKDAT_GLOBAL_SEARCH_URL = "https://cloudapi.lykdat.com/v1/global/search"
LYKDAT_API_ENV = "LYKDAT_API_KEY"

# ---------- Gemini config (for product-page parsing) ----------
GEMINI_API_ENV = "GEMINI_API_KEY"

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore


def _get_lykdat_api_key(explicit: Optional[str] = None) -> str:
    """Resolve the Lykdat API key (publishable)."""
    if explicit:
        return explicit
    return get_env(LYKDAT_API_ENV, required=True)


def _guess_mime_type(path: str) -> str:
    mime, _ = mimetypes.guess_type(path)
    return mime or "image/jpeg"


def global_search_image_file(
    image_path: str,
    api_key: Optional[str] = None,
    timeout: float = 20.0,
) -> Dict[str, Any]:
    """
    Call Lykdat Global Search with an image file.

    Uses /v1/global/search to search Lykdat's aggregated apparel catalog, which
    spans popular clothing retailers and returns similar products with metadata
    like name, brand, price, currency, and product URL.
    """
    key = _get_lykdat_api_key(api_key)

    mime_type = _guess_mime_type(image_path)
    with open(image_path, "rb") as f:
        files = [
            ("image", (os.path.basename(image_path), f, mime_type)),
        ]
        payload = {
            "api_key": key,
        }
        resp = requests.post(
            LYKDAT_GLOBAL_SEARCH_URL,
            data=payload,
            files=files,
            timeout=timeout,
        )

    if not resp.ok:
        raise RuntimeError(
            f"Lykdat global search failed for file '{image_path}' "
            f"with status {resp.status_code}: {resp.text}"
        )

    try:
        data = resp.json()
    except Exception:
        raise RuntimeError(
            f"Failed to parse JSON from Lykdat global search for file '{image_path}': {resp.text}"
        )

    return data.get("data") or data


def _configure_gemini(explicit_key: Optional[str] = None) -> str:
    """Configure google-generativeai with an API key and return it."""
    if genai is None:
        raise RuntimeError(
            "google-generativeai is not installed. Install via `pip install google-generativeai`."
        )

    key = explicit_key or os.getenv(GEMINI_API_ENV)
    if not key:
        raise RuntimeError(
            f"Missing Gemini API key. Set {GEMINI_API_ENV} in the environment, "
            "or pass gemini_api_key to the function."
        )

    genai.configure(api_key=key)
    return key


def gemini_parse_product_html(
    html: str,
    source_url: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",
) -> Dict[str, Any]:
    """
    Ask Gemini to parse a clothing product page HTML into structured metadata.

    The goal is to normalize different retailer schemas into a common shape.
    """
    _configure_gemini(api_key)

    system_prompt = (
        "You are a fashion product metadata parser. You receive raw HTML from a "
        "single product detail page (PDP) for a clothing item.\n"
        "Extract as much structured metadata as you can and return ONLY valid JSON."
    )

    user_prompt = f"""
You are given the raw HTML from a clothing product page at:

{source_url}

HTML (possibly truncated):

\"\"\"{html[:15000]}\"\"\"  # keep it bounded for safety

From this, extract the product's metadata and return strictly valid JSON
with the following shape (include fields even if null):

{{
  "brand": string or null,
  "product_name": string or null,
  "materials": string or null,           // e.g. "80% cotton, 20% polyester"
  "origin": string or null,              // e.g. "Made in Bangladesh"
  "certifications": [string],            // e.g. "GOTS", "Fairtrade"
  "price": number or null,               // numeric price if you can parse one
  "currency": string or null,            // e.g. "USD", "EUR"
  "eco_notes": string or null            // short note about any sustainability info
}}

Do NOT wrap the JSON in backticks. Do NOT add explanations.
Only output the JSON object.
"""

    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
    )

    response = model.generate_content(
        [{"role": "user", "parts": [user_prompt]}]
    )

    raw_text = response.text or ""

    import json

    try:
        data = json.loads(raw_text)
    except json.JSONDecodeError:
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            data = json.loads(raw_text[start : end + 1])
        else:
            raise RuntimeError(f"Gemini returned non-JSON content: {raw_text}")

    if not isinstance(data, dict):
        raise RuntimeError(f"Gemini returned non-object JSON: {data!r}")

    return data


def _lykdat_to_product_metadata_list(
    search_data: Dict[str, Any],
    max_results: int = 10,
) -> List[ProductMetadata]:
    """
    Convert Lykdat Global Search 'data' payload into a list of ProductMetadata.

    We flatten over all result_groups[].similar_products[] and sort by score.
    """
    result_groups = search_data.get("result_groups") or []

    items: List[Dict[str, Any]] = []
    for group in result_groups:
        for prod in group.get("similar_products") or []:
            prod = dict(prod)
            prod["_group_rank_score"] = group.get("rank_score")
            items.append(prod)

    # Sort by product score (descending)
    items.sort(key=lambda p: float(p.get("score", 0.0)), reverse=True)

    out: List[ProductMetadata] = []
    for prod in items[:max_results]:
        url = prod.get("url") or ""
        name = prod.get("name") or "Clothing item"
        brand = prod.get("brand_name")
        price_str = prod.get("price")
        price_val: Optional[float] = None
        if price_str is not None:
            try:
                price_val = float(price_str)
            except (TypeError, ValueError):
                price_val = None

        currency = prod.get("currency")
        gender = prod.get("gender")
        category = prod.get("category")
        sub_category = prod.get("sub_category")
        vendor = prod.get("vendor")

        notes_parts: List[str] = []
        if gender:
            notes_parts.append(f"gender: {gender}")
        if category:
            notes_parts.append(f"category: {category}")
        if sub_category:
            notes_parts.append(f"sub_category: {sub_category}")
        if vendor:
            notes_parts.append(f"vendor: {vendor}")

        eco_notes = "; ".join(notes_parts) if notes_parts else None

        out.append(
            ProductMetadata(
                url=url,
                title=name,
                brand=brand,
                product_name=name,
                materials=None,
                origin=None,
                certifications=[],
                price=price_val,
                currency=currency,
                eco_notes=eco_notes,
            )
        )

    return out


def _enrich_with_gemini(
    base_meta: ProductMetadata,
    product_html: Optional[str],
    source_url: str,
    gemini_api_key: Optional[str] = None,
) -> ProductMetadata:
    """If we have HTML, ask Gemini to refine product metadata."""
    if not product_html:
        return base_meta

    try:
        parsed = gemini_parse_product_html(
            html=product_html,
            source_url=source_url,
            api_key=gemini_api_key,
        )
    except Exception as e:
        # Best-effort: log and fall back to base metadata
        print(f"[warn] Gemini parse failed for {source_url}: {e}")
        return base_meta

    brand = parsed.get("brand") or base_meta.brand
    product_name = parsed.get("product_name") or base_meta.product_name
    materials = parsed.get("materials") or base_meta.materials
    origin = parsed.get("origin") or base_meta.origin

    certifications = list(base_meta.certifications)
    parsed_certs = parsed.get("certifications") or []
    if isinstance(parsed_certs, str):
        parsed_certs = [parsed_certs]
    for c in parsed_certs:
        if c and c not in certifications:
            certifications.append(str(c))

    price = base_meta.price
    if parsed.get("price") is not None:
        try:
            price = float(parsed["price"])
        except (TypeError, ValueError):
            pass

    currency = parsed.get("currency") or base_meta.currency

    eco_notes = base_meta.eco_notes
    parsed_eco = parsed.get("eco_notes")
    if parsed_eco:
        if eco_notes:
            eco_notes = eco_notes + " | " + str(parsed_eco)
        else:
            eco_notes = str(parsed_eco)

    return ProductMetadata(
        url=base_meta.url,
        title=product_name or base_meta.title,
        brand=brand,
        product_name=product_name or base_meta.product_name,
        materials=materials,
        origin=origin,
        certifications=certifications,
        price=price,
        currency=currency,
        eco_notes=eco_notes,
    )


def find_similar_clothing_with_metadata(
    clothing_image_path: str,
    max_results: int = 10,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    High-level pipeline:

    1. Use Lykdat Global Search with the clothing image to find visually
       similar apparel items from popular online stores.
    2. Map the top K results to ProductMetadata.
    3. For each result, optionally fetch the product page HTML and use Gemini
       to normalize/enrich metadata (materials, origin, certifications, etc.).
    4. Return a JSON-serializable list of product metadata dicts.
    """
    # 1) Lykdat Global Search
    search_data = global_search_image_file(
        image_path=clothing_image_path,
        api_key=lykdat_api_key,
    )

    # 2) Convert to ProductMetadata list
    base_products = _lykdat_to_product_metadata_list(
        search_data=search_data,
        max_results=max_results,
    )

    # 3) Enrich with Gemini using product HTML
    enriched: List[ProductMetadata] = []
    for pm in base_products:
        html = safe_get(pm.url, timeout=10.0) if pm.url else None
        enriched_pm = _enrich_with_gemini(
            base_meta=pm,
            product_html=html,
            source_url=pm.url,
            gemini_api_key=gemini_api_key,
        )
        enriched.append(enriched_pm)

    # 4) Return as JSON-serializable dicts
    return [asdict(p) for p in enriched]
