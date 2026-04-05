"""
ASGI para Render (`uvicorn webapp:app`).

Reutiliza a aplicação FastAPI definida em `render-catalog-import/main.py`
(POST /api/import, POST /import/catalog, GET /) sem duplicar o contrato HTTP.
"""
from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent
_REPO = _ROOT.parent
_IMPORT_SVC = _REPO / "render-catalog-import"

if not _IMPORT_SVC.is_dir():
    raise RuntimeError(
        f"Esperada a pasta render-catalog-import em {_IMPORT_SVC} "
        "(monorepo Macofel)."
    )

sys.path.insert(0, str(_IMPORT_SVC))

_spec = importlib.util.spec_from_file_location(
    "macofel_render_catalog_main",
    _IMPORT_SVC / "main.py",
)
if _spec is None or _spec.loader is None:
    raise RuntimeError("Falha ao carregar spec de render-catalog-import/main.py")

_mod = importlib.util.module_from_spec(_spec)
sys.modules["macofel_render_catalog_main"] = _mod
_spec.loader.exec_module(_mod)

app = getattr(_mod, "app", None)
if app is None:
    raise RuntimeError("render-catalog-import/main.py não exporta `app` (FastAPI).")
