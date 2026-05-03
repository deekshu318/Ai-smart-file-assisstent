import os
import sys
from dotenv import load_dotenv
from openai import OpenAI
from semantic_search import semantic_search

load_dotenv()
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)

MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

def get_answer(question):
    # Use our improved hybrid search
    results = semantic_search(question, top_k=5)
    
    if not results["documents"] or len(results["documents"][0]) == 0:
        return "Sorry, I couldn't find any information about that in the document."

    # Join the context pieces
    context = "\n\n".join([
        f"(Page {results['metadatas'][0][i]['page']}) {doc}" 
        for i, doc in enumerate(results["documents"][0])
    ])

    messages = [
        {"role": "system", "content": "You are a helpful assistant. You MUST ONLY use the provided context to answer the question. If the answer is not in the context, say 'content is not present in pdf'. If it is, provide a clear, accurate answer with helpful explanations based ONLY on the document. Cite page numbers at the end."},
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
    query = input("\nWhat would you like to know about the stock market? ")
    if not query.strip():
        sys.exit()

    print("\nThinking...")
    answer = get_answer(query)
    
    print("\n" + "="*20 + " ANSWER " + "="*20)
    print(f"\n{answer}")
    print("\n" + "="*48 + "\n")
