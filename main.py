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

# LangChain, Crawl4AI, and other AI tool imports
from crawl4ai import AsyncWebCrawler
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
app = FastAPI(title="OpenCurrent", version="3.1.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- ChromaDB & RAG Setup (No changes) ---
# ... (This section is unchanged)
CHROMA_DB_DIR = "./chroma_db"
EMBEDDING_MODEL_NAME = "all-MiniLM-L6-v2"
chroma_client = chromadb.PersistentClient(path=CHROMA_DB_DIR)
embedding_func = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMBEDDING_MODEL_NAME)


# --- LangChain Models & Chains (No changes) ---
# ... (This section is unchanged)
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
    summary: str = LangChainField(description="A concise, neutral summary of the article's main points in 3-4 sentences.")
    publication_date: Optional[str] = LangChainField(default="Not found", description="The publication date of the article (e.g., 'August 15, 2024').")
    location: Optional[str] = LangChainField(default="Not specified", description="The primary city, country, or location mentioned.")
    contacts: ContactInfo = LangChainField(description="Extracted contact information.")

summarization_llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0, api_key=GROQ_API_KEY)
summarization_parser = PydanticOutputParser(pydantic_object=PageSummary)
summarization_prompt_template = """
You are an expert at analyzing web articles and extracting key information.
Based on the following page content, provide a structured summary.
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


# --- Utility & Background Task Functions (No changes) ---
# ... (This section is unchanged)
def smart_chunk_markdown(markdown: str, max_len: int = 800) -> List[str]:
    #... (function content)
    chunks = re.split(r'(^# .+$|^## .+$)', markdown, flags=re.MULTILINE)
    combined = [(chunks[i] + chunks[i+1]).strip() for i in range(1, len(chunks), 2)]
    if not combined:
        combined = [p.strip() for p in markdown.split('\n\n') if p.strip()]
    final_chunks = [c[i:i+max_len] for c in combined for i in range(0, len(c), max_len)]
    return final_chunks

def format_results_as_context(query_results: Dict[str, Any]) -> str:
    #... (function content)
    if not query_results or not query_results.get("documents"): return ""
    return "\n\n---\n\n".join(query_results["documents"][0])

async def ingest_url_task(url: str, collection_name: str):
    #... (function content)
    print(f"Starting ingestion for {url} into collection '{collection_name}'")
    try:
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
        if not result.success or not result.markdown:
            print(f"Failed to crawl {url}: {result.error_message}"); return
        chunks = smart_chunk_markdown(result.markdown)
        if not chunks: print(f"No content chunks from {url}"); return
        
        collection = chroma_client.get_or_create_collection(name=collection_name, embedding_function=embedding_func)
        ids = [f"{collection_name}-{i}" for i in range(len(chunks))]
        metadatas = [{"source": url} for _ in chunks]
        for batch in batched(range(len(chunks)), 100):
            start, end = batch[0], batch[-1] + 1
            collection.add(ids=ids[start:end], documents=chunks[start:end], metadatas=metadatas[start:end])
        print(f"✅ Successfully ingested {len(chunks)} chunks from {url} into '{collection_name}'")
    except Exception as e:
        print(f"❌ Error during ingestion for {url}: {e}")

# --- Pydantic Models for API Requests (No changes) ---
# ... (This section is unchanged)
class SearchRequest(BaseModel):
    query: str
class IngestRequest(BaseModel):
    url: HttpUrl
class ChatRequest(BaseModel):
    question: str
    session_id: str
class SummarizeRequest(BaseModel):
    url: HttpUrl

# --- API Endpoints ---

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

# --- MAJOR CHANGE HERE ---
@app.post("/search")
async def search_endpoint(data: SearchRequest):
    """
    Perform a search using a direct call to Google Serper for more control.
    Fetches 10 results from the past week.
    """
    if not SERPER_API_KEY:
        raise HTTPException(status_code=500, detail="Serper API key is not configured.")
        
    search_url = "https://google.serper.dev/search"
    payload = json.dumps({
        "q": data.query,
        "num": 10,       # Fetch 10 results
        "tbs": "qdr:w"   # Query date range: past week
    })
    headers = {
        'X-API-KEY': SERPER_API_KEY,
        'Content-Type': 'application/json'
    }
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(search_url, headers=headers, content=payload)
            response.raise_for_status()
            search_results = response.json()

        organic_results = search_results.get("organic", [])
        formatted_results = [{"title": r.get("title"), "link": r.get("link"), "snippet": r.get("snippet")} for r in organic_results]
        return {"results": formatted_results}

    except httpx.HTTPStatusError as e:
        print(f"Error from Serper API: {e.response.text}")
        raise HTTPException(status_code=e.response.status_code, detail="Failed to fetch search results.")
    except Exception as e:
        print(f"Error during Serper search: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during search.")

# In main.py, find and replace the ENTIRE /summarize endpoint with this new version.
# The rest of the file (imports, other endpoints, etc.) remains the same.

@app.post("/summarize")
async def summarize_endpoint(data: SummarizeRequest):
    """
    Summarizes a URL using a RAG approach to handle large documents and improve quality.
    """
    url = str(data.url)
    # Use a unique name for the temporary collection to avoid conflicts
    temp_collection_name = f"summary-{uuid.uuid4().hex[:8]}"

    try:
        # --- Step 1: Ingest the document into a temporary in-memory collection ---
        print(f"Starting RAG summary for {url} in temp collection '{temp_collection_name}'")
        async with AsyncWebCrawler() as crawler:
            result = await crawler.arun(url=url)
        
        if not result.success or not result.markdown:
            raise HTTPException(status_code=400, detail="Failed to crawl the page for summarization.")

        chunks = smart_chunk_markdown(result.markdown)
        if not chunks:
            raise HTTPException(status_code=400, detail="No content could be extracted for summarization.")

        # Create a temporary, in-memory collection for this one-time task
        collection = chroma_client.get_or_create_collection(
            name=temp_collection_name,
            embedding_function=embedding_func
        )
        
        # Add the document chunks to the collection
        collection.add(
            ids=[f"chunk-{i}" for i in range(len(chunks))],
            documents=chunks,
            metadatas=[{"source": url} for _ in chunks]
        )

        # --- Step 2: Retrieve the most relevant chunks for a general summary ---
        # We query for broad, high-level topics to get the best chunks for a summary.
        summary_query = "What are the main topics, key points, and conclusions of this document?"
        
        query_results = collection.query(
            query_texts=[summary_query],
            n_results=7  # Retrieve a few more chunks for a comprehensive summary
        )
        
        context = format_results_as_context(query_results)

        if not context:
            raise HTTPException(status_code=500, detail="Could not build a context for summarization.")
            
        # --- Step 3: Pass the retrieved context to the existing summarization chain ---
        # The chain is already designed to take content and output a structured Pydantic object.
        summary_data = await summarization_chain.ainvoke({"page_content": context})
        
        return summary_data.dict()

    except Exception as e:
        print(f"Error during RAG summarization: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred during summarization: {str(e)}")
        
    finally:
        # --- Step 4: Clean up the temporary collection ---
        # This is crucial to prevent memory bloat.
        print(f"Cleaning up temporary collection: {temp_collection_name}")
        chroma_client.delete_collection(name=temp_collection_name)
        
         
@app.post("/ingest")
# ... (function content is unchanged)
async def ingest_endpoint(request: IngestRequest, background_tasks: BackgroundTasks):
    session_id = f"session-{uuid.uuid4().hex[:8]}"
    background_tasks.add_task(ingest_url_task, url=str(request.url), collection_name=session_id)
    return {"message": "Ingestion started. You can now begin chatting.", "session_id": session_id}

@app.post("/chat")
# ... (function content is unchanged)
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
        print(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="An error occurred during chat.")

# --- Main Execution ---
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)