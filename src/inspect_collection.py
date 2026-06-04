import chromadb
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists("/data") and os.access("/data", os.W_OK):
    CHROMA_PATH = "/data/chroma_db"
else:
    CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")
client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = client.get_or_create_collection(name="indian_stock_market_chunks")

print(f"Total items in collection: {collection.count()}")

# Get some sample IDs and metadatas
results = collection.get(limit=100)
ids = results['ids']
metadatas = results['metadatas']

counts = {}
for meta in metadatas:
    doc_id = meta.get('document_id', 'unknown')
    page = meta.get('page', 'unknown')
    key = f"{doc_id}_page_{page}"
    counts[key] = counts.get(key, 0) + 1

# Sort and print counts
sorted_counts = sorted(counts.items(), key=lambda x: x[1], reverse=True)
print("\nTop pages by chunk count:")
for key, count in sorted_counts[:20]:
    print(f"{key}: {count} chunks")
