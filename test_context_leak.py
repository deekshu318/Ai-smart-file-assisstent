import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_ask(question, doc_id=None):
    print(f"\nTesting with doc_id: {doc_id}")
    print(f"Question: {question}")
    payload = {
        "question": question,
        "user_id": 1,
        "document_id": doc_id
    }
    try:
        response = requests.post(f"{BASE_URL}/ask", json=payload)
        if response.status_code == 200:
            data = response.json()
            print(f"Answer: {data['answer'][:200]}...")
            print(f"Citations: {data['citations']}")
            return data
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    # 1. Test without doc_id (Should be general)
    test_ask("What is the capital of France?")
    
    # 2. Test with a dummy doc_id (Should trigger RAG, might fail if ID doesn't exist but shows logic flow)
    test_ask("Tell me about the stock market.", doc_id="some_non_existent_id")
