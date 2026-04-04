from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")

    # Configuração de custos
    GEMINI_MODEL: str = "gemini-2.5-flash"  # Flash para volume
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-pro"  # Só quando necessário

    MAX_PRODUCTS_PER_BATCH: int = 50  # Para não estourar limites
    ENABLE_HUMAN_REVIEW: bool = True


settings = Settings()
