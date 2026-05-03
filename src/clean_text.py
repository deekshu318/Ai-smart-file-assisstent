import re

def clean_text(text : str) -> str:
    if not isinstance(text, str):
        return ""
    
    # Preserve newlines but normalize spacing
    text = text.replace("\t"," ")
    
    # Strip repetitive headers (e.g., "A Study of Indian Stock Market Page 9")
    text = re.sub(r"A\s+Study\s+of\s+Indian.*?Page\s+\d+", "", text, flags=re.IGNORECASE)
    
    # Remove non-ASCII
    text = re.sub(r"[^\x00-\x7F]+", " ", text)
    
    # Normalize excessive newlines and whitespace
    text = re.sub(r" [ ]+", " ", text)
    text = re.sub(r"\n\s+", "\n", text)
    text = re.sub(r"\n+", "\n", text)
    
    text = text.strip()
    return text