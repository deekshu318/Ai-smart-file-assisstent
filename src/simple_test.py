#!/usr/bin/env python
import sys
print("Starting test...", flush=True)

try:
    from semantic_search import semantic_search
    print("Import successful", flush=True)
    
    query = "How does the Indian stock market work?"
    print(f"Searching for: {query}", flush=True)
    
    results = semantic_search(query, top_k=3)
    print(f"Search complete. Got {len(results['documents'][0])} results", flush=True)
    
    if results["documents"] and len(results["documents"][0]) > 0:
        for i, doc in enumerate(results["documents"][0]):
            print(f"\n=== Result {i+1} ===", flush=True)
            print(f"Page: {results['metadatas'][0][i]['page']}", flush=True)
            print(f"Text (first 300 chars): {doc[:300]}", flush=True)
    else:
        print("No results found", flush=True)
        
except Exception as e:
    print(f"ERROR: {e}", flush=True)
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("Test complete!", flush=True)
