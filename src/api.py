import os
import time
import sqlite3
from sqlalchemy import create_engine, text
from fastapi import FastAPI, HTTPException, Body, Request, UploadFile, File, Form
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from openai import OpenAI
from passlib.context import CryptContext
from semantic_search import semantic_search
from prepare_chromadb import process_and_store_document
import shutil
from youtube_processor import process_youtube_link
from website_processor import process_website_link

# Password hashing configuration
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")

# Database Initialization
DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

# SQLAlchemy Setup for Concurrency
engine = create_engine(
    f"sqlite:///{DB_PATH}", 
    connect_args={"check_same_thread": False, "timeout": 15},
    pool_size=10, 
    max_overflow=20
)

def init_db():
    with engine.begin() as conn:
        # Enable Write-Ahead Logging (WAL) mode for better SQLite concurrency in production
        conn.execute(text("PRAGMA journal_mode=WAL;"))
        # Users table
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                full_name TEXT NOT NULL,
                username TEXT UNIQUE NOT NULL,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL
            )
        '''))
        
        # Add avatar column dynamically if it doesn't exist
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN avatar TEXT"))
        except Exception:
            pass
        
        # Conversations table
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                document_id TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        '''))
        
        # Messages table
        conn.execute(text('''
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                citations TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations (id)
            )
        '''))

init_db()

from pathlib import Path
current_dir = Path(__file__).parent
load_dotenv(dotenv_path=current_dir / ".env")
if not os.getenv("HUGGINGFACE_API_TOKEN"):
    load_dotenv()
HF_TOKEN = os.getenv("HUGGINGFACE_API_TOKEN")

# Initialize FastAPI app
app = FastAPI(title="AI Smart-File API")

# Simple memory-based query cache
class QueryCache:
    def __init__(self):
        self.cache = {}

    def get(self, query):
        normalized_query = query.strip().lower()
        return self.cache.get(normalized_query)

    def set(self, query, response):
        normalized_query = query.strip().lower()
        self.cache[normalized_query] = response

query_cache = QueryCache()

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client for HF Router
client = OpenAI(
    base_url="https://router.huggingface.co/v1",
    api_key=HF_TOKEN
)

MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"

from typing import Optional, List

class QuestionRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None
    user_id: Optional[int] = None
    document_id: Optional[str] = None

class AnswerResponse(BaseModel):
    answer: str
    citations: List[int]
    conversation_id: Optional[str] = None
    cached: bool = False

class RegisterRequest(BaseModel):
    full_name: str
    username: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ProfileUpdateRequest(BaseModel):
    user_id: int
    full_name: str
    username: str
    avatar: Optional[str] = None

class ConversationCreate(BaseModel):
    user_id: int
    title: str = "New Conversation"
    document_id: Optional[str] = None

class YoutubeRequest(BaseModel):
    url: str

class WebsiteRequest(BaseModel):
    url: str

@app.post("/register")
async def register(request: RegisterRequest):
    if not request.username or not request.password:
        raise HTTPException(status_code=400, detail="Username and password are required")
    hashed_password = pwd_context.hash(request.password)
    try:
        with engine.begin() as conn:
            conn.execute(text("INSERT INTO users (full_name, username, email, hashed_password) VALUES (:fn, :un, :em, :hp)"), 
                           {"fn": request.full_name, "un": request.username, "em": request.email, "hp": hashed_password})
        return {"status": "success", "message": "User registered successfully"}
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Username or email already exists")
        print(f"Registration error: {e}")
        raise HTTPException(status_code=500, detail="Database error during registration")

@app.post("/login")
async def login(request: LoginRequest):
    with engine.connect() as conn:
        result_proxy = conn.execute(text("SELECT id, full_name, username, email, hashed_password, avatar FROM users WHERE email = :em"), 
                       {"em": request.email})
        result = result_proxy.fetchone()

    if result and pwd_context.verify(request.password, result[4]):
        return {
            "status": "success", 
            "user": {
                "id": result[0],
                "full_name": result[1],
                "name": result[2], 
                "email": result[3], 
                "avatar": result[5] if result[5] else result[1][0].upper()
            }
        }
    raise HTTPException(status_code=401, detail="Invalid email or password")

@app.post("/logout")
async def logout():
    return {"status": "success"}

@app.post("/profile/update")
async def update_profile(request: ProfileUpdateRequest):
    try:
        with engine.begin() as conn:
            conn.execute(
                text("UPDATE users SET full_name = :fn, username = :un, avatar = :av WHERE id = :uid"),
                {"fn": request.full_name, "un": request.username, "av": request.avatar, "uid": request.user_id}
            )
        # Fetch the updated user record
        with engine.connect() as conn:
            result_proxy = conn.execute(
                text("SELECT id, full_name, username, email, avatar FROM users WHERE id = :uid"),
                {"uid": request.user_id}
            )
            result = result_proxy.fetchone()
        
        if result:
            return {
                "status": "success",
                "user": {
                    "id": result[0],
                    "full_name": result[1],
                    "name": result[2],
                    "email": result[3],
                    "avatar": result[4] if result[4] else result[1][0].upper()
                }
            }
        raise HTTPException(status_code=404, detail="User not found")
    except Exception as e:
        if "UNIQUE constraint failed" in str(e):
            raise HTTPException(status_code=400, detail="Username already exists")
        print(f"Profile update error: {e}")
        raise HTTPException(status_code=500, detail="Database error during profile update")


# --- File Upload Endpoints ---
UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "uploads")
if not os.path.exists(UPLOAD_DIR):
    os.makedirs(UPLOAD_DIR)

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Check file extension
        ext = os.path.splitext(file.filename)[1].lower()
        supported_exts = ['.pdf', '.txt', '.docx', '.pptx']
        if ext not in supported_exts:
            raise HTTPException(status_code=400, detail=f"Unsupported file format: {ext}. Supported formats are: {', '.join(supported_exts)}")

        timestamp = int(time.time())
        safe_filename = "".join([c for c in file.filename if c.isalpha() or c.isdigit() or c in [' ', '.', '_', '-']]).rstrip()
        unique_filename = f"{timestamp}_{safe_filename.replace(' ', '_')}"
        file_path = os.path.join(UPLOAD_DIR, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        document_id = f"doc_{timestamp}_{safe_filename.replace(' ', '_')}"
        
        success = process_and_store_document(file_path, document_id)
        if not success:
            raise HTTPException(status_code=500, detail=f"Failed to extract text from {file.filename}. The file might be empty, password-protected, or corrupted.")
            
        return {"status": "success", "document_id": document_id, "filename": file.filename}
    except HTTPException as he:
        raise he
    except Exception as e:
        print(f"Upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@app.post("/youtube")
async def add_youtube_source(request: YoutubeRequest):
    url = request.url
    if not url:
        raise HTTPException(status_code=400, detail="YouTube URL is required")
    
    try:
        result = process_youtube_link(url)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to process YouTube link. Make sure the video has captions enabled.")
        
        return {
            "status": "success", 
            "document_id": result["document_id"], 
            "title": result["title"],
            "filename": result["title"]
        }
    except Exception as e:
        print(f"YouTube processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/test-ytdlp")
async def test_ytdlp(url: str, client: str = None):
    import traceback
    from youtube_processor import YoutubeTranscriptError
    try:
        from youtube_processor import get_transcript_via_ytdlp_json3
        player_client = None
        if client:
            player_client = client.split(",")
        res = get_transcript_via_ytdlp_json3(url, player_client=player_client)
        if res:
            return {"status": "success", "length": len(res), "sample": [{"start": r.start, "text": r.text} for r in res[:5]]}
        return {"status": "failed", "reason": "Returned None"}
    except YoutubeTranscriptError as yte:
        tb = traceback.format_exc()
        return {"status": "error", "message": str(yte), "logs": yte.logs, "traceback": tb}
    except Exception as e:
        tb = traceback.format_exc()
        return {"status": "error", "message": str(e), "traceback": tb}

@app.post("/website")
async def add_website_source(request: WebsiteRequest):
    url = request.url
    if not url:
        raise HTTPException(status_code=400, detail="Website URL is required")
    
    try:
        result = process_website_link(url)
        if not result:
            raise HTTPException(status_code=500, detail="Failed to process Website link. Make sure the site is accessible and allows scraping.")
        
        return {
            "status": "success", 
            "document_id": result["document_id"], 
            "title": result["title"],
            "filename": result["title"]
        }
    except Exception as e:
        print(f"Website processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/documents/count")
async def get_documents_count():
    from semantic_search import collection
    # In ChromaDB, we can't easily get unique metadatas without getting all items
    # But we can try to get all metadatas and find unique document_ids
    results = collection.get(include=["metadatas"])
    if not results or not results["metadatas"]:
        return {"count": 0}
    
    unique_docs = set()
    for meta in results["metadatas"]:
        if "document_id" in meta:
            unique_docs.add(meta["document_id"])
    
    return {"count": len(unique_docs)}

@app.get("/documents")
async def get_all_documents():
    from semantic_search import collection
    results = collection.get(include=["metadatas"])
    if not results or not results["metadatas"]:
        return []
    
    docs_map = {}
    for meta in results["metadatas"]:
        doc_id = meta.get("document_id")
        if not doc_id:
            continue
            
        if doc_id not in docs_map:
            # Infer details from doc_id
            name = doc_id
            doc_type = "document"
            created_at = None
            
            if doc_id.startswith("doc_"):
                parts = doc_id.split("_", 2)
                if len(parts) >= 3:
                    try:
                        timestamp = int(parts[1])
                        created_at = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
                    except ValueError:
                        pass
                    name = parts[2].replace("_", " ")
                doc_type = "document"
            elif doc_id.startswith("web_"):
                parts = doc_id.split("_", 2)
                if len(parts) >= 3:
                    try:
                        timestamp = int(parts[1])
                        created_at = time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(timestamp))
                    except ValueError:
                        pass
                    name = parts[2].replace("_", " ")
                doc_type = "website"
            elif doc_id.startswith("yt_"):
                # YouTube video
                video_id = doc_id[3:]
                name = f"YouTube Video ({video_id})"
                doc_type = "youtube"
            elif doc_id == "default_doc":
                name = "Indian Stock Market.pdf"
                doc_type = "document"
                created_at = "System Default"
            
            docs_map[doc_id] = {
                "id": doc_id,
                "name": name,
                "type": doc_type,
                "chunks_count": 0,
                "created_at": created_at or "Unknown"
            }
        
        docs_map[doc_id]["chunks_count"] += 1
    
    return list(docs_map.values())

@app.get("/documents/{document_id}/preview")
async def preview_document(document_id: str):
    from semantic_search import collection
    results = collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"]
    )
    if not results or not results["documents"]:
        raise HTTPException(status_code=404, detail="Document content not found")
    
    sorted_chunks = []
    for i in range(len(results["documents"])):
        doc_text = results["documents"][i]
        meta = results["metadatas"][i]
        sorted_chunks.append({
            "text": doc_text,
            "page": meta.get("page", 1),
            "chunk_id": meta.get("chunk_id", i)
        })
    
    sorted_chunks.sort(key=lambda x: (x["page"], x["chunk_id"]))
    return sorted_chunks[:15]

@app.delete("/documents/{document_id}")
async def delete_document(document_id: str):
    from semantic_search import collection
    try:
        collection.delete(where={"document_id": document_id})
        with engine.begin() as conn:
            conn.execute(text("UPDATE conversations SET document_id = NULL WHERE document_id = :did"), {"did": document_id})
        return {"status": "success", "message": f"Document {document_id} deleted successfully"}
    except Exception as e:
        print(f"Error deleting document {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")

# --- Conversation Endpoints ---


@app.get("/conversations")
async def get_conversations(user_id: int = None):
    if user_id is None:
        return []

    with engine.connect() as conn:
        result_proxy = conn.execute(text("SELECT id, title, created_at, document_id FROM conversations WHERE user_id = :uid ORDER BY created_at DESC"), {"uid": user_id})
        rows = result_proxy.fetchall()
    return [{"id": r[0], "title": r[1], "created_at": r[2], "document_id": r[3]} for r in rows]

@app.post("/conversations")
async def create_conversation(req: ConversationCreate):
    conv_id = f"conv_{int(time.time() * 1000)}"
    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO conversations (id, user_id, title, document_id) VALUES (:cid, :uid, :t, :did)"), 
            {"cid": conv_id, "uid": req.user_id, "t": req.title, "did": req.document_id}
        )
    return {"id": conv_id, "title": req.title, "document_id": req.document_id}

@app.get("/conversations/{conv_id}/messages")
async def get_messages(conv_id: str):
    with engine.connect() as conn:
        result_proxy = conn.execute(text("SELECT role, content, citations, created_at FROM messages WHERE conversation_id = :cid ORDER BY created_at ASC"), {"cid": conv_id})
        rows = result_proxy.fetchall()
    import json
    return [{"role": r[0], "content": r[1], "citations": json.loads(r[2]) if r[2] else [], "created_at": r[3]} for r in rows]

@app.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    with engine.begin() as conn:
        conn.execute(text("DELETE FROM messages WHERE conversation_id = :cid"), {"cid": conv_id})
        conn.execute(text("DELETE FROM conversations WHERE id = :cid"), {"cid": conv_id})
    return {"status": "success"}

class ConversationUpdateDocument(BaseModel):
    document_id: Optional[str] = None

@app.put("/conversations/{conv_id}/document")
async def update_conversation_document(conv_id: str, req: ConversationUpdateDocument):
    with engine.begin() as conn:
        conn.execute(text("UPDATE conversations SET document_id = :did WHERE id = :cid"), {"cid": conv_id, "did": req.document_id})
    return {"status": "success"}


# --- Persistence Helper ---
def save_msg(cid, role, content, citations=None):
    import json
    with engine.begin() as conn:
        conn.execute(text("INSERT INTO messages (conversation_id, role, content, citations) VALUES (:cid, :r, :c, :cit)"),
                       {"cid": cid, "r": role, "c": content, "cit": json.dumps(citations) if citations else None})

def is_general_query(query: str) -> bool:
    q = query.strip().lower()
    
    # Clean greeting (remove non-alphanumeric and non-space characters)
    import re
    q_clean_greeting = re.sub(r'[^\w\s]', '', q).strip()
    
    # Common greetings and basic conversational queries
    greetings = {
        "hi", "hello", "hey", "howdy", "hola", "yo", "greetings",
        "good morning", "good afternoon", "good evening",
        "how are you", "how is it going", "hows it going", "what is up", "whats up",
        "who are you", "what are you", "what can you do", "help",
        "thank you", "thanks", "tq", "bye", "goodbye", "exit"
    }
    if q_clean_greeting in greetings:
        return True
        
    # Simple math: e.g. "2+3", "2 + 3", "2 * 3 - 1", "10 / 2"
    if re.match(r'^[\d\s+\-*/()=%.]+$', q) and any(op in q for op in ['+', '-', '*', '/', '=']):
        return True
    
    # Match "what is 2 + 3" or similar
    if re.match(r'^(what is|calculate|solve)\s+[\d\s+\-*/()=%.]+$', q):
        return True
        
    return False

@app.post("/ask", response_model=AnswerResponse)
async def ask_question(request: QuestionRequest):
    question = request.question
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    conv_id = request.conversation_id
    user_id = request.user_id
    doc_id = request.document_id

    # Logic: If document_id is passed in request, use it. 
    # If not passed, but conversation_id exists, check if that conversation has an attached document.
    if not doc_id and conv_id:
        with engine.connect() as conn:
            res = conn.execute(text("SELECT document_id FROM conversations WHERE id = :cid"), {"cid": conv_id}).fetchone()
            if res and res[0]:
                doc_id = res[0]

    if not conv_id and user_id:
        conv_id = f"conv_{int(time.time() * 1000)}"
        title = (question[:30] + '...') if len(question) > 30 else question
        with engine.begin() as conn:
            conn.execute(text("INSERT INTO conversations (id, user_id, title, document_id) VALUES (:cid, :uid, :t, :did)"), {"cid": conv_id, "uid": user_id, "t": title, "did": doc_id})

    # Save user message
    if conv_id:
        save_msg(conv_id, 'user', question)

    # Check cache first
    cached_response = query_cache.get(question)
    if cached_response:
        if conv_id:
            save_msg(conv_id, 'assistant', cached_response["answer"], cached_response["citations"])
        return AnswerResponse(
            answer=cached_response["answer"],
            citations=cached_response["citations"],
            conversation_id=conv_id,
            cached=True
        )

    # Check if this is a general greeting, math, or basic conversational query
    is_general = is_general_query(question)

    if is_general:
        system_prompt = (
            "You are a helpful and professional AI assistant. "
            "Answer the user's greeting, conversational query, or general knowledge/math question directly, "
            "clearly, and politely. You do not need to refer to any PDF document or context."
        )
        user_content = question
        citations = []
    else:
        # Always perform semantic search for the Indian Stock Market domain
        results = semantic_search(question, document_id=doc_id, top_k=10)
        
        # If no documents are returned (no index/data uploaded yet), we can check:
        # If there's no doc_id and database has no chunks, we can answer generally instead of failing.
        if not results["documents"] or len(results["documents"][0]) == 0:
            if not doc_id:
                # Treat as general chat if no document selected and empty database
                system_prompt = (
                    "You are a helpful and professional AI assistant. "
                    "Answer the user's query directly, clearly, and politely."
                )
                user_content = question
                citations = []
            else:
                ans = "content is not present in pdf"
                if conv_id:
                    save_msg(conv_id, 'assistant', ans)
                return AnswerResponse(answer=ans, citations=[], conversation_id=conv_id)
        else:
            # Detect if the query is specifically about document structure (TOC/Index Page)
            query_lower = question.lower()
            structure_terms = [r"\bindex page\b", r"\btable of contents\b", r"\btoc\b", r"\bchapters\b", r"\blist of topics\b"]
            import re
            is_structure_query = any(re.search(term, query_lower) for term in structure_terms)
            
            # Format context and collect citations
            context_parts = []
            has_actual_index = False
            citations = []
            for i, doc in enumerate(results["documents"][0]):
                page = results['metadatas'][0][i]['page']
                
                # Only label as primary index if it's a structure query or explicitly mentions contents
                if page == 5 and ("INDEX" in doc.upper() or "CONTENTS" in doc.upper()) and is_structure_query:
                    context_parts.append(f"--- [PRIMARY DOCUMENT INDEX / TABLE OF CONTENTS] ---\n(Page {page}) {doc}")
                    has_actual_index = True
                else:
                    context_parts.append(f"(Page {page}) {doc}")
                    
                if page not in citations:
                    citations.append(page)
            
            # If it's a structure query and we found the index, prioritize it heavily
            if is_structure_query and has_actual_index:
                # Move index chunks to the very top and maybe prune others to avoid distraction
                priority_parts = [p for p in context_parts if "[PRIMARY DOCUMENT INDEX" in p]
                other_parts = [p for p in context_parts if "[PRIMARY DOCUMENT INDEX" not in p]
                context = "\n\n".join(priority_parts + other_parts[:3]) # Limit others to avoid noise
            else:
                context = "\n\n".join(context_parts)
                
            citations.sort()
            
            if is_structure_query:
                system_prompt = (
                    "You are a professional AI assistant. The user is asking about the document's structure (Table of Contents / Index Page). "
                    "PRIORITIZE the information on Page 5 which is titled 'INDEX' and list the chapters/topics found there. "
                    "DO NOT talk about stock market indices like NIFTY 50 unless they are listed as chapters in the Table of Contents. "
                    "Be clear and precise about what each page contains according to the index."
                )
            else:
                system_prompt = (
                    "You are a professional AI assistant. Adopt a highly formal, professional, and structured tone.\n\n"
                    "If the user's question is a general query, greeting, math, programming, coding, web development, or general knowledge topic, "
                    "answer it directly and professionally using your general knowledge. Do not mention the context, the document, or any PDF.\n\n"
                    "Only if the user's question is specifically asking about the provided document context (such as asking for details, summaries, or specific facts in the context), "
                    "use the context to answer. If the context does not contain the answer to a document-specific question, respond strictly and only with: 'content is not present in pdf'."
                )
            user_content = f"Context:\n{context}\n\nQuestion: {question}"

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_content}
    ]

    retries = 3
    for attempt in range(retries):
        try:
            completion = client.chat.completions.create(
                model=MODEL_ID,
                messages=messages,
                max_tokens=1000,
                temperature=0.1
            )
            answer = completion.choices[0].message.content.strip()
            
            # Store in cache
            query_cache.set(question, {"answer": answer, "citations": citations})
            
            # Save to DB
            if conv_id:
                save_msg(conv_id, 'assistant', answer, citations)
            
            return AnswerResponse(answer=answer, citations=citations, conversation_id=conv_id, cached=False)
        except Exception as e:
            print(f"Attempt {attempt + 1} failed calling AI model: {e}")
            if attempt < retries - 1:
                time.sleep(1)
            else:
                print(f"Error calling AI model after {retries} attempts: {e}")
                raise HTTPException(status_code=500, detail="I encountered an issue processing your request.")

# Serve static files (CSS, JS, Images)
static_path = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_path):
    os.makedirs(static_path)
app.mount("/static", StaticFiles(directory=static_path), name="static")

# Setup Templates
template_path = os.path.join(os.path.dirname(__file__), "templates")
if not os.path.exists(template_path):
    os.makedirs(template_path)
templates = Jinja2Templates(directory=template_path)

@app.get("/")
async def read_index(request: Request):
    return templates.TemplateResponse(request, "index.html", {"request": request})

@app.get("/about")
async def read_about(request: Request):
    return templates.TemplateResponse(request, "about.html", {"request": request})

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
