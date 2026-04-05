# Parser PDF «Relatório de Produtos / Código de barras» LW — alinhado a lib/relatorio-produtos-pdf.ts
# Extrai texto com pypdf (sem pdf.js); o layout pode diferir ligeiramente do Next.js.
from __future__ import annotations

import math
import re
from io import BytesIO
from typing import Any

from pypdf import PdfReader

from relatorio_xlsx import parse_br_decimal




def _extract_pdf_text_lines(content: bytes) -> tuple[list[str], bool]:
    reader = PdfReader(BytesIO(content))
    out: list[str] = []
    truncated = False
    max_chars = 80_000_000
    for page in reader.pages:
        if sum(len(x) for x in out) > max_chars:
            truncated = True
            break
        raw = page.extract_text() or ""
        for line in raw.split("\n"):
            t = line.replace("\u00a0", " ").strip()
            if not t:
                continue
            out.append(" ".join(t.split()))
    return out, truncated


def _is_noise_line(line: str) -> bool:
    s = line.strip()
    if not s:
        return True
    if re.match(r"^RELATÓRIO\s+DE\s+PRODUTOS", s, re.I):
        return True
    if (
        not re.match(r"^\d", s)
        and re.search(r"relat[óo]rio", s, re.I)
        and re.search(r"produtos?", s, re.I)
        and re.search(r"(c[óo]digo|cod\.?)\s*(de\s+)?barras?", s, re.I)
    ):
        return True
    if re.match(r"^DATA:\s*\d", s, re.I):
        return True
    if re.search(r"C[oó]digo\s+Produto\s+", s, re.I) and re.search(r"Status", s, re.I):
        return True
    if re.match(r"^\d+\s*Pag\.?\s*$", s, re.I):
        return True
    if re.match(r"^--\s*\d+\s+of\s+\d+\s*--$", s, re.I):
        return True
    return False


def _clean_ean(s: str) -> str:
    return re.sub(r"\D", "", str(s or ""))


def _is_likely_ean(s: str) -> bool:
    d = _clean_ean(s)
    return len(d) in (8, 12, 13, 14)


def _parse_tail_tokens(toks: list[str]) -> dict[str, Any] | None:
    if len(toks) < 4:
        return None

    if len(toks) == 4:
        unid = toks[0]
        peso = parse_br_decimal(toks[1])
        vv = parse_br_decimal(toks[2])
        vp = parse_br_decimal(toks[3])
        if not math.isfinite(vv) or not math.isfinite(vp):
            return None
        return {
            "unid": unid,
            "peso": peso if math.isfinite(peso) else 0.0,
            "estoque": 0,
            "cod_barra": "",
            "venda_vista": vv,
            "venda_prazo": vp,
        }

    if len(toks) == 5:
        if _is_likely_ean(toks[2]):
            unid = toks[0]
            peso = parse_br_decimal(toks[1])
            cod_barra = _clean_ean(toks[2])
            vv = parse_br_decimal(toks[3])
            vp = parse_br_decimal(toks[4])
            if not math.isfinite(vv) or not math.isfinite(vp):
                return None
            return {
                "unid": unid,
                "peso": peso if math.isfinite(peso) else 0.0,
                "estoque": 0,
                "cod_barra": cod_barra,
                "venda_vista": vv,
                "venda_prazo": vp,
            }
        unid = toks[0]
        peso = parse_br_decimal(toks[1])
        estoque = int(round(parse_br_decimal(toks[2]) or 0))
        vv = parse_br_decimal(toks[3])
        vp = parse_br_decimal(toks[4])
        if not math.isfinite(vv) or not math.isfinite(vp):
            return None
        return {
            "unid": unid,
            "peso": peso if math.isfinite(peso) else 0.0,
            "estoque": estoque,
            "cod_barra": "",
            "venda_vista": vv,
            "venda_prazo": vp,
        }

    if len(toks) >= 6 and _is_likely_ean(toks[3]):
        unid = toks[0]
        peso = parse_br_decimal(toks[1])
        estoque = int(round(parse_br_decimal(toks[2]) or 0))
        cod_barra = _clean_ean(toks[3])
        vv = parse_br_decimal(toks[4])
        vp = parse_br_decimal(toks[5])
        if not math.isfinite(vv) or not math.isfinite(vp):
            return None
        return {
            "unid": unid,
            "peso": peso if math.isfinite(peso) else 0.0,
            "estoque": estoque,
            "cod_barra": cod_barra,
            "venda_vista": vv,
            "venda_prazo": vp,
        }

    return None


def _parse_head_section(head: str) -> dict[str, Any] | None:
    st = head.strip()
    m = re.match(r"^(\d+)\s+(.+)$", st)
    if not m:
        return None
    codigo = m.group(1)
    rest = m.group(2).strip()
    tokens = rest.split()
    if len(tokens) < 2:
        return None
    custo = parse_br_decimal(tokens[-1])
    if not math.isfinite(custo):
        return None
    produto = " ".join(tokens[:-1])
    if not produto:
        return None
    return {"codigo": codigo, "produto": produto, "custo": custo}


def _parse_product_line_trailing_metrics(line: str, line_index: int) -> dict[str, Any] | None:
    raw = re.sub(r"\u00a0", " ", line).strip()
    if not re.match(r"^\d+\s", raw):
        return None
    st = re.search(r"\s(ATIVO|INATIVO)\s*$", raw, re.I)
    if not st:
        return None
    status = st.group(1).upper()
    before = raw[: st.start()].strip()
    tokens = [t for t in before.split() if t]
    if len(tokens) < 7:
        return None

    nums: list[float] = []
    rest = list(tokens)
    while rest and len(nums) < 5:
        t = rest[-1]
        n = parse_br_decimal(t)
        if math.isfinite(n):
            nums.append(n)
            rest.pop()
        else:
            return None
    if len(nums) != 5:
        return None

    estoque = int(round(nums[0]))
    venda_prazo = nums[1]
    venda_vista = nums[2]
    custo = nums[3]
    peso = nums[4]

    cod_barra = ""
    if len(rest) >= 2 and _is_likely_ean(rest[-1]):
        cod_barra = _clean_ean(rest.pop())

    codigo = rest[0]
    if not re.match(r"^\d+$", codigo):
        return None
    produto = " ".join(rest[1:])
    if not produto:
        return None

    return {
        "line_index": line_index,
        "codigo": codigo,
        "produto": produto,
        "unid": "",
        "cod_barra": cod_barra,
        "peso": peso,
        "custo": custo,
        "venda_vista": venda_vista,
        "venda_prazo": venda_prazo,
        "estoque": estoque,
        "status": status,
    }


def _parse_product_line_legacy_tabs(line: str, line_index: int) -> dict[str, Any] | None:
    raw = re.sub(r"\u00a0", " ", line).strip()
    if not re.match(r"^\d+\s", raw):
        return None

    tab_parts = [p.strip() for p in re.split(r"\t+", raw) if p.strip()]
    head_for_parse: str
    status: str
    tail_toks: list[str]

    if len(tab_parts) >= 3:
        head_tab = tab_parts[0]
        sm = re.search(r"\s(ATIVO|INATIVO)\s*$", head_tab, re.I)
        if not sm:
            return None
        status = sm.group(1).upper()
        head_for_parse = head_tab[: sm.start()].strip()
        mid = tab_parts[1].split()
        tail_str = " ".join(tab_parts[2:])
        tail_toks = [*mid, *[t for t in tail_str.split() if t]]
    else:
        matches = list(re.finditer(r"\s(ATIVO|INATIVO)(?=\s|$)", raw, re.I))
        if not matches:
            return None
        sm = matches[-1]
        status = sm.group(1).upper()
        head_for_parse = raw[: sm.start()].strip()
        after = raw[sm.end() :].strip()
        tail_toks = [t for t in after.split() if t]

    head_parsed = _parse_head_section(head_for_parse)
    if not head_parsed:
        return None
    tail = _parse_tail_tokens(tail_toks)
    if not tail:
        return None

    return {
        "line_index": line_index,
        "codigo": head_parsed["codigo"],
        "produto": head_parsed["produto"],
        "unid": tail["unid"],
        "cod_barra": tail["cod_barra"],
        "peso": tail["peso"],
        "custo": head_parsed["custo"],
        "venda_vista": tail["venda_vista"],
        "venda_prazo": tail["venda_prazo"],
        "estoque": tail["estoque"],
        "status": status,
    }


def _parse_product_line(line: str, line_index: int) -> dict[str, Any] | None:
    return _parse_product_line_trailing_metrics(line, line_index) or _parse_product_line_legacy_tabs(
        line, line_index
    )


def _pdf_row_to_catalog_row(r: dict[str, Any]) -> dict[str, Any]:
    vv, vp = r["venda_vista"], r["venda_prazo"]
    price = max(0.0, vv if vv > 0 else vp)
    parts = [
        f"Unid.: {r['unid']}.",
        f"Peso: {r['peso']}.",
        f"Custo: {r['custo']}.",
        f"Venda prazo: {r['venda_prazo']}.",
        f"Status: {r['status']}.",
    ]
    if r["cod_barra"]:
        parts.insert(0, f"EAN: {r['cod_barra']}.")
    description = " ".join(parts)
    cost = r["custo"] if r["custo"] > 0 and math.isfinite(r["custo"]) else None
    return {
        "sheetName": "pdf",
        "rowIndex": r["line_index"],
        "code": r["codigo"],
        "name": r["produto"],
        "grupo": "",
        "marca": None,
        "stock": r["estoque"],
        "price": price,
        "description": description,
        "cost": cost,
    }


def parse_relatorio_produtos_pdf_bytes(content: bytes) -> tuple[list[dict[str, Any]], list[str]]:
    """
    Devolve o mesmo formato de linhas que parse_excel_bytes (chaves code, name, grupo, …)
    para reutilizar _row_to_pending_doc / Gemini.
    """
    warnings: list[str] = []
    lines, truncated = _extract_pdf_text_lines(content)
    if truncated:
        warnings.append(
            "PDF truncado no limite de texto: páginas no fim podem não ter sido lidas."
        )

    pdf_rows: list[dict[str, Any]] = []
    skipped = 0
    for i, line in enumerate(lines):
        if _is_noise_line(line):
            continue
        row = _parse_product_line(line, i + 1)
        if row:
            pdf_rows.append(row)
        elif re.match(r"^\d+\s", line) and len(line) > 15:
            skipped += 1

    if skipped > 0:
        warnings.append(f"{skipped} linha(s) com código não foram interpretadas (formato inesperado).")
    if not pdf_rows and len(lines) > 50:
        warnings.append(
            "Nenhum produto reconhecido. PDF digitalizado (imagem) ou extração de texto fraca — "
            "prefira Excel ou importação no Next.js com pdf.js."
        )

    catalog_rows = [_pdf_row_to_catalog_row(r) for r in pdf_rows]
    return catalog_rows, warnings
