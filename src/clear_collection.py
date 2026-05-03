import chromadb
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")
client = chromadb.PersistentClient(path=CHROMA_PATH)

# Deleting the collection to clear it completely
try:
    client.delete_collection("indian_stock_market_chunks")
    print("Deleted collection 'indian_stock_market_chunks'")
except Exception as e:
    print(f"Error deleting collection: {e}")

# Re-creating it
collection = client.get_or_create_collection(name="indian_stock_market_chunks")
print(f"Collection re-created. Current count: {collection.count()}")
