import fitz
from clean_text import clean_text
from chunk_text import chunk_text

pdf_path = "data/indian stock market.pdf"
doc = fitz.open(pdf_path)
page_5 = doc[4] # Index 4 is Page 5
text = page_5.get_text("text")
cleaned = clean_text(text)
chunks = chunk_text(cleaned)

print(f"Page 5 chunks: {len(chunks)}")
for i, c in enumerate(chunks):
    print(f"Chunk {i}: {c[:200]}")
