import asyncio
import os
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

import mimetypes
import requests

from analyze.helper import get_env
from analyze.base import ProductMetadata, EcoScore, ScoredProduct  # noqa: F401

# --- Lykdat Deep Tagging config ---

LYKDAT_TAGS_URL = "https://cloudapi.lykdat.com/v1/detection/tags"
LYKDAT_API_ENV = "LYKDAT_API_KEY"

# --- Gemini / Vision config ---

# Prefer explicit GEMINI_API_KEY, fall back to GOOGLE_API_KEY
GEMINI_API_ENV_PRIMARY = "GEMINI_API_KEY"
GOOGLE_OCR_KEY = "GOOGLE_OCR_KEY"

# We import these lazily so unit tests can stub them out if needed.
try:
    import google.generativeai as genai
except ImportError:  # pragma: no cover
    genai = None  # type: ignore

try:
    from google.cloud import vision
except ImportError:  # pragma: no cover
    vision = None  # type: ignore


# ---------------------------------------------------------------------------
# Lykdat deep tagging models / helpers
# ---------------------------------------------------------------------------


@dataclass
class DeepTagResult:
    """Thin wrapper around the Lykdat /detection/tags response.

    We only keep the useful parts for clothing metadata: colors, items, and labels.
    The raw response is still accessible via the `raw` field if you want to inspect
    or store it.
    """
    colors: List[Dict[str, Any]]
    items: List[Dict[str, Any]]
    labels: List[Dict[str, Any]]
    raw: Dict[str, Any]

    @classmethod
    def from_raw(cls, data: Dict[str, Any]) -> "DeepTagResult":
        payload = data.get("data") or data
        return cls(
            colors=payload.get("colors") or [],
            items=payload.get("items") or [],
            labels=payload.get("labels") or [],
            raw=payload,
        )


def _get_lykdat_api_key(explicit: Optional[str] = None) -> str:
    """Resolve the Lykdat API key.

    Order of precedence:
    1. Explicit api_key argument
    2. Environment variable LYKDAT_API_KEY (via get_env)
    """
    if explicit:
        return explicit
    return get_env(LYKDAT_API_ENV, required=True)


def _guess_mime_type(path: str) -> str:
    mime, _ = mimetypes.guess_type(path)
    return mime or "image/jpeg"


def deep_tag_image_file(
    image_path: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """Call Lykdat Deep Tagging with a local image file."""
    key = _get_lykdat_api_key(api_key)
    headers = {
        "x-api-key": key,
    }

    mime_type = _guess_mime_type(image_path)

    with open(image_path, "rb") as f:
        files = [
            ("image", (os.path.basename(image_path), f, mime_type)),
        ]
        resp = requests.post(
            LYKDAT_TAGS_URL,
            headers=headers,
            files=files,
            timeout=timeout,
        )

    if not resp.ok:
        raise RuntimeError(
            f"Lykdat deep tagging failed for file '{image_path}' "
            f"with status {resp.status_code}: {resp.text}"
        )

    try:
        data = resp.json()
    except Exception:
        raise RuntimeError(
            f"Failed to parse JSON from Lykdat response for file '{image_path}': {resp.text}"
        )

    return DeepTagResult.from_raw(data)


def deep_tag_image_url(
    image_url: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """Call Lykdat Deep Tagging with a public image URL."""
    key = _get_lykdat_api_key(api_key)
    headers = {
        "x-api-key": key,
    }
    payload = {
        "image_url": image_url,
    }

    resp = requests.post(
        LYKDAT_TAGS_URL,
        headers=headers,
        data=payload,
        timeout=timeout,
    )

    if not resp.ok:
        raise RuntimeError(
            f"Lykdat deep tagging failed for url '{image_url}' "
            f"with status {resp.status_code}: {resp.text}"
        )

    try:
        data = resp.json()
    except Exception:
        raise RuntimeError(
            f"Failed to parse JSON from Lykdat response for url '{image_url}': {resp.text}"
        )

    return DeepTagResult.from_raw(data)


async def async_deep_tag_image_file(
    image_path: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """Async wrapper for deep_tag_image_file using asyncio.to_thread."""
    return await asyncio.to_thread(
        deep_tag_image_file,
        image_path,
        api_key,
        timeout,
    )


async def async_deep_tag_image_url(
    image_url: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """Async wrapper for deep_tag_image_url using asyncio.to_thread."""
    return await asyncio.to_thread(
        deep_tag_image_url,
        image_url,
        api_key,
        timeout,
    )


def deep_tags_to_product_metadata(
    tags: DeepTagResult,
    source_url: str,
) -> ProductMetadata:
    """Convert DeepTagResult into a minimal ProductMetadata instance."""
    # Pick the highest confidence detected item as the main garment
    main_item: Optional[Dict[str, Any]] = None
    if tags.items:
        main_item = max(tags.items, key=lambda it: float(it.get("confidence", 0.0)))  # type: ignore[arg-type]

    # Build a human friendly title
    if main_item:
        title = main_item.get("name") or main_item.get("category") or "Clothing item"
        product_name = main_item.get("name") or None
    else:
        title = "Clothing item"
        product_name = None

    # Top colors by confidence
    color_names: List[str] = []
    if tags.colors:
        sorted_colors = sorted(
            tags.colors,
            key=lambda c: float(c.get("confidence", 0.0)),  # type: ignore[arg-type]
            reverse=True,
        )
        color_names = [c.get("name") for c in sorted_colors if c.get("name")]

    # Top labels by confidence
    label_names: List[str] = []
    if tags.labels:
        sorted_labels = sorted(
            tags.labels,
            key=lambda l: float(l.get("confidence", 0.0)),  # type: ignore[arg-type]
            reverse=True,
        )
        label_names = [l.get("name") for l in sorted_labels if l.get("name")]

    notes_parts: List[str] = []
    if color_names:
        notes_parts.append("colors: " + ", ".join(color_names))
    if main_item:
        notes_parts.append(
            "item: "
            + ", ".join(
                v for v in [main_item.get("name"), main_item.get("category")] if v
            )
        )
    if label_names:
        # Keep the top 10 labels for brevity
        notes_parts.append("labels: " + ", ".join(label_names[:10]))

    eco_notes = "; ".join(notes_parts) if notes_parts else None

    return ProductMetadata(
        url=source_url,
        title=title,
        brand=None,
        product_name=product_name,
        materials=None,
        origin=None,
        certifications=[],
        price=None,
        currency=None,
        eco_notes=eco_notes,
    )


def deep_tag_file_to_product_metadata(
    image_path: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> ProductMetadata:
    """Run deep tagging on a local file and map to ProductMetadata."""
    tags = deep_tag_image_file(image_path, api_key=api_key, timeout=timeout)
    source_url = f"file://{os.path.abspath(image_path)}"
    return deep_tags_to_product_metadata(tags, source_url=source_url)


def deep_tag_url_to_product_metadata(
    image_url: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> ProductMetadata:
    """Run deep tagging on an image URL and map to ProductMetadata."""
    tags = deep_tag_image_url(image_url, api_key=api_key, timeout=timeout)
    return deep_tags_to_product_metadata(tags, source_url=image_url)


# ---------------------------------------------------------------------------
# Tag image OCR (Google Cloud Vision) + Gemini structuring
# ---------------------------------------------------------------------------


@dataclass
class TagMetadata:
    """Structured metadata extracted from a clothing tag image."""
    brand: Optional[str]
    product_name: Optional[str]
    materials: Optional[str]
    origin: Optional[str]
    certifications: List[str]
    size: Optional[str]
    care_instructions: List[str]
    extra_fields: Dict[str, Any]
    raw_text: str
    raw_structured: Dict[str, Any]

    @classmethod
    def from_gemini_response(cls, text: str, data: Dict[str, Any]) -> "TagMetadata":
        # Defensive parsing; we tolerate partial responses
        brand = data.get("brand")
        product_name = data.get("product_name") or data.get("product")
        origin = data.get("made_in") or data.get("origin") or data.get("country_of_origin")
        size = data.get("size")
        certifications = data.get("certifications") or []
        if isinstance(certifications, str):
            certifications = [certifications]
        care = data.get("care_instructions") or []
        if isinstance(care, str):
            care = [care]

        # Materials may be given as a list; collapse to string for now.
        materials_str: Optional[str] = None
        if "material_composition" in data and isinstance(data["material_composition"], list):
            parts = []
            for m in data["material_composition"]:
                name = m.get("material") or m.get("name")
                pct = m.get("percentage")
                if name and pct is not None:
                    parts.append(f"{pct}% {name}")
                elif name:
                    parts.append(str(name))
            if parts:
                materials_str = ", ".join(parts)
        elif "materials" in data:
            if isinstance(data["materials"], str):
                materials_str = data["materials"]
            elif isinstance(data["materials"], list):
                materials_str = ", ".join(str(x) for x in data["materials"])

        extra_fields = {
            k: v
            for k, v in data.items()
            if k
            not in {
                "brand",
                "product_name",
                "product",
                "made_in",
                "origin",
                "country_of_origin",
                "size",
                "certifications",
                "care_instructions",
                "material_composition",
                "materials",
            }
        }

        return cls(
            brand=brand,
            product_name=product_name,
            materials=materials_str,
            origin=origin,
            certifications=[str(c) for c in certifications],
            size=size,
            care_instructions=[str(c) for c in care],
            extra_fields=extra_fields,
            raw_text=text,
            raw_structured=data,
        )


def _configure_gemini(explicit_key: Optional[str] = None) -> str:
    """Configure the Gemini client and return the API key used."""
    if genai is None:
        raise RuntimeError(
            "google.generativeai is not installed. Install via `pip install google-generativeai`."
        )

    key = explicit_key or os.getenv(GEMINI_API_ENV_PRIMARY)
    if not key:
        raise RuntimeError(
            f"Missing Gemini API key. Set {GEMINI_API_ENV_PRIMARY}"
        )

    genai.configure(api_key=key)
    return key


def ocr_tag_image_with_vision(
    image_path: str,
    timeout: float = 15.0,
) -> str:
    """Use Google Cloud Vision to OCR a clothing tag image and return the text."""
    if vision is None:
        raise RuntimeError(
            "google-cloud-vision is not installed. Install via `pip install google-cloud-vision` "
            "and ensure GOOGLE_APPLICATION_CREDENTIALS is set."
        )

    client = vision.ImageAnnotatorClient()
    with open(image_path, "rb") as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    # document_text_detection handles dense text better than simple text_detection
    response = client.document_text_detection(image=image, timeout=timeout)
    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotation = response.full_text_annotation
    text = annotation.text if annotation and annotation.text else ""
    return text.strip()


def gemini_parse_tag_text(
    tag_text: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-2.5-flash",  # or "gemini-2.5-pro"
) -> Dict[str, Any]:
    """Feed OCR'd tag text into Gemini and get a structured JSON response."""
    _configure_gemini(api_key)

    system_prompt = (
        "You are an assistant that parses the text printed on clothing care/brand tags.\n"
        "Your job is to extract as much structured metadata as possible.\n"
        "Return ONLY valid JSON, no extra commentary."
    )

    user_prompt = f"""
You are given the raw OCR text from a clothing tag:

\"\"\"{tag_text}\"\"\"

Extract all the metadata you can find and return strictly valid JSON
with this shape (include fields even if null):

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
  "other_text": string or null
}}

Do NOT wrap the JSON in backticks. Do NOT add explanations.
Only output the JSON object.
"""

    # ✅ attach system prompt here
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
    )

    # ✅ only user content, no "system" role
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
        raise RuntimeError(f"Gemini returned a non-object JSON: {data!r}")

    return data

def tag_image_to_tag_metadata(
    tag_image_path: str,
    gemini_api_key: Optional[str] = None,
    vision_timeout: float = 15.0,
) -> TagMetadata:
    """Pipeline: Vision OCR → Gemini structuring → TagMetadata."""
    ocr_text = ocr_tag_image_with_vision(tag_image_path, timeout=vision_timeout)
    structured = gemini_parse_tag_text(ocr_text, api_key=gemini_api_key)
    return TagMetadata.from_gemini_response(ocr_text, structured)


# ---------------------------------------------------------------------------
# Combine Lykdat deep tags + tag metadata into a single combined object
# ---------------------------------------------------------------------------


def combine_lykdat_and_tag_metadata(
    clothing_image_path: str,
    tag_image_path: str,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Run both:
    - Lykdat Deep Tagging on the clothing piece image
    - Vision OCR + Gemini parsing on the clothing tag image

    Return a single JSON-like dict combining:
      - raw Lykdat response
      - raw OCR text
      - structured tag JSON
      - a merged ProductMetadata view
    """
    # 1) Lykdat on main clothing image
    deep_tags = deep_tag_image_file(clothing_image_path, api_key=lykdat_api_key)
    product_from_lykdat = deep_tags_to_product_metadata(
        deep_tags,
        source_url=f"file://{os.path.abspath(clothing_image_path)}",
    )

    # 2) Tag OCR + Gemini
    tag_meta = tag_image_to_tag_metadata(tag_image_path, gemini_api_key=gemini_api_key)

    # 3) Merge into a single ProductMetadata
    certifications = list(product_from_lykdat.certifications)
    for c in tag_meta.certifications:
        if c and c not in certifications:
            certifications.append(c)

    notes_parts: List[str] = []
    if product_from_lykdat.eco_notes:
        notes_parts.append(product_from_lykdat.eco_notes)
    if tag_meta.size:
        notes_parts.append(f"size: {tag_meta.size}")
    if tag_meta.care_instructions:
        notes_parts.append("care: " + "; ".join(tag_meta.care_instructions))

    eco_notes = "; ".join(notes_parts) if notes_parts else None

    combined_product = ProductMetadata(
        url=product_from_lykdat.url,
        title=tag_meta.product_name or product_from_lykdat.title,
        brand=tag_meta.brand or product_from_lykdat.brand,
        product_name=tag_meta.product_name or product_from_lykdat.product_name,
        materials=tag_meta.materials or product_from_lykdat.materials,
        origin=tag_meta.origin or product_from_lykdat.origin,
        certifications=certifications,
        price=product_from_lykdat.price,
        currency=product_from_lykdat.currency,
        eco_notes=eco_notes,
    )

    # 4) Return a combined JSON-friendly dict
    return {
        "clothing_image_path": clothing_image_path,
        "tag_image_path": tag_image_path,
        "lykdat_deep_tag_raw": deep_tags.raw,
        "tag_ocr_text": tag_meta.raw_text,
        "tag_structured": tag_meta.raw_structured,
        "tag_extra_fields": tag_meta.extra_fields,
        "combined_product_metadata": asdict(combined_product),
    }
