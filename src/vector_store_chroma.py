import chromadb
from chromadb.config import Settings

client = chromadb.Client(
    Settings(persist_directory="chroma_db")
)

collection = client.get_or_create_collection(
    name="indian_stock_market_chunks"
)

def store_embeddings(chunk_objects, vectors):
    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunk_objects):
        ids.append(f"chunk_{i}")
        documents.append(chunk["text"])
        metadatas.append({
            "page": chunk["pages"],
            "chunk_id": chunk["chunk_id"]
        })

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=vectors.tolist(),
        metadatas=metadatas
    )

    print(f"Stored {len(ids)} embeddings in ChromaDB")