import requests

url = "http://127.0.0.1:8000/documents/count"
response = requests.get(url)
print(response.json())
