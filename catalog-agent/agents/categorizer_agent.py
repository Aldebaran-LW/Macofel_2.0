from agents.enricher_agent import ProductState


async def categorize_product(state: ProductState) -> ProductState:
    """Stub: substitua por classificação LLM ou regras quando estiver pronto."""
    if state.get("enriched_product") is None:
        state["status"] = "categorize_skipped_no_enrichment"
        return state
    state["status"] = "categorized"
    return state
