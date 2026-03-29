"""
Enriquecimento opcional de linhas de catálogo via Gemini (Google AI).
Requer variável de ambiente GEMINI_API_KEY ou GOOGLE_API_KEY — nunca commitar chaves.
"""
from __future__ import annotations

import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

# Limite por pedido ao modelo (evita timeouts na Render e custo excessivo)
_MAX_ROWS_PER_BATCH = 35
_MAX_ROWS_PER_IMPORT = 800


def _api_key() -> str:
    return (
        os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or ""
    ).strip()


def gemini_configured() -> bool:
    return bool(_api_key())


def _extract_json_array(text: str) -> list[Any]:
    t = text.strip()
    fence = re.search(r"```(?:json)?\s*([\s\S]*?)```", t, re.I)
    if fence:
        t = fence.group(1).strip()
    m = re.search(r"\[[\s\S]*\]", t)
    if m:
        t = m.group(0)
    return json.loads(t)


def _call_gemini_batch(
    api_key: str,
    items: list[dict[str, str]],
) -> list[Any]:
    """Chama Gemini; devolve lista alinhada por índice com {name, description}."""
    payload_items = [
        {
            "i": i,
            "code": (it.get("code") or "")[:80],
            "name": (it.get("name") or "")[:300],
            "grupo": (it.get("grupo") or "")[:120],
            "marca": (it.get("marca") or "")[:120],
        }
        for i, it in enumerate(items)
    ]
    prompt = (
        "És um assistente para uma loja de materiais de construção em Portugal (pt-PT).\n"
        "Recebes uma lista JSON de produtos. Para cada item, devolve nome comercial limpo "
        "(corrigir erros óbvios de digitação, capitalização razoável) e uma descrição curta "
        "para e-commerce (1–2 frases), factual, sem inventar especificações técnicas.\n"
        "Responde APENAS com um array JSON, mesma ordem e mesmo número de elementos que a entrada, "
        "cada elemento: {\"name\": string, \"description\": string}.\n"
        "Entrada:\n"
        + json.dumps(payload_items, ensure_ascii=False)
    )

    body = json.dumps(
        {
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": 8192,
            },
        },
        ensure_ascii=False,
    ).encode("utf-8")

    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        "gemini-2.0-flash:generateContent?key="
        + urllib.parse.quote(api_key, safe="")
    )
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")
        raise ValueError(f"Gemini HTTP {e.code}: {err_body[:500]}") from e

    parts = (
        data.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [])
    )
    if not parts:
        err = data.get("error") or data.get("promptFeedback")
        raise ValueError(f"Resposta Gemini sem texto: {err}")
    text = parts[0].get("text") or ""
    parsed = _extract_json_array(text)
    if not isinstance(parsed, list):
        raise ValueError("Gemini não devolveu array")
    return parsed


def enrich_catalog_rows(rows: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Enriquece name/description. Em falha de API, devolve rows originais e aviso.
    """
    warnings: list[str] = []
    key = _api_key()
    if not key or not rows:
        return rows, warnings

    if len(rows) > _MAX_ROWS_PER_IMPORT:
        warnings.append(
            f"Enriquecimento IA limitado às primeiras {_MAX_ROWS_PER_IMPORT} linhas "
            f"(total {len(rows)})."
        )
        head = rows[:_MAX_ROWS_PER_IMPORT]
        tail = rows[_MAX_ROWS_PER_IMPORT:]
    else:
        head = rows
        tail = []

    out: list[dict[str, Any]] = []

    for start in range(0, len(head), _MAX_ROWS_PER_BATCH):
        batch = head[start : start + _MAX_ROWS_PER_BATCH]
        slim = [
            {
                "code": str(r.get("code") or ""),
                "name": str(r.get("name") or ""),
                "grupo": str(r.get("grupo") or ""),
                "marca": str(r.get("marca") or ""),
            }
            for r in batch
        ]
        try:
            improved = _call_gemini_batch(key, slim)
        except (urllib.error.URLError, ValueError, json.JSONDecodeError) as e:
            warnings.append(f"Enriquecimento IA falhou neste lote; dados originais mantidos: {e}")
            out.extend(batch)
            continue

        if len(improved) != len(batch):
            warnings.append(
                "Enriquecimento IA: número de linhas não coincide; lote mantido sem IA."
            )
            out.extend(batch)
            continue

        for orig, imp in zip(batch, improved, strict=True):
            if not isinstance(imp, dict):
                out.append(orig)
                continue
            n = str(imp.get("name") or "").strip()
            d = str(imp.get("description") or "").strip()
            merged = {**orig}
            if n:
                merged["name"] = n[:500]
            if d:
                merged["description"] = d[:4000]
            out.append(merged)

    return out + tail, warnings
