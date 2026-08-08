import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from a .env file
load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

# File paths
CURRICULUM_PATH = os.getenv("CURRICULUM_PATH", str(BASE_DIR / "curriculum.json"))
CANDIDATES_PATH = os.getenv("CANDIDATES_PATH", str(BASE_DIR / "candidates.json"))

# API Keys
BREETH_API_KEY = os.getenv("BREETH_API_KEY", "")
BREETH_API_URL = os.getenv("BREETH_API_URL", "https://api.thebreeth.com")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# LLM Selection
# If GEMINI_API_KEY is present, default to gemini-2.5-flash
# If ANTHROPIC_API_KEY is present, default to claude-3-5-sonnet-20241022
if GEMINI_API_KEY:
    DEFAULT_MODEL = "gemini-2.5-flash"
elif ANTHROPIC_API_KEY:
    DEFAULT_MODEL = "claude-3-5-sonnet-20241022"
else:
    DEFAULT_MODEL = "gemini-2.5-flash"  # Fallback

MODEL_NAME = os.getenv("MODEL_NAME", DEFAULT_MODEL)

# Interview flow settings
MIN_QUESTIONS = int(os.getenv("MIN_QUESTIONS", "8"))
MIN_DAYS_COVERED = int(os.getenv("MIN_DAYS_COVERED", "4"))
