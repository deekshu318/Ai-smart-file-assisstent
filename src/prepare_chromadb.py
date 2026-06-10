import chromadb
from chromadb.config import Settings
import os
from extract_text import text_extraction
from embeddings import convert_chunks_to_vectors

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if os.path.exists("/data") and os.access("/data", os.W_OK):
    CHROMA_PATH = "/data/chroma_db"
else:
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

    # Store in SQL database as backup
    try:
        from api import engine
    except ImportError:
        from sqlalchemy import create_engine
        engine = create_engine(f"sqlite:///{os.path.join(BASE_DIR, 'src', 'users.db')}")

    from sqlalchemy import text
    import json
    
    try:
        with engine.begin() as conn:
            # Delete old chunks to avoid duplication
            conn.execute(text("DELETE FROM document_chunks WHERE document_id = :did"), {"did": document_id})
            
            # Batch insert chunks
            for i, chunk in enumerate(chunk_objects):
                cid = f"chunk_{document_id}_{i}"
                embedding_json = json.dumps(vectors[i].tolist())
                conn.execute(
                    text("""
                        INSERT INTO document_chunks (id, document_id, text_content, page_number, chunk_id, embedding)
                        VALUES (:id, :did, :txt, :page, :cid, :emb)
                    """),
                    {
                        "id": cid,
                        "did": document_id,
                        "txt": chunk["text"],
                        "page": chunk["pages"],
                        "cid": chunk["chunk_id"],
                        "emb": embedding_json
                    }
                )
        print(f"Stored {len(chunk_objects)} backup chunks in SQL database for doc {document_id}")
    except Exception as sqle:
        print(f"SQL backup failed for document {document_id}: {sqle}")

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