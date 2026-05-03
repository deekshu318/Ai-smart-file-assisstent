import os
from dotenv import load_dotenv
from openai import OpenAI

from extract_text import text_extraction
from retrieve_chunks import retrieve_relevant_chunks


load_dotenv()
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)
 
MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

PDF_PATH = "data/indian stock market.pdf"

CONTENT_START_PAGE = 1  

print(" Processing PDF...")
chunks = text_extraction(PDF_PATH)

content_chunks = [c for c in chunks if c["pages"] >= CONTENT_START_PAGE]
print(f" Extracted {len(content_chunks)} content chunks")

while True:
    question = input("\nAsk a question (type 'exit' to quit): ")

    if question.lower() == "exit":
        print("Exiting.")
        break

    relevant_chunks = retrieve_relevant_chunks(content_chunks, question, top_k=5)
    
    if not relevant_chunks:
        print("No relevant information found in the document.")
        continue

    context = "\n\n".join(
        f"(Page {c['pages']}) {c['text']}" for c in relevant_chunks
    )

    messages = [
        {"role": "system", "content": "You are a helpful document assistant. Answer using the provided context. Cite page numbers."},
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"}
    ]

    try:
        completion = client.chat.completions.create(
            model=MODEL_ID,
            messages=messages,
            max_tokens=500,
            temperature=0.1
        )
        print("\n--- AI Answer ---\n")
        print(completion.choices[0].message.content.strip())
    except Exception as e:
        print(f"\n Error calling API: {e}")
        print("Please ensure your token has 'Inference' permissions enabled.")
