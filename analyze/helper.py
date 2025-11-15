import os
import sys

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