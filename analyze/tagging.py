import asyncio
import os
import sys
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional

import mimetypes
import requests

from helper import get_env
from base import ProductMetadata, EcoScore, ScoredProduct  # noqa: F401
from ecoscore import compute_eco_score

# --- Lykdat Deep Tagging config ---

LYKDAT_TAGS_URL = "https://cloudapi.lykdat.com/v1/detection/tags"
LYKDAT_API_ENV = "LYKDAT_API_KEY"
USE_LYKDAT_TAGGING_ENV = "USE_LYKDAT_DEEP_TAGGING"  # "1"/"true" to prefer Lykdat, else Vision+Gemini

# --- Gemini / Vision config ---

# Prefer explicit GEMINI_API_KEY
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


# ---------------------------------------------------------------------------
# Vision+Gemini alternative deep tagging (same DeepTagResult shape)
# ---------------------------------------------------------------------------

def _rgb_to_hex_no_hash(color) -> str:
    """Convert a Vision Color object to a 6-char lowercase hex string, no leading '#'."""
    r = int(color.red or 0)
    g = int(color.green or 0)
    b = int(color.blue or 0)
    return f"{r:02x}{g:02x}{b:02x}"


def _vision_build_base_tags(
    label_resp,
    props_resp,
    max_labels: int = 20,
    max_colors: int = 5,
) -> DeepTagResult:
    """
    Build a DeepTagResult-like structure purely from Vision outputs:
      - colors: from image_properties.dominant_colors
      - items: heuristic clothing items from label_detection
      - labels: all Vision labels as generic 'vision_label'
    """
    colors: List[Dict[str, Any]] = []
    try:
        dom = getattr(props_resp, "image_properties_annotation", None)
        if dom and dom.dominant_colors and dom.dominant_colors.colors:
            for c in dom.dominant_colors.colors[:max_colors]:
                hex_code = _rgb_to_hex_no_hash(c.color)
                confidence = float(c.score or c.pixel_fraction or 0.0)
                colors.append(
                    {
                        "confidence": confidence,
                        "hex_code": hex_code,
                        "name": hex_code,  # we don't have a human color name here
                    }
                )
    except Exception as e:
        print(f"[warn] Vision image_properties parsing failed: {e}", file=sys.stderr)

    labels: List[Dict[str, Any]] = []
    items: List[Dict[str, Any]] = []

    clothing_keywords = [
        "shirt", "t-shirt", "tee", "top", "blouse", "dress", "skirt", "trousers",
        "pants", "jeans", "denim", "shorts", "jacket", "coat", "outerwear",
        "hoodie", "sweater", "jumper", "cardigan", "suit", "blazer", "overcoat",
        "pullover", "parka", "puffer", "vest",
    ]

    try:
        for lab in (getattr(label_resp, "label_annotations", None) or [])[:max_labels]:
            desc = lab.description or ""
            score = float(lab.score or 0.0)

            labels.append(
                {
                    "classification": "vision_label",
                    "confidence": score,
                    "name": desc,
                    "secondary_classification": None,
                }
            )

            desc_l = desc.lower()
            if any(kw in desc_l for kw in clothing_keywords):
                items.append(
                    {
                        "category": "clothing",
                        "confidence": score,
                        "name": desc_l,
                    }
                )
    except Exception as e:
        print(f"[warn] Vision label_detection parsing failed: {e}", file=sys.stderr)

    if not items and labels:
        best_label = max(labels, key=lambda l: float(l.get("confidence") or 0.0))
        items.append(
            {
                "category": "clothing",
                "confidence": float(best_label.get("confidence") or 0.0),
                "name": (best_label.get("name") or "clothing").lower(),
            }
        )

    raw_payload: Dict[str, Any] = {
        "colors": colors,
        "items": items,
        "labels": labels,
        "source": {
            "provider": "vision+gemini",
            "source_type": "vision_only_base",
        },
    }

    return DeepTagResult(
        colors=colors,
        items=items,
        labels=labels,
        raw=raw_payload,
    )


def _gemini_refine_vision_tags(
    base: DeepTagResult,
    api_key: Optional[str] = None,
    model_name: str = "gemini-flash-lite-latest",
) -> DeepTagResult:
    """
    Optional refinement step:
      - Send Vision labels + colors to Gemini
      - Ask it to propose more fashion-oriented items/labels
      - Merge those into the existing DeepTagResult

    If Gemini is unavailable or fails, returns `base` unchanged.
    """
    try:
        _configure_gemini(api_key)
    except Exception as e:
        print(f"[warn] _gemini_refine_vision_tags: Gemini not configured ({e}), using Vision-only tags.", file=sys.stderr)
        return base

    color_parts = [
        f"{c.get('name')} (hex {c.get('hex_code')}, conf {float(c.get('confidence') or 0.0):.2f})"
        for c in base.colors
    ]
    label_parts = [
        f"{l.get('name')} (conf {float(l.get('confidence') or 0.0):.2f})"
        for l in base.labels[:15]
    ]

    system_prompt = (
        "You are an assistant that normalizes clothing attributes.\n"
        "You receive generic computer-vision labels and simple color information\n"
        "for a fashion product image. Your job is to:\n"
        "- identify the most likely garment type (e.g., 'leather jacket', 'jeans'),\n"
        "- propose 3–10 descriptive labels like silhouette, length, neckline,\n"
        "  pattern, garment parts, etc.\n"
        "You MUST return ONLY valid JSON with items[] and labels[] in a specific schema."
    )

    user_prompt = f"""
Here are the generic labels from a vision model:

- Labels: {label_parts or ['(none)']}
- Colors: {color_parts or ['(none)']}

Return strictly valid JSON of the form:

{{
  "items": [
    {{
      "name": string,
      "category": "clothing",
      "confidence": number
    }}
  ],
  "labels": [
    {{
      "classification": string,              // e.g. "silhouette", "length", "apparel",
                                             // "garment parts", "pattern", or "other"
      "name": string,
      "confidence": number,
      "secondary_classification": string or null
    }}
  ]
}}

- items[] should list 1–3 likely garment types (e.g. "leather jacket", "denim jeans").
- labels[] should list 3–10 key attributes you infer from the labels/colors.
- If unsure, you may leave arrays empty but must still return the JSON shape.
Do NOT wrap the JSON in backticks. Do NOT add commentary.
"""

    try:
        model = genai.GenerativeModel(
            model_name,
            system_instruction=system_prompt,
        )
        response = model.generate_content(
            [{"role": "user", "parts": [user_prompt]}]
        )
        raw_text = (response.text or "").strip()

        import json

        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError:
            start = raw_text.find("{")
            end = raw_text.rfind("}")
            if start != -1 and end != -1 and end > start:
                data = json.loads(raw_text[start : end + 1])
            else:
                raise RuntimeError(f"Gemini refine returned non-JSON content: {raw_text}")

        if not isinstance(data, dict):
            raise RuntimeError(f"Gemini refine returned non-object JSON: {data!r}")

        new_items: List[Dict[str, Any]] = list(base.items)
        for it in data.get("items") or []:
            try:
                name = str(it.get("name") or "").strip()
                if not name:
                    continue
                conf = float(it.get("confidence") or 0.0)
                new_items.append(
                    {
                        "category": "clothing",
                        "confidence": conf,
                        "name": name.lower(),
                    }
                )
            except Exception:
                continue

        new_labels: List[Dict[str, Any]] = list(base.labels)
        for lbl in data.get("labels") or []:
            try:
                name = str(lbl.get("name") or "").strip()
                if not name:
                    continue
                conf = float(lbl.get("confidence") or 0.0)
                classification = lbl.get("classification") or "other"
                secondary = lbl.get("secondary_classification")
                new_labels.append(
                    {
                        "classification": classification,
                        "confidence": conf,
                        "name": name,
                        "secondary_classification": secondary,
                    }
                )
            except Exception:
                continue

        raw_payload = dict(base.raw)
        src = dict(raw_payload.get("source") or {})
        src["gemini_used"] = True
        raw_payload["source"] = src

        return DeepTagResult(
            colors=base.colors,
            items=new_items,
            labels=new_labels,
            raw=raw_payload,
        )

    except Exception as e:
        print(f"[warn] _gemini_refine_vision_tags failed: {e}", file=sys.stderr)
        return base


def vision_gemini_deep_tag_image_file(
    image_path: str,
    gemini_api_key: Optional[str] = None,
    max_labels: int = 20,
    max_colors: int = 5,
    timeout: float = 15.0,
) -> DeepTagResult:
    """
    Alternative to Lykdat deep_tag_image_file.

    Uses Google Cloud Vision (label_detection + image_properties) and optionally
    Gemini refinement, and returns a DeepTagResult with the same structure
    (colors/items/labels/raw).
    """
    if vision is None:
        raise RuntimeError(
            "google-cloud-vision is not installed. "
            "Install via `pip install google-cloud-vision` and configure credentials."
        )

    client = vision.ImageAnnotatorClient()
    with open(image_path, "rb") as image_file:
        content = image_file.read()
    image = vision.Image(content=content)

    label_resp = client.label_detection(image=image, timeout=timeout)
    props_resp = client.image_properties(image=image, timeout=timeout)

    base_tags = _vision_build_base_tags(
        label_resp=label_resp,
        props_resp=props_resp,
        max_labels=max_labels,
        max_colors=max_colors,
    )

    refined = _gemini_refine_vision_tags(
        base_tags,
        api_key=gemini_api_key,
    )

    raw_payload = dict(refined.raw)
    src = dict(raw_payload.get("source") or {})
    src["image_path"] = os.path.abspath(image_path)
    raw_payload["source"] = src

    return DeepTagResult(
        colors=refined.colors,
        items=refined.items,
        labels=refined.labels,
        raw=raw_payload,
    )


def vision_gemini_deep_tag_image_url(
    image_url: str,
    gemini_api_key: Optional[str] = None,
    max_labels: int = 20,
    max_colors: int = 5,
    timeout: float = 15.0,
) -> DeepTagResult:
    """
    URL variant of the Vision+Gemini deep tagging.

    Matches deep_tag_image_url's return type (DeepTagResult).
    """
    if vision is None:
        raise RuntimeError(
            "google-cloud-vision is not installed. "
            "Install via `pip install google-cloud-vision` and configure credentials."
        )

    client = vision.ImageAnnotatorClient()
    image = vision.Image()
    image.source.image_uri = image_url

    label_resp = client.label_detection(image=image, timeout=timeout)
    props_resp = client.image_properties(image=image, timeout=timeout)

    base_tags = _vision_build_base_tags(
        label_resp=label_resp,
        props_resp=props_resp,
        max_labels=max_labels,
        max_colors=max_colors,
    )

    refined = _gemini_refine_vision_tags(
        base_tags,
        api_key=gemini_api_key,
    )

    raw_payload = dict(refined.raw)
    src = dict(raw_payload.get("source") or {})
    src["image_url"] = image_url
    raw_payload["source"] = src

    return DeepTagResult(
        colors=refined.colors,
        items=refined.items,
        labels=refined.labels,
        raw=raw_payload,
    )


def _should_use_lykdat_tagging() -> bool:
    """Read USE_LYKDAT_DEEP_TAGGING env to decide whether to prefer Lykdat."""
    val = os.getenv(USE_LYKDAT_TAGGING_ENV, "1").strip().lower()
    return val in ("1", "true", "yes", "y")


def smart_deep_tag_image_file(
    image_path: str,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """
    Wrapper that:
      - uses Lykdat deep tagging if enabled, and
      - falls back to Vision+Gemini if Lykdat fails (e.g., quota 403),
      - or uses Vision+Gemini directly if USE_LYKDAT_DEEP_TAGGING=0.
    """
    if _should_use_lykdat_tagging():
        try:
            return deep_tag_image_file(image_path, api_key=lykdat_api_key, timeout=timeout)
        except RuntimeError as e:
            msg = str(e)
            if ("image deep tagging limit reached" in msg) or ("status 403" in msg):
                print(f"[warn] Lykdat deep tagging unavailable, falling back to Vision+Gemini: {e}", file=sys.stderr)
                return vision_gemini_deep_tag_image_file(image_path, gemini_api_key=gemini_api_key, timeout=timeout)
            raise
    else:
        return vision_gemini_deep_tag_image_file(image_path, gemini_api_key=gemini_api_key, timeout=timeout)


def smart_deep_tag_image_url(
    image_url: str,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
    timeout: float = 15.0,
) -> DeepTagResult:
    """
    Wrapper for URL-based deep tagging with the same fallback logic as above.
    """
    if _should_use_lykdat_tagging():
        try:
            return deep_tag_image_url(image_url, api_key=lykdat_api_key, timeout=timeout)
        except RuntimeError as e:
            msg = str(e)
            if ("image deep tagging limit reached" in msg) or ("status 403" in msg):
                print(f"[warn] Lykdat deep tagging unavailable (URL), falling back to Vision+Gemini: {e}", file=sys.stderr)
                return vision_gemini_deep_tag_image_url(image_url, gemini_api_key=gemini_api_key, timeout=timeout)
            raise
    else:
        return vision_gemini_deep_tag_image_url(image_url, gemini_api_key=gemini_api_key, timeout=timeout)


# ---------------------------------------------------------------------------
# Convert DeepTagResult → ProductMetadata
# ---------------------------------------------------------------------------


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
    gemini_api_key: Optional[str] = None,
) -> ProductMetadata:
    """Run deep tagging on a local file (Lykdat or Vision+Gemini) and map to ProductMetadata."""
    tags = smart_deep_tag_image_file(
        image_path,
        lykdat_api_key=api_key,
        gemini_api_key=gemini_api_key,
        timeout=timeout,
    )
    source_url = f"file://{os.path.abspath(image_path)}"
    return deep_tags_to_product_metadata(tags, source_url=source_url)


def deep_tag_url_to_product_metadata(
    image_url: str,
    api_key: Optional[str] = None,
    timeout: float = 15.0,
    gemini_api_key: Optional[str] = None,
) -> ProductMetadata:
    """Run deep tagging on an image URL (Lykdat or Vision+Gemini) and map to ProductMetadata."""
    tags = smart_deep_tag_image_url(
        image_url,
        lykdat_api_key=api_key,
        gemini_api_key=gemini_api_key,
        timeout=timeout,
    )
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

    response = client.document_text_detection(image=image, timeout=timeout)
    if response.error.message:
        raise RuntimeError(f"Vision API error: {response.error.message}")

    annotation = response.full_text_annotation
    text = annotation.text if annotation and annotation.text else ""
    return text.strip()


def gemini_parse_tag_text(
    tag_text: str,
    api_key: Optional[str] = None,
    model_name: str = "gemini-flash-lite-latest",  # lightweight model
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
    print("\n" + "=" * 80)
    print("🔵 GEMINI INPUT - Tag Text Parsing")
    print("=" * 80)
    print(f"Model: {model_name}")
    print(f"\nSystem Prompt:\n{system_prompt}")
    print(f"\nUser Prompt:\n{user_prompt}")
    print("=" * 80 + "\n")
    model = genai.GenerativeModel(
        model_name,
        system_instruction=system_prompt,
    )

    import json

    # Basic retry wrapper in case Gemini glitches
    last_err: Optional[Exception] = None
    for _ in range(2):
        try:
            response = model.generate_content(
                [{"role": "user", "parts": [user_prompt]}]
            )
            raw_text = response.text or ""

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
        except Exception as e:
            last_err = e
            continue

    print(f"[warn] gemini_parse_tag_text failed after retries: {last_err}", file=sys.stderr)
    # Return empty-but-valid schema so rest of pipeline continues
    return {
        "brand": None,
        "product_name": None,
        "size": None,
        "material_composition": [],
        "materials": None,
        "made_in": None,
        "country_of_origin": None,
        "origin": None,
        "certifications": [],
        "care_instructions": [],
        "symbols": [],
        "other_text": tag_text or None,
    }


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
# Combine deep tags (Lykdat or Vision+Gemini) + tag metadata into a single object
# + EcoScore
# ---------------------------------------------------------------------------


def combine_lykdat_and_tag_metadata(
    clothing_image_path: str,
    tag_image_path: str,
    lykdat_api_key: Optional[str] = None,
    gemini_api_key: Optional[str] = None,
) -> Dict[str, Any]:
    """Run both:
    - Deep Tagging on the clothing piece image (Lykdat or Vision+Gemini)
    - Vision OCR + Gemini parsing on the clothing tag image

    Return a single JSON-like dict combining:
      - raw deep tagging response
      - raw OCR text
      - structured tag JSON
      - a merged ProductMetadata view
      - an EcoScore object (grade + explanation)
    """
    # 1) Deep tagging on main clothing image (with fallback)
    deep_tags = smart_deep_tag_image_file(
        clothing_image_path,
        lykdat_api_key=lykdat_api_key,
        gemini_api_key=gemini_api_key,
    )
    product_from_tags = deep_tags_to_product_metadata(
        deep_tags,
        source_url=f"file://{os.path.abspath(clothing_image_path)}",
    )

    # 2) Tag OCR + Gemini
    tag_meta = tag_image_to_tag_metadata(tag_image_path, gemini_api_key=gemini_api_key)

    # 3) Merge into a single ProductMetadata
    certifications = list(product_from_tags.certifications)
    for c in tag_meta.certifications:
        if c and c not in certifications:
            certifications.append(c)

    notes_parts: List[str] = []
    if product_from_tags.eco_notes:
        notes_parts.append(product_from_tags.eco_notes)
    if tag_meta.size:
        notes_parts.append(f"size: {tag_meta.size}")
    if tag_meta.care_instructions:
        notes_parts.append("care: " + "; ".join(tag_meta.care_instructions))

    eco_notes = "; ".join(notes_parts) if notes_parts else None

    combined_product = ProductMetadata(
        url=product_from_tags.url,
        title=tag_meta.product_name or product_from_tags.title,
        brand=tag_meta.brand or product_from_tags.brand,
        product_name=tag_meta.product_name or product_from_tags.product_name,
        materials=tag_meta.materials or product_from_tags.materials,
        origin=tag_meta.origin or product_from_tags.origin,
        certifications=certifications,
        price=product_from_tags.price,
        currency=product_from_tags.currency,
        eco_notes=eco_notes,
    )

    # 4) EcoScore for the main item
    eco = compute_eco_score(
        product=combined_product,
        tag_structured=tag_meta.raw_structured,
        lykdat_raw=deep_tags.raw,
        gemini_api_key=gemini_api_key,
    )

    # 5) Return a combined JSON-friendly dict
    return {
        "clothing_image_path": clothing_image_path,
        "tag_image_path": tag_image_path,
        "lykdat_deep_tag_raw": deep_tags.raw,
        "tag_ocr_text": tag_meta.raw_text,
        "tag_structured": tag_meta.raw_structured,
        "tag_extra_fields": tag_meta.extra_fields,
        "combined_product_metadata": asdict(combined_product),
        "eco_score": asdict(eco),
    }
