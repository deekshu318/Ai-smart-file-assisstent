def chunk_text(text, chunk_size=300, overlap=100):
    if not isinstance(text, str) or not text.strip():
        return []
    words = text.split()
    chunks = []
    start = 0 
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start : end])
        chunks.append(chunk)
        start += chunk_size - overlap
    return chunks