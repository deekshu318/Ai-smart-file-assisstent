import chromadb
import os
from retrieve_chunks import expand_question_words, normalize
from embeddings import convert_chunks_to_vectors

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(
    name="indian_stock_market_chunks"
)

def semantic_search(query, document_id=None, top_k=5):
    """
    Performs a hybrid-aware semantic search.
    It uses vector similarity but boosts results that match key keywords.
    Optionally filters by document_id.
    """
    query_vector = convert_chunks_to_vectors([query])
    # Get keywords including synonyms
    q_words = expand_question_words(query)

    # Vector search: get more results than top_k to allow for boosting
    query_kwargs = {
        "query_embeddings": query_vector.tolist(),
        "n_results": min(top_k * 3, 30)
    }
    
    if document_id:
        query_kwargs["where"] = {"document_id": document_id}

    results = collection.query(**query_kwargs)

    hybrid_results = []
    if results["documents"]:
        for i, doc in enumerate(results["documents"][0]):
            text = normalize(doc)
            keyword_score = sum(1 for w in q_words if w in text)
            
            
            distance = results["distances"][0][i]
            
            # Additional boost for document structure triggers
            struct_boost = 0
            query_lower = query.lower()
            text_lower = text.lower()
            if any(term in query_lower for term in ["index page", "contents", "toc", "table of contents", "chapters"]):
                if any(term in text_lower for term in ["index", "contents", "sr.no", "page no", "sr no"]):
                    struct_boost = 0.4  # Stronger boost
                    # Even stronger if it's at the very beginning
                    if text_lower.startswith("index") or text_lower.startswith("contents"):
                        struct_boost = 0.6
            
            boosted_distance = distance - (keyword_score * 0.05) - struct_boost
            
            hybrid_results.append({
                "document": doc,
                "metadata": results["metadatas"][0][i],
                "distance": boosted_distance,
                "original_distance": distance,
                "keyword_score": keyword_score
            })

    
    hybrid_results.sort(key=lambda x: x["distance"])
    final_top = hybrid_results[:top_k]
    
    return {
        "documents": [[res["document"] for res in final_top]],
        "metadatas": [[res["metadata"] for res in final_top]],
        "distances": [[res["distance"] for res in final_top]],
        "keyword_scores": [[res["keyword_score"] for res in final_top]]
    }