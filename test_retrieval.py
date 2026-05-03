from semantic_search import semantic_search

query = "SR.NO. CONTENTS PAGE NO"
results = semantic_search(query, top_k=5)
print(f"Results for '{query}':")
for i, doc in enumerate(results["documents"][0]):
    print(f"Page: {results['metadatas'][0][i].get('page')}")
    print(f"Content: {doc[:200]}...")
    print("---")

query = "INDEX CONTENTS PAGE"
results = semantic_search(query, top_k=5)
print(f"\nResults for '{query}':")
for i, doc in enumerate(results["documents"][0]):
    print(f"Page: {results['metadatas'][0][i].get('page')}")
    print(f"Content: {doc[:200]}...")
    print("---")
