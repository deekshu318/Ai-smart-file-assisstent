import re

from typing import List, Dict, Any, Set

DOMAIN_SYNONYMS: Dict[str, List[str]] = {
    "stock": ["stock", "stocks", "equity", "share", "shares", "securities"],
    "market": ["market", "exchange", "trading", "bourse", "marketing"],
    "invest": ["invest", "investing", "investment", "investor", "investors"],
    "strategy": ["strategy", "strategies", "suggestions", "finding", "findings", "approach", "plan"],
    "requirement": ["requirement", "requirements", "need", "needs", "necessary", "basics", "process"],
    "history": ["history", "histroy", "origin", "founded", "background", "past", "history of"],
    "index": ["index", "contents", "table of contents", "toc", "chapters", "topics list"],
}

def normalize(text):
    text = text.lower()
    text = re.sub(r"[^a-z0-9\s]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def expand_question_words(question):
    words = normalize(question).split()
    expanded = set(words)

    for word in words:
        if word in DOMAIN_SYNONYMS:
            expanded.update(DOMAIN_SYNONYMS[word])

    return expanded


def retrieve_relevant_chunks(chunks, question, top_k=5):
    """
    Retrieves the most relevant chunks based on keyword matching and scoring.
    """
    q_words = expand_question_words(question)
    scored_chunks: List[Dict[str, Any]] = []

    for chunk in chunks:
        text = normalize(chunk["text"])
        # Score based on unique word matches
        unique_matches = [w for w in q_words if w in text]
        score = len(unique_matches)

        if score > 0:
            scored_chunks.append({
                "score": score,
                "chunk": chunk,
            })

    # Sort by score descending
    scored_chunks.sort(key=lambda x: x["score"], reverse=True)

    if not scored_chunks:
        # Fallback to first chunks if nothing matched (optionally log this)
        return chunks[:top_k]

    # Return the actual chunk objects
    return [item["chunk"] for item in scored_chunks[:top_k]]

def get_best_chunk(chunks, question):
    """
    Explicitly retrieves only the single best matching chunk.
    """
    results = retrieve_relevant_chunks(chunks, question, top_k=1)
    if results:
        return results[0]
    return None
