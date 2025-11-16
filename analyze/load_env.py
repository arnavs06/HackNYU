"""Load environment variables from .env file for the analyze module."""
import os
from pathlib import Path
from dotenv import load_dotenv

# Get the analyze directory path
ANALYZE_DIR = Path(__file__).parent.absolute()

# Load .env file from analyze directory
env_path = ANALYZE_DIR / '.env'
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
    print(f"✓ Loaded environment variables from {env_path}")
else:
    print(f"⚠ Warning: .env file not found at {env_path}")
    print(f"  Copy .env.example to .env and add your API keys")
