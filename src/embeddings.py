from sentence_transformers import SentenceTransformer
import numpy as np

# Load the embedding model once
model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")

def convert_chunks_to_vectors(chunks):
    """
    Converts text chunks into vector embeddings.

    Args:
        chunks (List[str]): List of text chunks

    Returns:
        np.ndarray: 2D array of embeddings (num_chunks × embedding_dim)
    """

    embeddings = model.encode(
        chunks,
        show_progress_bar=True,
        convert_to_numpy=True,
        normalize_embeddings=False
    )

    return embeddings