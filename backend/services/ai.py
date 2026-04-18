# backend/services/ai.py
import httpx
import json
import asyncio
from config import Config

SYSTEM_PROMPT = """Eres un analizador de prompts. Analiza el siguiente prompt y devuelve un JSON con:
- "title": título corto en inglés
- "description": descripción breve en español
- "category": una de: IMAGEN, VIDEO, TEXTO, AUDIO
- "subcategory": subcategoría específica
- "tags": array de tags relevantes
- "metadata": objeto con campos específicos según la categoría

Categorías:
- IMAGEN: "fotografia", "ilustracion", "diseno", "arte", "icono", "logo", "banner"
- VIDEO: "animacion", "motion", "efectos", "edicion"
- TEXTO: "redaccion", "resumen", "traduccion", "codigo", "creativo"
- AUDIO: "musica", "mezcla", "efectos_sonido"
"""


async def analyze_prompt_async(content: str) -> dict:
    if not Config.OPENROUTER_API_KEY:
        raise Exception("OPENROUTER_API_KEY not configured")

    headers = {
        "Authorization": f"Bearer {Config.OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": Config.OPENROUTER_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": content}
        ],
        "max_tokens": 1000
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            timeout=60.0
        )

    if response.status_code != 200:
        raise Exception(f"OpenRouter error: {response.text}")

    data = response.json()
    response_content = data["choices"][0]["message"]["content"]

    # Try to extract JSON
    try:
        if "```json" in response_content:
            response_content = response_content.split("```json")[1].split("```")[0]
        elif "```" in response_content:
            response_content = response_content.split("```")[1].split("```")[0]

        return json.loads(response_content.strip())
    except:
        return {
            "title": "Analyzed Prompt",
            "description": response_content[:200],
            "category": "TEXTO",
            "subcategory": "redaccion",
            "tags": [],
            "metadata": {}
        }


def analyze_prompt_sync(content: str) -> dict:
    """Synchronous wrapper for Flask"""
    return asyncio.run(analyze_prompt_async(content))