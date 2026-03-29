# Parser alinhado a lib/relatorio-estoque-xls.ts (Relação de estoque / relatório LW).
from __future__ import annotations

import math
import re
import unicodedata
from typing import Any


def slugify_product_key(input_s: str) -> str:
    s = input_s.lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = re.sub(r"[^a-z0-9]+", "-", s)
    s = re.sub(r"(^-|-$)", "", s)
    return s


def import_row_slug(code: str, name: str) -> str:
    key = f"{code or 'snc'}-{name}".strip()
    s = slugify_product_key(key)
    return (s[:120] or slugify_product_key(name)[:120] or "produto")


def parse_br_decimal(v: Any) -> float:
    if isinstance(v, (int, float)) and math.isfinite(float(v)):
        return float(v)
    s = str(v or "").strip().replace(" ", "")
    s = re.sub(r"[^\d,.-]", "", s)
    if not s:
        return float("nan")
    if "," in s:
        s = s.replace(".", "").replace(",", ".")
    try:
        n = float(s)
        return n if math.isfinite(n) else float("nan")
    except ValueError:
        return float("nan")


def looks_like_product_code(s: str) -> bool:
    t = re.sub(r"\s", "", s)
    if not t:
        return False
    return bool(re.match(r"^[\d][\d.,-]*$", t))


def find_header_row_index(rows: list[list[str]]) -> int:
    for i, r in enumerate(rows):
        if len(r) < 6:
            continue
        c0 = str(r[0] or "").strip()
        if c0 != "Produto":
            continue
        has_grupo = any(str(c or "").strip() == "Grupo" for c in r)
        has_marca = any(str(c or "").strip() == "Marca" for c in r)
        has_estoque = any(
            (t := str(c or "").strip()) == "Estoque" or "Estoque" in t for c in r
        )
        if has_grupo and has_marca and has_estoque:
            return i
    return -1


def resolve_name_col(
    produto_idxs: list[int], sample_row: list[str] | None, grupo_col: int
) -> int:
    if len(produto_idxs) < 2:
        first = produto_idxs[0] if produto_idxs else 0
        nxt = first + 1
        if grupo_col > nxt >= 0:
            return nxt
        return max(0, first)

    a, b = produto_idxs[0], produto_idxs[1]
    if b != a + 1:
        return b

    if sample_row and len(sample_row) > b + 1:
        cell_a = str(sample_row[a] or "").strip()
        cell_b = str(sample_row[b] or "").strip()
        cell_c = str(sample_row[b + 1] or "").strip()
        duplicate_code = cell_a != "" and cell_b == cell_a and looks_like_product_code(cell_b)
        if duplicate_code and len(cell_c) >= 3:
            return b + 1
        if len(cell_b) > 0 and not looks_like_product_code(cell_b):
            return b
        if len(cell_c) > len(cell_b) and len(cell_c) >= 8 and looks_like_product_code(cell_b):
            return b + 1

    return b


def build_col_map(header: list[str], sample_row: list[str] | None) -> dict[str, int] | None:
    produto_idxs = [i for i, v in enumerate(header) if str(v or "").strip() == "Produto"]
    if len(produto_idxs) < 1:
        return None

    grupo_col = next((i for i, c in enumerate(header) if str(c or "").strip() == "Grupo"), -1)
    marca_col = next((i for i, c in enumerate(header) if str(c or "").strip() == "Marca"), -1)
    if grupo_col < 0 or marca_col < 0:
        return None

    estoque_col = next(
        (
            i
            for i, v in enumerate(header)
            if (t := str(v or "").strip()) == "Estoque" or "Estoque" in t
        ),
        -1,
    )
    vl_custo_col = next(
        (
            i
            for i, v in enumerate(header)
            if "Vl.Est.Custo" in str(v) or "vl.est.custo" in str(v).lower()
        ),
        -1,
    )
    vl_venda_col = next(
        (
            i
            for i, v in enumerate(header)
            if "Vl.Est.Venda" in str(v) or "vl.est.venda" in str(v).lower()
        ),
        -1,
    )

    if estoque_col < 0:
        return None

    code_col = produto_idxs[0]
    name_col = resolve_name_col(produto_idxs, sample_row, grupo_col)

    return {
        "codeCol": code_col,
        "nameCol": name_col,
        "grupoCol": grupo_col,
        "marcaCol": marca_col,
        "estoqueCol": estoque_col,
        "vlCustoCol": vl_custo_col,
        "vlVendaCol": vl_venda_col,
    }


def first_sample_data_row(rows: list[list[str]], header_idx: int) -> list[str] | None:
    for r in range(header_idx + 1, min(header_idx + 15, len(rows))):
        row = rows[r]
        if not row:
            continue
        c0 = str(row[0] or "").strip()
        c1 = str(row[1] or "").strip() if len(row) > 1 else ""
        c2 = str(row[2] or "").strip() if len(row) > 2 else ""
        if c0 and (c1 or c2):
            return row
    return None


def is_footer_or_noise(row: list[str], name_col: int, code_col: int) -> bool:
    name = str(row[name_col] if name_col < len(row) else "").strip()
    code = str(row[code_col] if code_col < len(row) else "").strip()
    if not name and not code:
        return True
    if re.match(r"^pag\.?\s*\d*$", name, re.I):
        return True
    joined = " ".join(row).lower()
    if "pag." in joined and "total" in joined:
        return True
    return False


def derive_unit_price(stock: float, vl_venda: float, vl_custo: float) -> float:
    if math.isfinite(stock) and abs(stock) >= 1e-6:
        u = vl_venda / stock
        if math.isfinite(u) and u >= 0:
            return round(u * 10000) / 10000
        u2 = abs(vl_venda) / abs(stock)
        if math.isfinite(u2):
            return round(u2 * 10000) / 10000
    if (
        math.isfinite(vl_custo)
        and math.isfinite(stock)
        and abs(stock) >= 1e-6
    ):
        u = vl_custo / stock
        if math.isfinite(u):
            return max(0.0, round(abs(u) * 10000) / 10000)
    return 0.0


def catalog_unit_price(stock: float, vl_venda: float, vl_custo: float) -> float:
    return max(0.0, derive_unit_price(stock, vl_venda, vl_custo))


def normalize_matrix(raw: list[list[Any]]) -> list[list[str]]:
    out: list[list[str]] = []
    for r in raw:
        row = [str(c or "").strip() if c is not None else "" for c in r]
        out.append(row)
    return out


def parse_relatorio_sheet(sheet_name: str, matrix: list[list[Any]]) -> tuple[list[dict[str, Any]], list[str]]:
    warnings: list[str] = []
    out: list[dict[str, Any]] = []
    rows = normalize_matrix(matrix)

    hi = find_header_row_index(rows)
    if hi < 0:
        warnings.append(
            f'Folha ignorada (sem cabeçalho esperado): {sheet_name}'
        )
        return out, warnings

    sample = first_sample_data_row(rows, hi)
    col_map = build_col_map(rows[hi], sample)
    if not col_map:
        warnings.append(f"Folha ignorada (colunas incompletas): {sheet_name}")
        return out, warnings

    for r in range(hi + 1, len(rows)):
        cells = rows[r]
        if not cells:
            continue
        if is_footer_or_noise(cells, col_map["nameCol"], col_map["codeCol"]):
            continue

        name = str(cells[col_map["nameCol"]] if col_map["nameCol"] < len(cells) else "").strip()
        if not name:
            continue

        code = str(cells[col_map["codeCol"]] if col_map["codeCol"] < len(cells) else "").strip()
        grupo = (
            str(cells[col_map["grupoCol"]] if col_map["grupoCol"] < len(cells) else "").strip()
            or "Sem grupo"
        )
        marca = (
            str(cells[col_map["marcaCol"]] if col_map["marcaCol"] < len(cells) else "").strip()
            or "—"
        )

        ec = col_map["estoqueCol"]
        stock_raw = float("nan")
        for c in [ec, ec - 1, ec + 1]:
            if c >= 0 and c < len(cells):
                stock_raw = parse_br_decimal(cells[c])
                if math.isfinite(stock_raw):
                    break
        stock = int(round(stock_raw)) if math.isfinite(stock_raw) else 0

        def pick_money(primary: int) -> float:
            if primary < 0:
                return float("nan")
            for c in [primary, primary - 1, primary + 1]:
                if c >= 0 and c < len(cells):
                    n = parse_br_decimal(cells[c])
                    if math.isfinite(n):
                        return n
            return float("nan")

        vl_custo_col = col_map["vlCustoCol"]
        vl_venda_col = col_map["vlVendaCol"]
        vl_custo = pick_money(vl_custo_col) if vl_custo_col >= 0 else float("nan")
        vl_venda = pick_money(vl_venda_col) if vl_venda_col >= 0 else float("nan")

        vc = vl_custo if math.isfinite(vl_custo) else 0.0
        vv = vl_venda if math.isfinite(vl_venda) else 0.0
        price = catalog_unit_price(stock, vv, vc)

        cost_unit = None
        if stock and abs(stock) > 1e-6 and math.isfinite(vc) and vc != 0.0:
            try:
                cost_unit = round(abs(vc) / abs(stock), 6)
            except (ZeroDivisionError, ValueError, OverflowError):
                cost_unit = None

        parts = [f"Grupo: {grupo}.", f"Marca: {marca}."]
        if code:
            parts.insert(0, f"Código: {code}.")
        description = " ".join(parts)

        out.append(
            {
                "sheetName": sheet_name,
                "rowIndex": r + 1,
                "code": code,
                "name": name,
                "grupo": grupo,
                "marca": marca,
                "stock": stock,
                "price": price,
                "description": description,
                "cost": cost_unit,
            }
        )

    return out, warnings
