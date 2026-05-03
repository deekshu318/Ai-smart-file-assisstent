import requests
import json

url = "http://127.0.0.1:8000/ask"
payload = {
    "question": "What is the secret code?",
    "document_id": "doc_1777808608_test_doc.txt"
}
headers = {
    "Content-Type": "application/json"
}

response = requests.post(url, data=json.dumps(payload), headers=headers)
print(response.json())
