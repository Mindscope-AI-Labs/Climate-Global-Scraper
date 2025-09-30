import os
import re
import json
import uuid
import hashlib
import threading
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

import httpx
import chromadb
from dotenv import load_dotenv
from fastapi import FastAPI, Request, HTTPException, BackgroundTasks
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl, Field
from more_itertools import batched

# LangChain, Crawl4AI, and other AI tool imports
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.extraction_strategy import LLMExtractionStrategy
from crawl4ai import CacheMode, LLMConfig
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from pydantic import BaseModel as LangChainBaseModel, Field as LangChainField
from langchain_core.output_parsers import PydanticOutputParser
from chromadb.utils import embedding_functions

# --- Load Environment Variables ---
load_dotenv()
JINA_API_KEY = os.getenv("JINA_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
SERPER_API_KEY = os.getenv("SERPER_API_KEY")

# --- FastAPI App Setup ---
app = FastAPI(title="OpenCurrent", version="3.3.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- History & Knowledge Base Management ---
HISTORY_FILE = Path("history.json")
KNOWLEDGE_BASE_FILE = Path("knowledge_base.json")
history_lock = threading.Lock()
kb_lock = threading.Lock()

def load_history() -> Dict[str, List]:
    with history_lock:
        if not HISTORY_FILE.exists():
            return {"searches": [], "chats": []}
        try:
            with open(HISTORY_FILE, "r") as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return {"searches": [], "chats": []}

def save_history(data: Dict[str, List]):
    with history_lock:
        with open(HISTORY_FILE, "w") as f:
            json.dump(data, f, indent=2)

class KnowledgeBaseEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    link: HttpUrl
    summary: str
    saved_at: datetime = Field(default_factory=datetime.now)
    subject_name: Optional[str] = None
    publication_date: Optional[str] = None
    location: Optional[str] = None
    emails: Optional[List[str]] = None
    organizations: Optional[List[str]] = None
    funds_money_investments: Optional[List[str]] = None
    projects_activities: Optional[List[str]] = None
    locations_mentioned: Optional[List[str]] = None

def load_knowledge_base() -> List[KnowledgeBaseEntry]:
    with kb_lock:
        if not KNOWLEDGE_BASE_FILE.exists():
            return []
        try:
            with open(KNOWLEDGE_BASE_FILE, "r") as f:
                data = json.load(f)
                return [KnowledgeBaseEntry(**item) for item in data]
        except (json.JSONDecodeError, FileNotFoundError, TypeError):
            return []

def save_knowledge_base(entries: List[KnowledgeBaseEntry]):
    with kb_lock:
        # Convert Pydantic models to dictionaries for JSON serialization
        dict_entries = [entry.dict() for entry in entries]
        with open(KNOWLEDGE_BASE_FILE, "w") as f:
            json.dump(dict_entries, f, indent=2, default=str) # Use default=str for datetimes


def url_to_collection_name(url: str) -> str:
    # Ensure collection names are valid (alphanumeric, hyphens, underscores)
    safe_url = re.sub(r'[^a-zA-Z0-9_-]', '', url)
    return hashlib.sha256(safe_url.encode('utf-8')).hexdigest()

# --- ChromaDB & RAG Setup ---
CHROMA_DB_DIR = "./chroma_db"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)

# --- LangChain Models & Chains ---
rag_llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1, api_key=GROQ_API_KEY)
rag_prompt_template = """
You are an expert assistant. Answer the user's question based ONLY on the following context.
If the information is not in the context, say "I cannot answer that based on the provided website content."

CONTEXT:
{context}

QUESTION:
{question}
"""
rag_prompt = ChatPromptTemplate.from_template(rag_prompt_template)
rag_chain = rag_prompt | rag_llm | StrOutputParser()

class ContactInfo(LangChainBaseModel):
    emails: Optional[List[str]] = LangChainField(default=[], description="List of extracted email addresses.")
    organizations: Optional[List[str]] = LangChainField(default=[], description="List of mentioned organizations, companies, or NGOs.")

class PageSummary(LangChainBaseModel):
    subject_name: str = LangChainField(description="The primary name of the company, organization, or place this article is about.")
    summary: str = LangChainField(description="A concise, neutral summary of the article's main points in 3-4 sentences, making sure to mention the subject's name.")
    publication_date: Optional[str] = LangChainField(default="Not found", description="The publication date of the article (e.g., 'August 15, 2024').")
    location: Optional[str] = LangChainField(default="Not specified", description="The primary city, country, or physical address mentioned.")
    contacts: ContactInfo = LangChainField(description="Extracted contact information.")
    funds_money_investments: Optional[List[str]] = LangChainField(default=[], description="List of mentioned funds, money amounts, investments, or financial information.")
    projects_activities: Optional[List[str]] = LangChainField(default=[], description="List of mentioned projects, activities, initiatives, or programs.")
    locations: Optional[List[str]] = LangChainField(default=[], description="List of mentioned locations, cities, countries, or geographic areas.")

summarization_llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=GROQ_API_KEY)
summarization_parser = PydanticOutputParser(pydantic_object=PageSummary)
summarization_prompt_template = """
You are a meticulous information extraction expert. Analyze the following web page content and extract the requested information.
- First, identify the primary subject (the company, organization, or place name) the page is about.
- Then, write a concise summary that includes this subject's name.
- Extract any mention of Funds/Money/Investments.
- Extract any mention of Projects/Activities.
- Extract any mention of Locations (cities, countries, specific addresses).
- Extract any mention of Organizations (companies, NGOs, institutions).
- Extract any email addresses.
- Extract the publication date.
- Extract a single primary location.

Follow the formatting instructions precisely.

{format_instructions}

PAGE CONTENT:
---
{page_content}
---
"""
summarization_prompt = ChatPromptTemplate.from_template(
    template=summarization_prompt_template,
    partial_variables={"format_instructions": summarization_parser.get_format_instructions()},
)
summarization_chain = summarization_prompt | summarization_llm | summarization_parser

# --- Utility & Background Task Functions ---
def smart_chunk_markdown(markdown: str, max_len: int = 800) -> List[str]:
    chunks = re.split(r'(^# .+|^## .+|^### .+)', markdown, flags=re.MULTILINE)
    processed_chunks = []
    i = 0
    while i < len(chunks):
        if i + 1 < len(chunks) and re.match(r'(^# .+|^## .+|^### .+)', chunks[i+1], flags=re.MULTILINE):
            processed_chunks.append((chunks[i] + chunks[i+1]).strip())
            i += 2
        else:
            if chunks[i].strip():
                processed_chunks.append(chunks[i].strip())
            i += 1

    if not processed_chunks:
        processed_chunks = [p.strip() for p in markdown.split('\n\n') if p.strip()]

    final_chunks = []
    for chunk in processed_chunks:
        if len(chunk) > max_len:
            for i in range(0, len(chunk), max_len):
                final_chunks.append(chunk[i:i+max_len].strip())
        else:
            final_chunks.append(chunk)

    return [c for c in final_chunks if c]

def format_results_as_context(query_results: Dict[str, Any]) -> str:
    if not query_results or not query_results.get("documents"): return ""
    return "\n\n---\n\n".join(query_results["documents"][0])

async def ingest_url_task(url: str, collection_name: str):
    print(f"Starting ingestion for {url} into collection '{collection_name}'")
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)

        if not result.success or not result.markdown:
            print(f"Failed to crawl {url}: {result.error_message or 'No content found'}"); return

        chunks = smart_chunk_markdown(result.markdown)
        if not chunks: print(f"No content chunks from {url}"); return

        collection = chroma_client.get_or_create_collection(name=collection_name, embedding_function=embedding_func)
        ids = [f"{collection_name}-{i}" for i in range(len(chunks))]
        metadatas = [{"source": url} for _ in chunks]

        for batch_index, batch in enumerate(batched(range(len(chunks)), 100)):
            ids_batch = [ids[i] for i in batch]
            docs_batch = [chunks[i] for i in batch]
            metadatas_batch = [metadatas[i] for i in batch]
            collection.add(ids=ids_batch, documents=docs_batch, metadatas=metadatas_batch)
            print(f"  Batch {batch_index+1} added for '{collection_name}' ({len(ids_batch)} documents)")

        print(f"✅ Successfully ingested {len(chunks)} chunks from {url} into '{collection_name}'")
    except Exception as e:
        print(f"❌ Error during ingestion for {url}: {e}")

# --- Pydantic Models for API Requests ---
class SearchRequest(BaseModel):
    query: str
    type: Optional[str] = "search"
class IngestRequest(BaseModel):
    url: HttpUrl
class IngestResponse(BaseModel):
    message: str
    session_id: str
    url: str
class ChatRequest(BaseModel):
    question: str
    session_id: str
class SummarizeRequest(BaseModel):
    url: HttpUrl
class SaveKnowledgeBaseRequest(BaseModel):
    title: str
    link: HttpUrl
    summary: str
    subject_name: Optional[str] = None
    publication_date: Optional[str] = None
    location: Optional[str] = None
    emails: Optional[List[str]] = None
    organizations: Optional[List[str]] = None
    funds_money_investments: Optional[List[str]] = None
    projects_activities: Optional[List[str]] = None
    locations_mentioned: Optional[List[str]] = None

# --- API Endpoints ---
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/home", response_class=HTMLResponse)
async def landing_page(request: Request):
    return templates.TemplateResponse("landing.html", {"request": request})

@app.get("/history", response_class=JSONResponse)
async def get_history():
    return load_history()

@app.get("/knowledge-base", response_class=JSONResponse)
async def get_knowledge_base_entries():
    entries = load_knowledge_base()
    sorted_entries = sorted(entries, key=lambda x: x.saved_at, reverse=True)
    return [entry.dict() for entry in sorted_entries]

@app.post("/knowledge-base/save", response_model=KnowledgeBaseEntry)
async def save_to_knowledge_base(data: SaveKnowledgeBaseRequest):
    entries = load_knowledge_base()
    if any(str(entry.link) == str(data.link) for entry in entries):
        raise HTTPException(status_code=409, detail="This URL is already saved in the Knowledge Base.")

    new_entry = KnowledgeBaseEntry(**data.dict())
    entries.append(new_entry)
    save_knowledge_base(entries)
    return new_entry

@app.delete("/knowledge-base/delete/{entry_id}", response_class=JSONResponse)
async def delete_knowledge_base_entry(entry_id: str):
    entries = load_knowledge_base()
    initial_len = len(entries)
    entries = [entry for entry in entries if entry.id != entry_id]
    if len(entries) == initial_len:
        raise HTTPException(status_code=404, detail="Entry not found.")
    save_knowledge_base(entries)
    return {"message": "Entry deleted successfully."}

@app.post("/search")
async def search_endpoint(data: SearchRequest):
    if not SERPER_API_KEY:
        raise HTTPException(status_code=500, detail="Serper API key is not configured.")
    search_url = "https://google.serper.dev/search"
    payload = {"q": data.query, "num": 10}
    if data.type == "news": payload["tbs"] = "qdr:d"
    elif data.type == "places": payload["type"] = "places"
    else: payload["tbs"] = "qdr:w"

    headers = {'X-API-KEY': SERPER_API_KEY, 'Content-Type': 'application/json'}
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(search_url, headers=headers, content=json.dumps(payload))
            response.raise_for_status()
            search_results = response.json()

        history = load_history()
        existing_query_idx = next((i for i, s in enumerate(history['searches']) if s['query'] == data.query), -1)
        if existing_query_idx != -1:
            history['searches'][existing_query_idx]['timestamp'] = datetime.now().isoformat()
        else:
            history["searches"].insert(0, {"query": data.query, "timestamp": datetime.now().isoformat()})
        history["searches"] = sorted(history['searches'], key=lambda x: x['timestamp'], reverse=True)[:50]
        save_history(history)

        results_key = "places" if data.type == "places" else "news" if data.type == "news" else "organic"
        results_list = search_results.get(results_key, [])
        formatted_results = [{"title": r.get("title"), "link": r.get("link", "#"), "snippet": r.get("snippet") or r.get("address")} for r in results_list]
        return {"results": formatted_results}
    except Exception as e:
        print(f"Error during Serper search: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during search.")

# ---
# THIS IS THE CORRECTED ENDPOINT
# ---
@app.post("/summarize")
async def summarize_endpoint(data: SummarizeRequest):
    url = str(data.url)
    try:
        llm_config = LLMConfig(provider="groq/llama-3.3-70b-versatile", api_token=GROQ_API_KEY)
        # The instruction is now simpler, letting the schema guide the LLM
        extraction_strategy = LLMExtractionStrategy(
            llm_config=llm_config,
            schema=PageSummary.model_json_schema(),
            extraction_type="schema",
            instruction="Extract the information requested in the schema from the provided web page content."
        )
        crawler_config = CrawlerRunConfig(
            word_count_threshold=100,
            extraction_strategy=extraction_strategy,
            cache_mode=CacheMode.ENABLED
        )

        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url, config=crawler_config)

        if not result.success or not result.extracted_content:
            raise HTTPException(status_code=400, detail=f"Failed to crawl or extract summary: {result.error_message}")
        
        # ** FIX APPLIED HERE **
        # The output from crawl4ai is a JSON string of a list, so we parse it first.
        extracted_data_list = json.loads(result.extracted_content)
        
        # Check if the list is empty or not a list
        if not isinstance(extracted_data_list, list) or not extracted_data_list:
             raise HTTPException(status_code=500, detail="LLM did not return a valid summary structure.")
        
        # Take the first item from the list
        summary_dict = extracted_data_list[0]
        
        # Now, validate the dictionary with the Pydantic model
        summary_data = PageSummary(**summary_dict)
        
        return summary_data.dict()

    except Exception as e:
        # Catching the Pydantic validation error is good for debugging, but we'll print a generic one.
        print(f"Error during summarization for {url}: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during summarization. The page content might not be suitable for extraction.")


@app.post("/ingest", response_model=IngestResponse)
async def ingest_endpoint(request: IngestRequest, background_tasks: BackgroundTasks):
    url_str = str(request.url)
    session_id = url_to_collection_name(url_str)
    history = load_history()

    existing_chat = next((c for c in history['chats'] if c['session_id'] == session_id), None)
    if existing_chat:
        existing_chat['timestamp'] = datetime.now().isoformat()
    else:
        history['chats'].insert(0, {"url": url_str, "session_id": session_id, "timestamp": datetime.now().isoformat()})

    history['chats'] = sorted(history['chats'], key=lambda x: x['timestamp'], reverse=True)[:50]
    save_history(history)

    try:
        collection = chroma_client.get_collection(name=session_id, embedding_function=embedding_func)
        if collection.count() > 0:
            print(f"Collection '{session_id}' already exists with content. Skipping ingestion.")
            return IngestResponse(message="Site already ingested.", session_id=session_id, url=url_str)
    except ValueError:
        pass

    background_tasks.add_task(ingest_url_task, url=url_str, collection_name=session_id)
    return IngestResponse(message="Ingestion started.", session_id=session_id, url=url_str)

@app.get("/ingest-status/{session_id}", response_class=JSONResponse)
async def get_ingest_status(session_id: str):
    try:
        collection = chroma_client.get_collection(name=session_id, embedding_function=embedding_func)
        if collection.count() > 0:
            return {"status": "ready"}
        else:
            return {"status": "pending"}
    except ValueError:
        return {"status": "pending"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    try:
        collection = chroma_client.get_collection(name=request.session_id, embedding_function=embedding_func)
        query_results = collection.query(query_texts=[request.question], n_results=5)
        context = format_results_as_context(query_results)
        if not context:
            return {"answer": "I couldn't find relevant information on the ingested site to answer your question."}
        answer = await rag_chain.ainvoke({"context": context, "question": request.question})
        return {"answer": answer}
    except ValueError:
         raise HTTPException(status_code=404, detail=f"Chat session '{request.session_id}' not found.")
    except Exception as e:
        print(f"Error during chat: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during chat.")

if __name__ == "__main__":
    if not HISTORY_FILE.exists():
        save_history({"searches": [], "chats": []})
    if not KNOWLEDGE_BASE_FILE.exists():
        save_knowledge_base([])

    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)