import fitz
import os

pdf_path = "data/indian stock market.pdf"
if os.path.exists(pdf_path):
    doc = fitz.open(pdf_path)
    for i in range(min(10, len(doc))):
        print(f"--- Page {i+1} ---")
        print(doc[i].get_text("text")[:500])
        print("\n")
else:
    print(f"File not found: {pdf_path}")
