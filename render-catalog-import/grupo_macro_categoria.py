"""Mapa grupo (coluna «Grupo» do Excel) → slug de categoria macro — alinhado a `lib/grupo-macro-categoria.ts`.

Os dados vêm de `grupo_entries.json` (gerar com `node scripts/extract-grupo-entries.mjs` na raiz do repo).
"""
from __future__ import annotations

import json
import re
import unicodedata
from pathlib import Path

_HERE = Path(__file__).resolve().parent


def _load_entries() -> list[tuple[str, str]]:
    path = _HERE / "grupo_entries.json"
    if not path.is_file():
        return []
    raw = json.loads(path.read_text(encoding="utf-8"))
    return [(str(a), str(b)) for a, b in raw]


def normalize_grupo_key(raw: str | None) -> str:
    s = unicodedata.normalize("NFD", str(raw or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.replace("\u00a0", " ").strip()
    s = re.sub(r"\s+", " ", s)
    return s.upper()


_SKIP = frozenset({"", "SEM GRUPO", "IMPORTADO PDF", "TESTE GRUPO"})

_ENTRIES = _load_entries()
_GRUPO_MACRO_SLUG: dict[str, str] = {}
for label, slug in _ENTRIES:
    _GRUPO_MACRO_SLUG[normalize_grupo_key(label)] = slug


def macro_category_slug_for_grupo(grupo: str | None) -> str | None:
    k = normalize_grupo_key(grupo)
    if k in _SKIP:
        return None
    return _GRUPO_MACRO_SLUG.get(k)

