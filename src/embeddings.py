import os
import requests
import numpy as np
import time
from dotenv import load_dotenv

# Load env variables
load_dotenv()
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

API_URL = "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2"
headers = {"Authorization": f"Bearer {HF_TOKEN}"}

def convert_chunks_to_vectors(chunks):
    """
    Converts text chunks into vector embeddings using Hugging Face Inference API.
    """
    # Ensure chunks is a list
    if isinstance(chunks, str):
        chunks = [chunks]
        
    payload = {"inputs": chunks, "options": {"wait_for_model": True}}
    
    retries = 3
    for attempt in range(retries):
        try:
            response = requests.post(API_URL, headers=headers, json=payload, timeout=30)
            if response.status_code == 200:
                result = response.json()
                # The API can return a list or a list of lists. Standardize to numpy array.
                return np.array(result)
            else:
                print(f"Error from HF Inference API (attempt {attempt + 1}): {response.status_code} - {response.text}")
        except Exception as e:
            print(f"Connection error to HF Inference API (attempt {attempt + 1}): {e}")
        
        if attempt < retries - 1:
            time.sleep(2)
            
    raise RuntimeError("Failed to compute embeddings after multiple retries.")