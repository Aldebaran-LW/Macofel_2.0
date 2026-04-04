from datetime import datetime, timezone

from bson import ObjectId
from bson.errors import InvalidId
from motor.motor_asyncio import AsyncIOMotorClient

from config.settings import settings

_client = AsyncIOMotorClient(settings.MONGODB_URI)
if settings.MONGODB_DB_NAME:
    db = _client[settings.MONGODB_DB_NAME]
else:
    db = _client.get_default_database()

_queue = db[settings.MONGODB_CATALOG_QUEUE_COLLECTION]


def _parse_object_id(product_id: str) -> ObjectId:
    try:
        return ObjectId(product_id)
    except InvalidId as e:
        raise ValueError(f"_id inválido: {product_id!r}") from e


async def save_products_for_review(products: list) -> int:
    """Salva documentos na fila de revisão com status pending_review."""
    if not products:
        return 0
    now = datetime.now(timezone.utc)
    result = await _queue.insert_many(
        [
            {
                **product,
                "status": "pending_review",
                "created_at": now,
                "reviewed_at": None,
                "review_status": "pending",
                "review_notes": None,
            }
            for product in products
        ]
    )
    return len(result.inserted_ids)


async def get_pending_review_products(limit: int = 50) -> list:
    """Lista itens pendentes de revisão humana."""
    cursor = _queue.find({"status": "pending_review"}).limit(limit)
    return await cursor.to_list(length=limit)


async def approve_product(product_id: str, notes: str = "") -> bool:
    """Marca item como aprovado na fila (não publica sozinho no catálogo Prisma)."""
    oid = _parse_object_id(product_id)
    now = datetime.now(timezone.utc)
    result = await _queue.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "active",
                "reviewed_at": now,
                "review_status": "approved",
                "review_notes": notes or None,
            }
        },
    )
    return result.modified_count > 0


async def reject_product(product_id: str, notes: str) -> bool:
    """Rejeita item na fila."""
    oid = _parse_object_id(product_id)
    now = datetime.now(timezone.utc)
    result = await _queue.update_one(
        {"_id": oid},
        {
            "$set": {
                "status": "rejected",
                "reviewed_at": now,
                "review_status": "rejected",
                "review_notes": notes,
            }
        },
    )
    return result.modified_count > 0
