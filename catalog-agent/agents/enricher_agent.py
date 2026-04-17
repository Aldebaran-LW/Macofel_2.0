from difflib import SequenceMatcher
from typing import TypedDict

from langchain_google_genai import ChatGoogleGenerativeAI

from prompts.enricher_prompt import ENRICHER_SYSTEM_PROMPT, ENRICHER_USER_PROMPT


class ProductState(TypedDict):
    raw_product: dict
    enriched_product: dict | None
    status: str


llm = ChatGoogleGenerativeAI(
    model="gemini-2.5-flash",
    temperature=0.3,
    max_tokens=800,
)

# Nome interno vs título web muito díspares → não gerar descrição (evita poluir o catálogo).
_TITLE_MATCH_MIN_RATIO = 0.28


def _titles_too_different(internal: str, web_title: str) -> bool:
    a = (internal or "").strip().lower()
    b = (web_title or "").strip().lower()
    if not b or len(b) < 4:
        return False
    if not a or len(a) < 4:
        return False
    return SequenceMatcher(None, a, b).ratio() < _TITLE_MATCH_MIN_RATIO


async def enrich_product(state: ProductState) -> ProductState:
    raw = state["raw_product"]
    name = str(raw.get("name") or "").strip()
    web_title = str(raw.get("web_title") or "").strip()

    if web_title and _titles_too_different(name, web_title):
        state["enriched_product"] = None
        state["status"] = "enrichment_title_mismatch"
        return state

    prompt = ENRICHER_USER_PROMPT.format(
        name=raw.get("name"),
        codigo=raw.get("codigo"),
        description=raw.get("description", ""),
        price=raw.get("price"),
        category=raw.get("category", ""),
        web_title=web_title if web_title else "(não fornecido)",
    )

    response = await llm.ainvoke(
        [
            {"role": "system", "content": ENRICHER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    text = (response.content or "").strip()
    upper = text.upper()
    if upper == "INSUFFICIENT_DATA" or upper.startswith("INSUFFICIENT_DATA"):
        state["enriched_product"] = None
        state["status"] = "enrichment_insufficient_data"
        return state

    state["enriched_product"] = {
        **raw,
        "description": text,
        "status": "pending_review",
    }
    state["status"] = "enriched"
    return state
