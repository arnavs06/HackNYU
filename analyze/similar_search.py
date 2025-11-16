import os
import sys
import mimetypes
from dataclasses import asdict
from typing import Any, Dict, List, Optional
import concurrent.futures  # <-- add this

import requests

from helper import get_env, safe_get
from base import ProductMetadata
from tagging import (
    DeepTagResult,
    deep_tag_image_url,
    deep_tags_to_product_metadata,
    TagMetadata,
)
from ecoscore import compute_eco_score

# --- Lykdat Global Search config ---

LYKDAT_GLOBAL_SEARCH_URL = "https://cloudapi.lykdat.com/v1/global/search"
LYKDAT_API_ENV = "LYKDAT_API_KEY"

# --- Gemini config (for product-page parsing) ---

GEMINI_API_ENV_PRIMARY = "GEMINI_API_KEY"

try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore


# ---------------------------------------------------------------------------
# Lykdat helpers
# ---------------------------------------------------------------------------

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
    gender: Optional[str] = None,          # "male" / "female" / "unisex"
    for_adults: Optional[bool] = None,     # True / False
    implicitly_filter_categories: bool = True,
) -> Dict[str, Any]:
    """
    Call Lykdat Global Search with a local image file.

    Uses /v1/global/search to search Lykdat's aggregated apparel catalog and
    returns similar_products under data.result_groups[].similar_products[].
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

        if gender:
            payload["filter_gender"] = gender

        if for_adults is not None:
            payload["filter_for_adults"] = 1 if for_adults else 0

        if implicitly_filter_categories:
            payload["implicitly_filter_categories"] = 1
            
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


def _flatten_global_results(search_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Flatten data.result_groups[].similar_products[] into a single scored list.
    """
    result_groups = search_data.get("result_groups") or []

    items: List[Dict[str, Any]] = []
    for group in result_groups:
        rank_score = group.get("rank_score")
        for prod in group.get("similar_products") or []:
            p = dict(prod)
            p["_rank_score"] = rank_score
            items.append(p)

    # Sort by similarity score descending
    items.sort(key=lambda p: float(p.get("score") or 0.0), reverse=True)
    return items


# ---------------------------------------------------------------------------
# US bias helpers (currency + domain heuristics)
# ---------------------------------------------------------------------------

US_RETAILER_DOMAINS = [
    # Expand / tweak this as needed
    "macys.com",
    "nordstrom.com",
    "bloomingdales.com",
    "urbanoutfitters.com",
    "gap.com",
    "oldnavy.com",
    "bananarepublic.com",
    "jcrew.com",
    "ae.com",              # American Eagle
    "abercrombie.com",
    "hollisterco.com",
    "levi.com",
    "zappos.com",
    "rei.com",
    "dillards.com",
    "kohls.com",
    "target.com",
    "walmart.com",
    "backcountry.com",
]


def is_us_like_product(prod: Dict[str, Any]) -> bool:
    """
    Heuristic: consider a product "US-like" if:
      - currency is USD, and
      - (optionally) the retailer domain looks like a US retailer.

    For hackathon/demo purposes this is good enough; it's not a legal definition
    of "sold in the US".
    """
    currency = (prod.get("currency") or "").upper()
    url = (prod.get("url") or "").lower()

    if currency != "USD":
        return False

    # If no URL, but currency is USD, still accept it.
    if not url:
        return True

    # Domain allowlist: prefer known US/on-US retailers
    for dom in US_RETAILER_DOMAINS:
        if dom in url:
            return True

    # If it's USD but not in the allowlist, you can choose:
    # - return True to keep it, or
    # - return False to be stricter.
    # For now, be lenient:
    return True


def select_us_biased_products(
    flat_products: List[Dict[str, Any]],
    max_results: int,
) -> List[Dict[str, Any]]:
    """
    Take a flat, score-sorted product list and:
      - first keep all products that look "US-like",
      - then top up with non-US products if there are fewer than max_results.

    This way you mostly see US products, but you still get k results even if
    the global search didn't return enough US ones.
    """
    us_like = [p for p in flat_products if is_us_like_product(p)]
    non_us = [p for p in flat_products if p not in us_like]

    if len(us_like) >= max_results:
        return us_like[:max_results]

    needed = max_results - len(us_like)
    return us_like + non_us[:needed]


# ---------------------------------------------------------------------------
# Gemini helpers (for product pages → tag-like metadata)
# ---------------------------------------------------------------------------

def _configure_gemini(explicit_key: Optional[str] = None) -> str:
    """Configure google-generativeai with an API key and return it."""
    if genai is None:
        raise RuntimeError(
            "google-generativeai is not installed. Install via `pip install google-generativeai`."
        )

    key = explicit_key or os.getenv(GEMINI_API_ENV_PRIMARY)
    if not key:
        raise RuntimeError(
            f"Missing Gemini API key. Set {GEMINI_API_ENV_PRIMARY}."
        )

    genai.configure(api_key=key)
    return key


def gemini_parse_product_text_to_tag_structured(
    product_text: str,
    api_key: Optional[str] = None,
    # model_name: str = "gemini-2.5-flash",
    model_name: str = "gemini-flash-lite-latest",
) -> Dict[str, Any]:
    """
    Parse text/HTML scraped from a clothing product page into the same JSON
    schema used for tag_structured (brand, product_name, materials, origin, etc.).
    """
    # Trim to avoid huge prompts
    text = product_text[:15000]

    _configure_gemini(api_key)

    system_prompt = (
        "You are an assistant that parses clothing product pages or descriptions.\n"
        "You receive text/HTML that may include brand, product name, materials,\n"
        "country of origin, size, and care instructions. You must extract as much\n"
        "structured metadata as possible in the same schema as a clothing tag.\n"
        "Return ONLY valid JSON, no commentary."
    )

    user_prompt = f"""
You are given text scraped from an online clothing product page.
It may include brand, product name, materials, origin, size, care instructions, etc.

Text:

\"\"\"{text}\"\"\"

Extract all the metadata you can find and return strictly valid JSON with this shape
(include fields even if null):

{{
  "brand": string or null,
  "product_name": string or null,
  "size": string or null,
  "material_composition": [
    {{
      "material": string,
      "percentage": number or null
    }}
  ],
  "materials": string or null,
  "made_in": string or null,
  "country_of_origin": string or null,
  "origin": string or null,
  "certifications": [string],
  "care_instructions": [string],
  "symbols": [string],
  "other_text": string or null,
  "price": number or null,
  "currency": string or null
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
        # Try to salvage a JSON substring
        start = raw_text.find("{")
        end = raw_text.rfind("}")
        if start != -1 and end != -1 and end > start:
            data = json.loads(raw_text[start : end + 1])
        else:
            raise RuntimeError(f"Gemini returned non-JSON content: {raw_text}")

    if not isinstance(data, dict):
        raise RuntimeError(f"Gemini returned non-object JSON: {data!r}")

    return data


# ---------------------------------------------------------------------------
# Per-product: Deep Tagging + Gemini + merge → same schema as main object
# + EcoScore
# ---------------------------------------------------------------------------

def _build_similar_product_object(
    prod: Dict[str, Any],
    lykdat_api_key: Optional[str],
    gemini_api_key: Optional[str],
) -> Dict[str, Any]:
    """
    For a single Lykdat similar_products entry, run a full pipeline:

      - Deep Tagging on the product image (Lykdat /detection/tags)
      - Fetch product page HTML and parse with Gemini into tag_structured
      - Merge into a combined_product_metadata (ProductMetadata)
      - Compute EcoScore
      - Return an object with the SAME schema as the main combined object:
        {
          clothing_image_path,
          tag_image_path,
          lykdat_deep_tag_raw,
          tag_ocr_text,
          tag_structured,
          tag_extra_fields,
          combined_product_metadata,
          eco_score
        }
    """
    product_url = prod.get("url") or ""

    # --- Choose an image URL for this product ---
    image_url: Optional[str] = None
    images = prod.get("images") or []
    if images:
        image_url = images[0]
    if not image_url and prod.get("matching_image"):
        image_url = prod["matching_image"]

    if not image_url:
        raise RuntimeError("No image URL found for similar product")

    # --- Deep Tagging on similar product image ---
    deep_tags: DeepTagResult = deep_tag_image_url(image_url, api_key=lykdat_api_key)
    product_from_lykdat: ProductMetadata = deep_tags_to_product_metadata(
        deep_tags,
        source_url=product_url or image_url,
    )

    # --- Fetch product page text (HTML) ---
    page_text: str = ""
    if product_url:
        html = safe_get(product_url, timeout=10.0)
        if html:
            page_text = html

    # --- Gemini parsing into tag_structured ---
    tag_structured: Dict[str, Any] = {}
    tag_meta: TagMetadata = TagMetadata(
        brand=None,
        product_name=None,
        materials=None,
        origin=None,
        certifications=[],
        size=None,
        care_instructions=[],
        extra_fields={},
        raw_text=page_text,
        raw_structured={},
    )

    if page_text:
        try:
            structured = gemini_parse_product_text_to_tag_structured(
                page_text,
                api_key=gemini_api_key,
            )
            tag_structured = structured
            tag_meta = TagMetadata.from_gemini_response(page_text, structured)
        except Exception as e:
            print(f"[warn] Gemini product parse failed for {product_url}: {e}", file=sys.stderr)

    # --- Merge DeepTag + tag_meta + Lykdat search metadata into ProductMetadata ---

    # Price and currency from Lykdat search
    price_val: Optional[float] = None
    if prod.get("price") is not None:
        try:
            price_val = float(prod["price"])
        except (TypeError, ValueError):
            price_val = None

    currency: Optional[str] = prod.get("currency")

    # Optionally override price/currency from Gemini if present
    if tag_structured.get("price") is not None:
        try:
            price_val = float(tag_structured["price"])
        except (TypeError, ValueError):
            pass

    if tag_structured.get("currency"):
        currency = str(tag_structured["currency"])

    # Certifications: from deep tags + tag_meta
    certifications: List[str] = list(product_from_lykdat.certifications)
    for c in tag_meta.certifications:
        if c and c not in certifications:
            certifications.append(c)

    # Eco notes: combine image-based notes + size/care
    notes_parts: List[str] = []
    if product_from_lykdat.eco_notes:
        notes_parts.append(product_from_lykdat.eco_notes)
    if tag_meta.size:
        notes_parts.append(f"size: {tag_meta.size}")
    if tag_meta.care_instructions:
        notes_parts.append("care: " + "; ".join(tag_meta.care_instructions))

    eco_notes = "; ".join(notes_parts) if notes_parts else None

    # Brand and title / product_name
    brand_from_search = prod.get("brand_name")
    brand = tag_meta.brand or product_from_lykdat.brand or brand_from_search

    product_name = tag_meta.product_name or product_from_lykdat.product_name or prod.get("name")
    title = product_name or product_from_lykdat.title or prod.get("name") or "Clothing item"

    combined_product = ProductMetadata(
        url=product_url or product_from_lykdat.url,
        title=title,
        brand=brand,
        product_name=product_name,
        materials=tag_meta.materials or product_from_lykdat.materials,
        origin=tag_meta.origin or product_from_lykdat.origin,
        certifications=certifications,
        price=price_val,
        currency=currency,
        eco_notes=eco_notes,
    )

    # --- EcoScore for this similar product ---
    eco = compute_eco_score(
        product=combined_product,
        tag_structured=tag_structured,
        lykdat_raw=deep_tags.raw,
        gemini_api_key=gemini_api_key,
    )

    # Return object with SAME schema as your main combined object (+ eco_score)
    return {
        "clothing_image_path": image_url,   # for similar products, we use the product image URL
        "tag_image_path": None,             # we don't have a separate physical tag image
        "lykdat_deep_tag_raw": deep_tags.raw,
        "tag_ocr_text": page_text,          # here this is "product page text" instead of OCR
        "tag_structured": tag_structured,
        "tag_extra_fields": tag_meta.extra_fields,
        "combined_product_metadata": asdict(combined_product),
        "eco_score": asdict(eco),
    }


# ---------------------------------------------------------------------------
# Public API: similar products with same schema as main object
# ---------------------------------------------------------------------------

def find_similar_clothing_full_pipeline(
    clothing_image_path: str,
    max_results: int = 10,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    max_workers: Optional[int] = None,
) -> List[Dict[str, Any]]:
    """
    High-level pipeline:

    1. Use Lykdat Global Search with the main clothing image to find visually
       similar apparel items from popular online stores.
    2. Bias results toward US-like products (USD + US-ish domains).
    3. For each of the selected results (in parallel when possible):
         - Run Deep Tagging on the product image.
         - Fetch product page text and parse via Gemini into a tag-like schema.
         - Merge into a combined ProductMetadata.
         - Compute EcoScore.
         - Wrap everything into an object with the SAME schema as the main one.
    4. Return a list of these objects.
    """
    # 1) Lykdat global search
    search_data = global_search_image_file(
        image_path=clothing_image_path,
        api_key=lykdat_api_key,
    )

    flat_products = _flatten_global_results(search_data)

    # 2) Bias toward US-like products
    selected_products = select_us_biased_products(flat_products, max_results)

    if not selected_products:
        return []

    # 3) Decide how many threads to use
    if max_workers is None:
        # sensible default: up to 8 concurrent products, but not more than we have
        max_workers = min(8, len(selected_products))

    # If max_workers == 1, fall back to the old sequential path
    if max_workers <= 1:
        out: List[Dict[str, Any]] = []
        for prod in selected_products:
            try:
                item = _build_similar_product_object(
                    prod=prod,
                    lykdat_api_key=lykdat_api_key,
                    gemini_api_key=gemini_api_key,
                )
                out.append(item)
            except Exception as e:
                print(f"[warn] Failed to build similar product object: {e}", file=sys.stderr)
                continue
        return out

    # 4) Parallel worker
    def _worker(prod: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        try:
            return _build_similar_product_object(
                prod=prod,
                lykdat_api_key=lykdat_api_key,
                gemini_api_key=gemini_api_key,
            )
        except Exception as e:
            print(f"[warn] Failed to build similar product object: {e}", file=sys.stderr)
            return None

    # 5) Run the per-product pipeline in parallel, preserving order
    with concurrent.futures.ThreadPoolExecutor(max_workers=max_workers) as executor:
        results = list(executor.map(_worker, selected_products))

    # Filter out failures
    out: List[Dict[str, Any]] = [r for r in results if r is not None]
    return out

