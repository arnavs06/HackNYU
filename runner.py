import json
import argparse

from analyze.tagging import combine_lykdat_and_tag_metadata
from analyze.similar_search import find_similar_clothing_with_metadata


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Run Lykdat deep tagging + tag OCR+Gemini on a clothing item, "
            "and find similar products via Lykdat Global Search. "
            "Outputs a single JSON object combining everything."
        )
    )
    parser.add_argument(
        "--clothing_image",
        required=True,
        help="Path to the main clothing piece image (used for Lykdat deep tagging + similar search).",
    )
    parser.add_argument(
        "--tag_image",
        required=True,
        help="Path to the clothing tag / care label image (used for Vision OCR + Gemini).",
    )
    parser.add_argument(
        "--lykdat_api_key",
        required=False,
        help="Optional Lykdat API key (otherwise LYKDAT_API_KEY env var is used).",
    )
    parser.add_argument(
        "--gemini_api_key",
        required=False,
        help="Optional Gemini API key (otherwise GEMINI_API_KEY env var is used).",
    )
    parser.add_argument(
        "--max_similar",
        type=int,
        default=10,
        help="Maximum number of similar clothing items to return (default: 10).",
    )

    args = parser.parse_args()

    # 1) Base item: clothing image + tag image combined metadata
    combined = combine_lykdat_and_tag_metadata(
        clothing_image_path=args.clothing_image,
        tag_image_path=args.tag_image,
        lykdat_api_key=args.lykdat_api_key,
        gemini_api_key=args.gemini_api_key,
    )

    # 2) Similar items: from Lykdat Global Search + optional Gemini enrichment
    similar_products = find_similar_clothing_with_metadata(
        clothing_image_path=args.clothing_image,
        max_results=args.max_similar,
        lykdat_api_key=args.lykdat_api_key,
        gemini_api_key=args.gemini_api_key,
    )

    # 3) Single JSON object with everything
    output = {
        **combined,  # clothing + tag metadata
        "similar_products": similar_products,  # list of 10 ProductMetadata dicts
    }

    print(json.dumps(output, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
