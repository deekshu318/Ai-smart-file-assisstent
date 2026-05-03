from extract_text import text_extraction
from embeddings import convert_chunks_to_vectors
 
chunk_objects = text_extraction("data/indian stock market.pdf")

print("Total chunk objects:", len(chunk_objects))

 
chunk_texts = [chunk["text"] for chunk in chunk_objects]

print("Text chunks:", len(chunk_texts))
print("Sample chunk:\n", chunk_texts[0][:200])

vectors = convert_chunks_to_vectors(chunk_texts)

print("Vector shape:", vectors.shape)