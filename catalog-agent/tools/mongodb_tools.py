from datetime import datetime

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

from config.settings import settings

client = AsyncIOMotorClient(settings.MONGODB_URI)
db = client.get_default_database()


async def save_products_for_review(products: list):
    """Salva produtos enriquecidos como pending_review"""
    to_insert = []
    for p in products:
        p["_id"] = ObjectId()
        p["status"] = "pending_review"
        p["created_at"] = datetime.utcnow()
        p["reviewed_at"] = None
        p["review_status"] = "pending"
        p["review_notes"] = None
        to_insert.append(p)

    result = await db.products.insert_many(to_insert)
    return len(result.inserted_ids)


async def get_pending_review_products(limit=100):
    cursor = db.products.find({"status": "pending_review"}).limit(limit)
    return await cursor.to_list(length=limit)


async def approve_product(product_id: str, notes: str = ""):
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$set": {
                "status": "active",
                "reviewed_at": datetime.utcnow(),
                "review_status": "approved",
                "review_notes": notes,
            }
        },
    )
    return result.modified_count > 0


async def reject_product(product_id: str, notes: str):
    result = await db.products.update_one(
        {"_id": ObjectId(product_id)},
        {
            "$set": {
                "status": "rejected",
                "reviewed_at": datetime.utcnow(),
                "review_status": "rejected",
                "review_notes": notes,
            }
        },
    )
    return result.modified_count > 0
