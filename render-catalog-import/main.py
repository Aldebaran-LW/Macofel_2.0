"""
Macofel Catalog Agent — serviço FastAPI na Render (catálogo + MongoDB).

Pipeline POST /api/import (chamado pelo Next após upload no Vercel Blob):
  1. Baixar o ficheiro com httpx (header Authorization Bearer se `blobReadToken` no JSON).
  2. Parse Excel (.xls/.xlsx) ou PDF LW via `parse_excel_bytes` / `relatorio_pdf.parse_relatorio_produtos_pdf_bytes`.
  3. Limitar linhas com env MAX_CATALOG_BATCH (1–100, default 50).
  4. Enriquecimento Gemini opcional (`importType` full-catalog + chave API).
  5. Inserir documentos em `products` com `status: pending_review`.

Env:
  MONGODB_URI — obrigatório
  RENDER_CATALOG_IMPORT_SECRET ou IMPORT_SERVICE_SECRET — Bearer no POST /import/catalog (multipart)
  RENDER_CATALOG_WEBHOOK_SECRET — opcional; se definido, POST /api/import exige header X-Catalog-Webhook-Secret
  CORS_ORIGINS — opcional, lista separada por vírgula (ex.: https://loja.exemplo.com)
  GEMINI_API_KEY ou GOOGLE_API_KEY — opcional; enriquecimento no fluxo /api/import quando configurado
  MAX_CATALOG_BATCH — opcional (1–100, default 50) para limitar linhas em /api/import
"""
from __future__ import annotations

import asyncio
import io
import math
import os
import re
import uuid
from datetime import datetime, timezone
from typing import Any

import httpx
import pandas as pd
from bson import ObjectId
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, field_validator
from pymongo import MongoClient
from pymongo.database import Database

from gemini_enrich import enrich_catalog_rows, gemini_configured
from grupo_macro_categoria import macro_category_slug_for_grupo
from relatorio_pdf import parse_relatorio_produtos_pdf_bytes
from relatorio_xlsx import import_row_slug, parse_relatorio_sheet

app = FastAPI(title="Macofel Catalog Agent", version="1.0.0")

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


# Mesma ordem que `lib/storefront-categories.ts` (reserva só para grupo não mapeado).
STOREFRONT_MACRO_SLUGS = (
    "cimento-argamassa",
    "tijolos-blocos",
    "tintas-acessorios",
    "ferramentas",
    "material-hidraulico",
    "material-eletrico",
)


def resolve_fallback_category_oid(db: Database, explicit: str) -> ObjectId:
    """Se `explicit` é ObjectId válido e existe → usa; senão primeira macro da vitrine na BD."""
    exp = (explicit or "").strip()
    if exp:
        try:
            oid = ObjectId(exp)
        except Exception as e:  # noqa: BLE001
            raise HTTPException(400, "categoryId inválido (ObjectId esperado).") from e
        if db["categories"].find_one({"_id": oid}):
            return oid
        raise HTTPException(400, "Categoria não encontrada (categoryId inválido).")

    slug_to_oid: dict[str, ObjectId] = {}
    for doc in db["categories"].find({}, {"slug": 1, "_id": 1}):
        s = str(doc.get("slug") or "").strip()
        if s:
            slug_to_oid[s] = doc["_id"]
    for slug in STOREFRONT_MACRO_SLUGS:
        if slug in slug_to_oid:
            return slug_to_oid[slug]
    one = db["categories"].find_one({})
    if one:
        return one["_id"]
    raise HTTPException(500, "Nenhuma categoria na base de dados.")


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


def run_import(
    db: Database,
    rows: list[dict[str, Any]],
    upsert: bool,
    preserve_stock_for_existing: bool = False,
    category_id: ObjectId | None = None,
) -> dict[str, Any]:
    """Grava produtos no Mongo com as mesmas chaves camelCase que o Prisma (codigo, cost, marca, …).

    Cada `row` vem do Excel parseado em relatorio_xlsx (code, name, grupo, marca, price, stock, cost, …).
    Match de produto existente: primeiro `slug` derivado de código+nome, depois campo único `codigo`.
    """
    if category_id is None:
        raise ValueError("categoryId (reserva) é obrigatório após resolução no endpoint.")

    slug_to_oid: dict[str, ObjectId] = {}
    for doc in db["categories"].find({}, {"slug": 1}):
        s = str(doc.get("slug") or "").strip()
        if s:
            slug_to_oid[s] = doc["_id"]

    created = updated = skipped = 0
    errors: list[dict[str, str]] = []

    for row in rows:
        name = str(row.get("name") or "").strip()
        if not name:
            continue
        code = str(row.get("code") or "").strip()
        codigo = code or None
        base_slug = import_row_slug(code, name)
        try:
            subcategoria = str(row.get("grupo") or "").strip() or None
            macro_slug = macro_category_slug_for_grupo(subcategoria)
            cat_id = (
                slug_to_oid.get(macro_slug) if macro_slug else None
            ) or category_id
            price = float(row.get("price") or 0)
            stock = int(row.get("stock") or 0)
            description = str(row.get("description") or "Importado.")
            raw_marca = str(row.get("marca") or "").strip()
            if not raw_marca or raw_marca in ("—", "-"):
                marca_val = None
            else:
                marca_val = raw_marca
            raw = row.get("cost")
            if raw is not None and raw != "":
                try:
                    cost_val = float(raw)
                    if not math.isfinite(cost_val):
                        cost_val = None
                except (TypeError, ValueError):
                    cost_val = None
            else:
                cost_val = None

            existing = db["products"].find_one({"slug": base_slug})
            if not existing and codigo:
                existing = db["products"].find_one({"codigo": codigo})

            if existing:
                if not upsert:
                    skipped += 1
                    continue
                stock_write = (
                    int(existing.get("stock") or 0)
                    if preserve_stock_for_existing
                    else stock
                )
                db["products"].update_one(
                    {"_id": existing["_id"]},
                    {
                        "$set": {
                            "name": name,
                            "description": description,
                            "price": price,
                            "stock": stock_write,
                            "categoryId": cat_id,
                            "codigo": codigo,
                            "cost": cost_val,
                            "pricePrazo": None,
                            "unidade": None,
                            "codBarra": None,
                            "marca": marca_val,
                            "subcategoria": subcategoria,
                            "origin": "import",
                            "status": True,
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
                    "codigo": codigo,
                    "cost": cost_val,
                    "pricePrazo": None,
                    "unidade": None,
                    "codBarra": None,
                    "marca": marca_val,
                    "subcategoria": subcategoria,
                    "origin": "import",
                    "status": True,
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
        "service": "macofel-catalog-agent",
        "geminiEnrich": gemini_configured(),
    }


@app.get("/health")
def health_probe():
    """Alias para health checks que usam o path `/health` (ex. snippet / monitorização)."""
    return {
        "status": "healthy",
        "service": "macofel-catalog-agent",
        "geminiEnrich": gemini_configured(),
    }


class ImportRequest(BaseModel):
    """Contrato enviado pelo Next.js (`/api/admin/catalog/upload` → Render)."""

    fileUrl: str
    fileName: str
    importType: str = "full-catalog"
    userId: str | None = None
    blobReadToken: str | None = None

    @field_validator("userId", mode="before")
    @classmethod
    def _user_id_str(cls, v: object) -> str | None:
        if v is None or v == "":
            return None
        return str(v)


async def verify_import_webhook(
    x_catalog_webhook_secret: str | None = Header(None, alias="X-Catalog-Webhook-Secret"),
) -> None:
    expected = os.environ.get("RENDER_CATALOG_WEBHOOK_SECRET", "").strip()
    if not expected:
        return
    if (x_catalog_webhook_secret or "").strip() != expected:
        raise HTTPException(
            status_code=401,
            detail="X-Catalog-Webhook-Secret inválido ou em falta",
        )


def _max_catalog_batch() -> int:
    raw = os.environ.get("MAX_CATALOG_BATCH", "50").strip()
    try:
        n = int(raw)
        return max(1, min(100, n))
    except ValueError:
        return 50


def _row_to_pending_doc(row: dict[str, Any], meta: dict[str, Any]) -> dict[str, Any] | None:
    name = str(row.get("name") or "").strip()
    if not name:
        return None
    code = str(row.get("code") or "").strip()
    grupo = str(row.get("grupo") or "").strip()
    macro_slug = macro_category_slug_for_grupo(grupo) or ""
    slug = f"pending-review-{uuid.uuid4().hex}"[:120]
    desc = str(row.get("description") or "").strip() or name
    price = float(row.get("price") or 0)
    stock = int(row.get("stock") or 0)
    raw_marca = str(row.get("marca") or "").strip()
    marca_val = None if not raw_marca or raw_marca in ("—", "-") else raw_marca
    cost_val = None
    cost_raw = row.get("cost")
    if cost_raw is not None and cost_raw != "":
        try:
            c = float(cost_raw)
            cost_val = c if math.isfinite(c) else None
        except (TypeError, ValueError):
            cost_val = None
    return {
        "name": name,
        "slug": slug,
        "description": desc,
        "price": price,
        "stock": stock,
        "minStock": 0,
        "codigo": code or None,
        "cost": cost_val,
        "pricePrazo": None,
        "unidade": None,
        "weight": None,
        "codBarra": None,
        "marca": marca_val,
        "subcategoria": grupo,
        "macroCategorySlug": macro_slug,
        "origin": "import",
        "status": "pending_review",
        "featured": False,
        "imageUrl": None,
        "imageUrls": [],
        "created_at": datetime.now(timezone.utc),
        "reviewed_at": None,
        "review_status": "pending",
        "review_notes": None,
        **meta,
    }


@app.post("/api/import")
async def start_import_from_blob(
    data: ImportRequest,
    _webhook: None = Depends(verify_import_webhook),
):
    """
    Webhook chamado pelo Next.js (`/api/admin/catalog/upload`) após upload no Vercel Blob.

    Corpo JSON: fileUrl, fileName, importType (default full-catalog), userId opcional,
    blobReadToken opcional (Bearer ao Blob privado).

    Formatos: .xls / .xlsx (parse interno) ou .pdf (pypdf + heurística alinhada ao relatório LW).
    """
    url = (data.fileUrl or "").strip()
    fname = (data.fileName or "").strip()
    if not url or not fname:
        raise HTTPException(400, "fileUrl e fileName são obrigatórios")

    filename_lower = fname.lower()

    # 1. Baixar o arquivo do Vercel Blob (timeout maior para PDFs grandes)
    headers: dict[str, str] = {}
    tok = (data.blobReadToken or "").strip()
    if tok:
        headers["Authorization"] = f"Bearer {tok}"

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0)) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
            file_bytes = resp.content
    except httpx.HTTPStatusError:
        raise HTTPException(
            status_code=502,
            detail="Erro ao baixar arquivo do Vercel Blob",
        ) from None
    except httpx.RequestError as e:
        raise HTTPException(502, f"Erro de rede ao baixar ficheiro: {e}") from e

    if len(file_bytes) > 100 * 1024 * 1024:
        raise HTTPException(413, "Ficheiro acima de 100 MB")

    try:
        rows: list[dict[str, Any]]
        warnings: list[str]

        if filename_lower.endswith((".xls", ".xlsx")):
            try:
                rows, warnings = await asyncio.to_thread(parse_excel_bytes, file_bytes)
            except Exception as e:  # noqa: BLE001
                raise HTTPException(400, f"Erro ao ler Excel: {e}") from e
        elif filename_lower.endswith(".pdf"):
            try:
                rows, warnings = await asyncio.to_thread(
                    parse_relatorio_produtos_pdf_bytes, file_bytes
                )
            except Exception as e:  # noqa: BLE001
                raise HTTPException(400, f"Erro ao ler PDF: {e}") from e
        else:
            raise HTTPException(
                status_code=415,
                detail="Formato suportado: .xls, .xlsx ou .pdf (relatório tipo Macofel / LW).",
            )

        if not rows:
            return {
                "status": "ok",
                "importId": f"import-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "message": "Nenhuma linha válida encontrada no arquivo",
                "processed": 0,
                "pending_review": 0,
                "warnings": list(warnings),
            }

        max_batch = _max_catalog_batch()
        if len(rows) > max_batch:
            rows = rows[:max_batch]
            warnings = list(warnings) + [
                f"Limitado a {max_batch} linhas (MAX_CATALOG_BATCH). Total parseado: maior."
            ]

        want_ai = data.importType == "full-catalog" and gemini_configured()
        if want_ai and rows:
            rows, ai_warnings = await asyncio.to_thread(enrich_catalog_rows, rows)
            warnings = list(warnings) + list(ai_warnings)

        meta: dict[str, Any] = {
            "catalog_import_source_url": url,
            "catalog_import_file_name": fname,
        }
        uid = (data.userId or "").strip()
        if uid:
            meta["catalog_import_user_id"] = uid

        db = get_db()
        pending_docs: list[dict[str, Any]] = []
        for row in rows:
            doc = _row_to_pending_doc(row, meta)
            if doc:
                pending_docs.append(doc)

        if not pending_docs:
            return {
                "status": "ok",
                "importId": f"import-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}",
                "message": "Nenhuma linha válida para pending_review.",
                "processed": 0,
                "pending_review": 0,
                "warnings": list(warnings) or ["Nenhum produto reconhecido."],
            }

        def _insert() -> int:
            res = db["products"].insert_many(pending_docs)
            return len(res.inserted_ids)

        inserted = await asyncio.to_thread(_insert)
        import_id = f"import-{datetime.now(timezone.utc).strftime('%Y%m%d-%H%M%S')}"

        return {
            "status": "started",
            "importId": import_id,
            "message": f"Processamento iniciado com {inserted} produtos",
            "processed": inserted,
            "pending_review": inserted,
            "warnings": list(warnings),
        }
    except HTTPException:
        raise
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e)) from e


@app.post("/import/catalog")
async def import_catalog(
    _auth: None = Depends(verify_bearer),
    file: UploadFile = File(...),
    upsert: str = Form("true"),
    enrich_ai: str = Form("false"),
    preserve_stock_db: str = Form("false"),
    categoryId: str = Form(""),
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

    db = get_db()
    cat_oid = resolve_fallback_category_oid(db, categoryId)

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

    do_upsert = upsert.lower() in ("1", "true", "yes", "on")
    keep_stock = preserve_stock_db.lower() in ("1", "true", "yes", "on")

    result = run_import(db, rows, do_upsert, keep_stock, category_id=cat_oid)
    result["warnings"] = warnings
    return result
