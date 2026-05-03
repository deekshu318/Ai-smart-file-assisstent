import os
import sys
from dotenv import load_dotenv
from openai import OpenAI
from semantic_search import semantic_search

load_dotenv()
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

# Initialize OpenAI client pointing to Hugging Face Router
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)

MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

def get_ai_answer(question, search_results):
    if not search_results["documents"] or len(search_results["documents"][0]) == 0:
        return "Sorry, I couldn't find any information about that in the document."

    # Join the context pieces
    context = "\n\n".join([
        f"(Page {search_results['metadatas'][0][i]['page']}) {doc}" 
        for i, doc in enumerate(search_results["documents"][0])
    ])

    messages = [
        {"role": "system", "content": "You are a helpful assistant. Use the provided context to answer the question clearly. Cite page numbers at the end."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL_ID,
            messages=messages,
            max_tokens=600,
            temperature=0.1
        )
        return completion.choices[0].message.content.strip()
    except Exception as e:
        return f"Error calling AI: {e}"

if __name__ == "__main__":
    query = input("\nEnter your query: ")
    if not query.strip():
        sys.exit()

    print("\nPerforming hybrid search...")
    results = semantic_search(query, top_k=5)
    
    print(f"Results received. Number of documents: {len(results['documents'][0]) if results['documents'] else 0}")

    # Display minimal search info
    for i, doc in enumerate(results["documents"][0]):
        meta = results["metadatas"][0][i]
        score = results["keyword_scores"][0][i] if "keyword_scores" in results else 0
        print(f"  - Match found on Page {meta['page']} (Keyword Relevance: {score})")

    print("\nThinking...")
    answer = get_ai_answer(query, results)
    
    print("\n" + "="*20 + " AI ANSWER " + "="*20)
    print(f"\n{answer}")
    print("\n" + "="*51 + "\n")