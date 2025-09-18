import os
import re
import json
import uuid
import asyncio
from pathlib import Path
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

# LangChain & Crawl4AI Imports
from crawl4ai import AsyncWebCrawler
from langchain_community.tools import JinaSearch
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from chromadb.utils import embedding_functions

# --- Load Environment Variables ---
load_dotenv()
JINA_API_KEY = os.getenv("JINA_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# --- FastAPI App Setup ---
app = FastAPI(title="OpenCurrent", version="3.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- ChromaDB & RAG Setup ---
CHROMA_DB_DIR = "./chroma_db"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)

# --- RAG LangChain Setup ---
rag_llm = ChatGroq(model="llama3-8b-8192", temperature=0, api_key=GROQ_API_KEY)
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

# --- Utility Functions (from your provided scripts) ---

def smart_chunk_markdown(markdown: str, max_len: int = 800) -> List[str]:
    """Hierarchically splits markdown by headers, then by paragraphs, to keep chunks small."""
    # First, split by major headers
    chunks = re.split(r'(^# .+$|^## .+$)', markdown, flags=re.MULTILINE)
    combined_chunks = []
    for i in range(1, len(chunks), 2):
        combined_chunks.append((chunks[i] + chunks[i+1]).strip())
    
    # If no headers, split by paragraphs
    if not combined_chunks:
        combined_chunks = [p.strip() for p in markdown.split('\n\n') if p.strip()]

    # Further split long chunks
    final_chunks = []
    for chunk in combined_chunks:
        if len(chunk) > max_len:
            for i in range(0, len(chunk), max_len):
                final_chunks.append(chunk[i:i+max_len])
        else:
            final_chunks.append(chunk)
    return final_chunks

def format_results_as_context(query_results: Dict[str, Any]) -> str:
    """Formats ChromaDB query results into a single context string."""
    if not query_results or not query_results.get("documents"):
        return ""
    return "\n\n---\n\n".join([doc for doc in query_results["documents"][0]])

# --- Ingestion Task ---

async def ingest_url_task(url: str, collection_name: str):
    """The background task to crawl, chunk, and vectorize a URL."""
    print(f"Starting ingestion for {url} into collection '{collection_name}'")
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
        
        if not result.success or not result.markdown:
            print(f"Failed to crawl {url}: {result.error_message}")
            return

        chunks = smart_chunk_markdown(result.markdown)
        if not chunks:
            print(f"No content chunks extracted from {url}")
            return
            
        collection = chroma_client.get_or_create_collection(
            name=collection_name,
            embedding_function=embedding_func
        )

        ids = [f"{collection_name}-{i}" for i in range(len(chunks))]
        metadatas = [{"source": url} for _ in chunks]

        for batch in batched(range(len(chunks)), 100):
            start_idx, end_idx = batch[0], batch[-1] + 1
            collection.add(
                ids=ids[start_idx:end_idx],
                documents=chunks[start_idx:end_idx],
                metadatas=metadatas[start_idx:end_idx]
            )
        
        print(f"✅ Successfully ingested {len(chunks)} chunks from {url} into '{collection_name}'")

    except Exception as e:
        print(f"❌ Error during ingestion for {url}: {e}")


# --- Pydantic Models ---
class IngestRequest(BaseModel):
    url: HttpUrl

class ChatRequest(BaseModel):
    question: str
    session_id: str

# Keep the original search functionality for now
jina_search = JinaSearch(api_key=JINA_API_KEY)
class SearchRequest(BaseModel):
    query: str
# ... (summarize models can be removed if chat replaces it, but we keep for now)


# --- API Endpoints ---

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/ingest")
async def ingest_endpoint(request: IngestRequest, background_tasks: BackgroundTasks):
    """
    Kicks off the crawling and vectorization process for a URL in the background.
    """
    session_id = f"session-{uuid.uuid4().hex[:8]}"
    background_tasks.add_task(ingest_url_task, url=str(request.url), collection_name=session_id)
    return {"message": "Ingestion started. You can now begin chatting.", "session_id": session_id}

@app.post("/chat")
async def chat_endpoint(request: ChatRequest):
    """
    Handles a chat message by performing a RAG query against the ingested content.
    """
    try:
        collection = chroma_client.get_collection(
            name=request.session_id,
            embedding_function=embedding_func
        )

        # Retrieve relevant context from ChromaDB
        query_results = collection.query(
            query_texts=[request.question],
            n_results=5
        )
        context = format_results_as_context(query_results)

        if not context:
            return {"answer": "I couldn't find any relevant information on the ingested website to answer your question."}

        # Generate answer with the LLM
        answer = await rag_chain.ainvoke({"context": context, "question": request.question})
        return {"answer": answer}

    except ValueError: # Handles case where collection doesn't exist
         raise HTTPException(status_code=404, detail=f"Chat session '{request.session_id}' not found. Please ingest a URL first.")
    except Exception as e:
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during chat processing.")

# --- Existing Endpoints (kept for functionality) ---

@app.post("/search")
async def search_endpoint(data: SearchRequest):
    try:
        results_str = jina_search.invoke({"query": data.query})
        results_list = json.loads(results_str)
        formatted_results = [
            {"title": r.get("title"), "link": r.get("link"), "snippet": r.get("snippet")}
            for r in results_list
        ]
        return {"results": formatted_results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))