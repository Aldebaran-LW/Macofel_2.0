from langgraph.graph import END, StateGraph

from agents.categorizer_agent import categorize_product
from agents.enricher_agent import ProductState, enrich_product

workflow = StateGraph(ProductState)

workflow.add_node("enrich", enrich_product)
workflow.add_node("categorize", categorize_product)

workflow.set_entry_point("enrich")
workflow.add_edge("enrich", "categorize")
workflow.add_edge("categorize", END)

catalog_graph = workflow.compile()

# Alias esperado por main.py e integrações externas
catalog_pipeline = catalog_graph
