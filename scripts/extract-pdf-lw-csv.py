#!/usr/bin/env python3
"""
Ferramenta opcional OFFLINE: PDF LW → CSV (requer pdfplumber, pandas, python-slugify).
O fluxo principal do Macofel é importar o mesmo PDF em Admin → Produtos (Next.js + pdfjs).

Instalação:
  pip install pdfplumber pandas python-slugify

Uso:
  python scripts/extract-pdf-lw-csv.py "caminho/Relatorio de Produtos Codigo de Barras LW.pdf"
"""
from __future__ import annotations

import csv
import sys

try:
    import pdfplumber
    import pandas as pd
    from slugify import slugify
except ImportError as e:
    print("Instale: pip install pdfplumber pandas python-slugify", file=sys.stderr)
    raise SystemExit(1) from e


def main() -> None:
    path = sys.argv[1] if len(sys.argv) > 1 else "Relatorio de Produtos Codigo de Barras LW.pdf"
    out_csv = sys.argv[2] if len(sys.argv) > 2 else "produtos_macofel_import.csv"

    all_rows: list[list[str | None]] = []
    headers: list[str] | None = None

    with pdfplumber.open(path) as pdf:
        for page_num, page in enumerate(pdf.pages, 1):
            table = page.extract_table()
            if not table:
                continue
            if headers is None and page_num == 1:
                headers = [str(c or "").strip() for c in table[0]]
                start = 1
            else:
                start = 0
            for row in table[start:]:
                if row and any(cell and str(cell).strip() for cell in row):
                    all_rows.append([str(c).strip() if c else "" for c in row])

    if not headers or not all_rows:
        print("Nenhuma tabela encontrada no PDF.", file=sys.stderr)
        raise SystemExit(2)

    df = pd.DataFrame(all_rows)
    if df.shape[1] < 10:
        print(f"Colunas insuficientes ({df.shape[1]}); esperado ~10.", file=sys.stderr)
        raise SystemExit(3)

    df.columns = [
        "codigo",
        "produto",
        "unidade",
        "cod_barra",
        "peso",
        "custo",
        "venda_vista",
        "venda_prazo",
        "estoque",
        "status",
    ]

    def money(s: pd.Series) -> pd.Series:
        return pd.to_numeric(
            s.astype(str).str.replace("R$", "", regex=False).str.replace(",", ".", regex=False).str.strip(),
            errors="coerce",
        )

    df["custo"] = money(df["custo"])
    df["venda_vista"] = money(df["venda_vista"])
    df["venda_prazo"] = money(df["venda_prazo"])
    df["estoque"] = pd.to_numeric(df["estoque"], errors="coerce")
    df["peso"] = pd.to_numeric(df["peso"], errors="coerce")

    df["slug"] = df.apply(
        lambda x: slugify(f"{x['codigo']} {x['produto']}")[:80],
        axis=1,
    )

    df["description"] = df.apply(
        lambda x: "\n".join(
            [
                f"Código: {x['codigo']}",
                f"Unidade: {x['unidade']}",
                f"Peso: {x['peso']} kg",
                f"Custo: R$ {x['custo']:.2f}" if pd.notna(x["custo"]) else "Custo: —",
                f"Venda Vista: R$ {x['venda_vista']:.2f}" if pd.notna(x["venda_vista"]) else "Venda Vista: —",
                f"Venda Prazo: R$ {x['venda_prazo']:.2f}" if pd.notna(x["venda_prazo"]) else "Venda Prazo: —",
                f"Estoque: {x['estoque']}",
                f"Status: {x['status']}",
            ]
        ),
        axis=1,
    )

    final_df = df[
        [
            "codigo",
            "slug",
            "produto",
            "description",
            "custo",
            "venda_vista",
            "venda_prazo",
            "estoque",
            "unidade",
            "peso",
            "cod_barra",
            "status",
        ]
    ].copy()
    final_df.rename(
        columns={"produto": "name", "venda_vista": "price", "venda_prazo": "pricePrazo"},
        inplace=True,
    )

    final_df.to_csv(out_csv, index=False, encoding="utf-8-sig", quoting=csv.QUOTE_ALL)
    print(f"OK: {len(final_df)} linhas → {out_csv}")


if __name__ == "__main__":
    main()
