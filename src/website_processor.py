import requests
from bs4 import BeautifulSoup
import os
import time
from prepare_chromadb import store_embeddings
from embeddings import convert_chunks_to_vectors

def extract_text_from_url(url):
    """Fetch a webpage and extract clean, readable text."""
    try:
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Get the title
        title = soup.title.string if soup.title else "Untitled Website"
        title = title.strip()

        # Remove unwanted elements
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "form"]):
            element.decompose()

        # Extract text
        text = soup.get_text(separator='\n', strip=True)
        
        return {
            "title": title,
            "text": text
        }
    except Exception as e:
        print(f"Error scraping website {url}: {e}")
        return None

def process_website_link(url, document_id=None):
    """Scrape website, chunk text, embed, and store in ChromaDB."""
    print(f"Processing Website link: {url}")
    
    scraped_data = extract_text_from_url(url)
    if not scraped_data:
        return None
    
    title = scraped_data["title"]
    full_text = scraped_data["text"]
    
    if not document_id:
        timestamp = int(time.time())
        safe_title = "".join([c for c in title if c.isalnum() or c in [' ', '_', '-']]).strip().replace(' ', '_')
        document_id = f"web_{timestamp}_{safe_title[:30]}"
        
    # Split text into chunks of ~1000 characters
    chunk_size = 1000
    paragraphs = full_text.split('\n')
    chunks = []
    current_chunk = ""
    
    for para in paragraphs:
        if len(current_chunk) + len(para) > chunk_size:
            if current_chunk:
                chunks.append({
                    "text": current_chunk.strip(),
                    "pages": 1, # Website doesn't have pages, use 1
                    "chunk_id": len(chunks)
                })
            current_chunk = para
        else:
            current_chunk += "\n" + para
            
    if current_chunk:
        chunks.append({
            "text": current_chunk.strip(),
            "pages": 1,
            "chunk_id": len(chunks)
        })
        
    if not chunks:
        print("No content extracted from website.")
        return None
        
    print(f"Extracted {len(chunks)} chunks from website")
    
    # Extract just the text for embedding
    chunk_texts = [chunk["text"] for chunk in chunks]
    
    # Convert to embeddings
    print("Generating embeddings for website...")
    vectors = convert_chunks_to_vectors(chunk_texts)
    
    # Store in ChromaDB
    store_embeddings(chunks, vectors, document_id)
    
    return {
        "document_id": document_id,
        "title": title,
        "chunks_count": len(chunks)
    }

if __name__ == "__main__":
    # Test
    test_url = "https://www.geeksforgeeks.org/bootstrap/what-is-bootstrap/"
    result = process_website_link(test_url)
    print(f"Result: {result}")
