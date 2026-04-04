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


async def enrich_product(state: ProductState) -> ProductState:
    prompt = ENRICHER_USER_PROMPT.format(
        name=state["raw_product"].get("name"),
        codigo=state["raw_product"].get("codigo"),
        description=state["raw_product"].get("description", ""),
        price=state["raw_product"].get("price"),
        category=state["raw_product"].get("category", ""),
    )

    response = await llm.ainvoke(
        [
            {"role": "system", "content": ENRICHER_SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ]
    )

    state["enriched_product"] = {
        **state["raw_product"],
        "description": response.content,
        "status": "pending_review",
    }
    state["status"] = "enriched"
    return state
