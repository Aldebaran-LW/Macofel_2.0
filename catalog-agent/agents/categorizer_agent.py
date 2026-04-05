from langchain_google_genai import ChatGoogleGenerativeAI

from config.settings import settings

llm = ChatGoogleGenerativeAI(
    model=settings.GEMINI_MODEL,
    temperature=0.2,
    google_api_key=settings.GEMINI_API_KEY,
)

CATEGORIZER_PROMPT = """
Você é especialista em materiais de construção. Classifique o produto na categoria macro mais adequada.

Categorias disponíveis (use exatamente estes slugs):
- cimento-argamassa
- tijolos-blocos
- tintas-acessorios
- ferramentas
- material-hidraulico
- material-eletrico

Produto: {name}
Descrição: {description}
Marca: {marca}
Categoria original: {category}

Responda APENAS com o slug da categoria correta, nada mais.
Exemplo: cimento-argamassa
"""


async def categorize_product(state):
    # Após enrich, preferir enriched_product (descrição nova); senão cleaned ou raw.
    product = (
        state.get("cleaned_product")
        or state.get("enriched_product")
        or state.get("raw_product")
    )

    prompt = CATEGORIZER_PROMPT.format(
        name=product.get("name", ""),
        description=product.get("description", ""),
        marca=product.get("marca", ""),
        category=product.get("category", ""),
    )

    response = await llm.ainvoke(prompt)
    category_slug = response.content.strip().lower().replace(" ", "-")

    if state.get("cleaned_product"):
        state["cleaned_product"]["category"] = category_slug
    elif state.get("enriched_product") is not None:
        state["enriched_product"]["category"] = category_slug
    else:
        state["raw_product"]["category"] = category_slug

    state["status"] = "categorized"
    return state
