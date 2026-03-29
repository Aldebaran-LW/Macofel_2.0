"""
Serviço de importação de catálogo para deploy na Render (FastAPI + MongoDB).
Alinhado ao schema Prisma Mongo do Macofel (collections categories / products).

Env:
  MONGODB_URI — obrigatório
  RENDER_CATALOG_IMPORT_SECRET ou IMPORT_SERVICE_SECRET — Bearer token (igual ao Next)
  CORS_ORIGINS — opcional, lista separada por vírgula (ex.: https://loja.exemplo.com)
  GEMINI_API_KEY ou GOOGLE_API_KEY — opcional; com enrich_ai=true melhora nome/descrição (Gemini)
"""
from __future__ import annotations

import io
import os
import re
from datetime import datetime, timezone
from typing import Any

import pandas as pd
from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from pymongo.database import Database

from gemini_enrich import enrich_catalog_rows, gemini_configured
from relatorio_xlsx import import_row_slug, parse_relatorio_sheet, slugify_product_key

app = FastAPI(title="Macofel catalog import", version="1.0.0")

_mongo_client: MongoClient | None = None


def _cors_origins() -> list[str]:
    raw = os.environ.get("CORS_ORIGINS", "").strip()
    if not raw:
        return []
    return [o.strip() for o in raw.split(",") if o.strip()]


_origins = _cors_origins()
if _origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


def get_secret() -> str:
    s = (
        os.environ.get("RENDER_CATALOG_IMPORT_SECRET")
        or os.environ.get("IMPORT_SERVICE_SECRET")
        or ""
    ).strip()
    if not s:
        raise HTTPException(500, "RENDER_CATALOG_IMPORT_SECRET não configurado")
    return s


def verify_bearer(authorization: str | None = Header(None)) -> None:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Authorization Bearer obrigatório")
    token = authorization[7:].strip()
    if token != get_secret():
        raise HTTPException(401, "Token inválido")


def get_db() -> Database:
    global _mongo_client
    uri = os.environ.get("MONGODB_URI", "").strip()
    if not uri:
        raise HTTPException(500, "MONGODB_URI não configurado")
    if _mongo_client is None:
        _mongo_client = MongoClient(uri, serverSelectionTimeoutMS=8000)
    name = os.environ.get("MONGODB_DB_NAME", "").strip()
    if name:
        return _mongo_client[name]
    return _mongo_client.get_database()


def parse_excel_bytes(content: bytes) -> tuple[list[dict[str, Any]], list[str]]:
    out: list[dict[str, Any]] = []
    warnings: list[str] = []
    xl = pd.ExcelFile(io.BytesIO(content))
    for sheet in xl.sheet_names:
        df = pd.read_excel(xl, sheet_name=sheet, header=None, dtype=object)
        matrix = df.fillna("").values.tolist()
        part, w = parse_relatorio_sheet(sheet, matrix)
        out.extend(part)
        warnings.extend(w)
    return out, warnings


def unique_category_slug(db: Database, base: str) -> str:
    s = (slugify_product_key(base)[:80] or "categoria")[:80]
    coll = db["categories"]
    i = 0
    cand = s
    while True:
        if not coll.find_one({"slug": cand}):
            return cand
        i += 1
        cand = f"{s}-{i}"[:80]


def unique_product_slug(db: Database, base: str) -> str:
    s = base[:120]
    coll = db["products"]
    i = 0
    cand = s
    while True:
        if not coll.find_one({"slug": cand}):
            return cand
        i += 1
        cand = f"{base}-{i}"[:120]


def resolve_category_id(
    db: Database, grupo: str, cache: dict[str, ObjectId], existing: list[dict[str, Any]]
) -> ObjectId:
    g = (grupo or "").strip() or "Sem grupo"
    key = g.lower()
    if key in cache:
        return cache[key]

    for c in existing:
        if str(c.get("name", "")).strip().lower() == key:
            oid = c["_id"]
            cache[key] = oid
            return oid

    slug = unique_category_slug(db, g)
    now = datetime.now(timezone.utc)
    doc = {
        "name": g,
        "slug": slug,
        "description": "Categoria criada na importação do catálogo (serviço dedicado).",
        "createdAt": now,
        "updatedAt": now,
    }
    res = db["categories"].insert_one(doc)
    oid = res.inserted_id
    existing.append({"_id": oid, "name": g})
    cache[key] = oid
    return oid


def run_import(db: Database, rows: list[dict[str, Any]], upsert: bool) -> dict[str, Any]:
    cat_cache: dict[str, ObjectId] = {}
    existing_cats = list(db["categories"].find({}, {"name": 1}))
    for c in existing_cats:
        c["_id"] = c["_id"]

    created = updated = skipped = 0
    errors: list[dict[str, str]] = []

    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        code = str(row.get("code") or "").strip()
        base_slug = import_row_slug(code, name)
        try:
            cat_id = resolve_category_id(
                db, str(row.get("grupo") or ""), cat_cache, existing_cats
            )
            price = float(row.get("price") or 0)
            stock = int(row.get("stock") or 0)
            description = str(row.get("description") or "Importado.")

            existing = db["products"].find_one({"slug": base_slug})

            if existing:
                if not upsert:
                    skipped += 1
                    continue
                db["products"].update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "name": name,
                            "description": description,
                            "price": price,
                            "stock": stock,
                            "categoryId": cat_id,
                            "updatedAt": datetime.now(timezone.utc),
                        }
                    },
                )
                updated += 1
                continue

            new_slug = unique_product_slug(db, base_slug)
            now = datetime.now(timezone.utc)
            db["products"].insert_one(
                {
                    "name": name,
                    "slug": new_slug,
                    "description": description,
                    "price": price,
                    "stock": stock,
                    "minStock": 0,
                    "weight": None,
                    "dimensionsCm": None,
                    "imageUrl": None,
                    "imageUrls": [],
                    "categoryId": cat_id,
                    "featured": False,
                    "createdAt": now,
                    "updatedAt": now,
                }
            )
            created += 1
        except Exception as e:  # noqa: BLE001 — importação resiliente por linha
            errors.append({"name": name, "message": str(e)})

    return {
        "source": "xls",
        "created": created,
        "updated": updated,
        "skipped": skipped,
        "errors": errors,
        "totalParsed": len(rows),
    }


@app.get("/")
def health():
    return {
        "ok": True,
        "service": "macofel-catalog-import",
        "geminiEnrich": gemini_configured(),
    }


@app.post("/import/catalog")
async def import_catalog(
    _auth: None = Depends(verify_bearer),
    file: UploadFile = File(...),
    upsert: str = Form("true"),
    enrich_ai: str = Form("false"),
):
    fname = (file.filename or "").lower()
    if not re.search(r"\.(xlsx|xls)$", fname):
        raise HTTPException(
            415,
            "Formato não suportado neste serviço. Use .xlsx ou .xls (relatório tipo Macofel). "
            "Para PDF, use a importação local no painel.",
        )

    content = await file.read()
    if len(content) > 100 * 1024 * 1024:
        raise HTTPException(413, "Ficheiro acima de 100 MB")

    try:
        rows, warnings = parse_excel_bytes(content)
    except Exception as e:  # noqa: BLE001
        raise HTTPException(400, f"Erro ao ler Excel: {e}") from e

    want_ai = enrich_ai.lower() in ("1", "true", "yes", "on")
    if want_ai:
        if gemini_configured():
            rows, ai_warnings = enrich_catalog_rows(rows)
            warnings.extend(ai_warnings)
        else:
            warnings.append(
                "Enriquecimento IA pedido mas GEMINI_API_KEY ou GOOGLE_API_KEY não está definida no servidor."
            )

    if not rows:
        return {
            "source": "xls",
            "created": 0,
            "updated": 0,
            "skipped": 0,
            "errors": [],
            "warnings": warnings or ["Nenhuma linha reconhecida."],
            "totalParsed": 0,
        }

    db = get_db()
    do_upsert = upsert.lower() in ("1", "true", "yes", "on")
    result = run_import(db, rows, do_upsert)
    result["warnings"] = warnings
    return result
