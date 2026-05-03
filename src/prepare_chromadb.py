import chromadb
from chromadb.config import Settings
import os
from extract_text import text_extraction
from embeddings import convert_chunks_to_vectors

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CHROMA_PATH = os.path.join(BASE_DIR, "chroma_db")

# Use PersistentClient for proper persistence
client = chromadb.PersistentClient(path=CHROMA_PATH)

collection = client.get_or_create_collection(
    name="indian_stock_market_chunks"
)

def store_embeddings(chunk_objects, vectors, document_id):
    ids = []
    documents = []
    metadatas = []

    for i, chunk in enumerate(chunk_objects):
        ids.append(f"chunk_{document_id}_{i}")
        documents.append(chunk["text"])
        metadatas.append({
            "page": chunk["pages"],
            "chunk_id": chunk["chunk_id"],
            "document_id": document_id
        })

    collection.add(
        ids=ids,
        documents=documents,
        embeddings=vectors.tolist(),
        metadatas=metadatas
    )

    print(f"Stored {len(ids)} embeddings in ChromaDB for doc {document_id}")

def process_and_store_document(file_path, document_id):
    """Extract text from a file, generate embeddings, and store in ChromaDB."""
    print(f"Extracting text from {file_path}...")
    chunks = text_extraction(file_path)
    
    if not chunks:
        print("No text extracted.")
        return False
        
    print(f"Extracted {len(chunks)} chunks")
    
    # Extract just the text for embedding
    chunk_texts = [chunk["text"] for chunk in chunks]
    
    # Convert to embeddings
    print("Generating embeddings...")
    vectors = convert_chunks_to_vectors(chunk_texts)
    print(f"Created {len(vectors)} embeddings")
    
    # Store in ChromaDB
    store_embeddings(chunks, vectors, document_id)
    return True

if __name__ == "__main__":
    # Test with default document for legacy support
    pdf_path = os.path.join(BASE_DIR, "data", "indian stock market.pdf")
    process_and_store_document(pdf_path, "default_doc")