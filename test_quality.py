import requests
import json

def test_query(query):
    url = "http://127.0.0.1:8000/ask"
    payload = {
        "question": query,
        "document_id": "default_doc"
    }
    try:
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            print(f"\nQuery: {query}")
            print(f"AI Response:\n{response.json()['answer']}")
            print(f"Citations: {response.json()['citations']}")
        else:
            print(f"Error: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    # Test the specific case mentioned by the user
    test_query("What contains in pdf index?")
    test_query("Summarize the table of contents")
