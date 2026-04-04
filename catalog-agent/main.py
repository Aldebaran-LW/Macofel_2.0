import asyncio
import json
import sys
from pathlib import Path

from dotenv import load_dotenv

from config.settings import settings
from graphs.catalog_pipeline import catalog_pipeline
from tools.mongodb_tools import save_products_for_review

load_dotenv()


async def run_catalog_import(file_path: str) -> int:
    path = Path(file_path)
    with open(path, "r", encoding="utf-8") as f:
        raw_products = json.load(f)

    if not isinstance(raw_products, list):
        raw_products = [raw_products]

    max_batch = max(1, settings.MAX_PRODUCTS_PER_BATCH)
    to_process = raw_products[:max_batch]
    if len(raw_products) > max_batch:
        print(
            f"Aviso: limitando a {max_batch} produtos (MAX_PRODUCTS_PER_BATCH). "
            f"Total no arquivo: {len(raw_products)}."
        )

    print(f"Iniciando processamento de {len(to_process)} produtos...")

    processed_products: list = []
    for raw in to_process:
        result = await catalog_pipeline.ainvoke(
            {
                "raw_product": raw,
                "enriched_product": None,
                "status": "pending",
            }
        )
        ep = result.get("enriched_product")
        if ep:
            processed_products.append(ep)

    saved_count = await save_products_for_review(processed_products)

    print(f"Concluído. {saved_count} produtos salvos como 'pending_review'.")
    print("  → Aprovação humana: criar/usar fluxo no admin (ex.: /admin/master/).")

    return saved_count


if __name__ == "__main__":
    default_json = Path(__file__).resolve().parent / "data" / "import_products.json"
    path_arg = sys.argv[1] if len(sys.argv) > 1 else str(default_json)
    asyncio.run(run_catalog_import(path_arg))
