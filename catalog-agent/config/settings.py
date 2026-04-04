from pydantic import BaseModel
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseModel):
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY")
    MONGODB_URI: str = os.getenv("MONGODB_URI")
    SUPABASE_URL: str = os.getenv("SUPABASE_URL")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY")
    # Fila de revisão do agente (não usar a coleção `products` do Prisma: schema diferente).
    MONGODB_CATALOG_QUEUE_COLLECTION: str = os.getenv(
        "MONGODB_CATALOG_QUEUE_COLLECTION", "catalog_agent_pending_review"
    )
    MONGODB_DB_NAME: str | None = os.getenv("MONGODB_DB_NAME") or None

    # Configuração de custos
    GEMINI_MODEL: str = "gemini-2.5-flash"  # Flash para volume
    GEMINI_FALLBACK_MODEL: str = "gemini-2.5-pro"  # Só quando necessário

    MAX_PRODUCTS_PER_BATCH: int = 50  # Para não estourar limites
    ENABLE_HUMAN_REVIEW: bool = True


settings = Settings()
