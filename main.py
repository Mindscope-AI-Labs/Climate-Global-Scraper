from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
# --- CHANGE HERE: Import BaseModel and Field from Pydantic v2 for the request models ---
from pydantic import BaseModel, HttpUrl, Field
from typing import List, Optional
import os
import json
from pathlib import Path
from dotenv import load_dotenv
import httpx

# LangChain Imports
from langchain_community.tools import JinaSearch
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
# --- CHANGE HERE: Import BaseModel and Field from Pydantic v2 for the output parser ---
from langchain_core.pydantic_v1 import BaseModel as V1BaseModel # This is no longer needed, but we can keep for clarity on old code
from pydantic import BaseModel as LangChainBaseModel, Field as LangChainField
from langchain_core.output_parsers import PydanticOutputParser

# Load environment variables from .env file
load_dotenv()

# --- Initialize FastAPI App ---
app = FastAPI(
    title="OpenCurrent",
    description="AI-driven search and summarization with Jina, LangChain, and Groq.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# --- API Key Checks ---
JINA_API_KEY = os.getenv("JINA_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not JINA_API_KEY or not GROQ_API_KEY:
    raise RuntimeError("JINA_API_KEY and GROQ_API_KEY must be set in the .env file.")

# --- LangChain & AI Configuration ---
# 1. Define the desired output structure using modern Pydantic v2 BaseModel
class ContactInfo(LangChainBaseModel):
    # Set a default value of an empty list to prevent 'null'
    emails: Optional[List[str]] = LangChainField(default=[], description="List of extracted email addresses.")
    organizations: Optional[List[str]] = LangChainField(default=[], description="List of mentioned organizations, companies, or NGOs.")

class PageSummary(LangChainBaseModel):
    summary: str = LangChainField(description="A concise, neutral summary of the article's main points in 3-4 sentences.")
    # You can also add defaults here for extra safety
    publication_date: Optional[str] = LangChainField(default="Not found", description="The publication date of the article (e.g., 'August 15, 2024'). If not found, should be 'Not found'.")
    location: Optional[str] = LangChainField(default="Not specified", description="The primary city, country, or location mentioned. If not found, should be 'Not specified'.")
    contacts: ContactInfo = LangChainField(description="Extracted contact information.")

# 2. Set up the Groq LLM
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0,
    api_key=GROQ_API_KEY
)

# 3. Set up the Pydantic parser
parser = PydanticOutputParser(pydantic_object=PageSummary)

# 4. Create the prompt template
prompt_template = """
You are an expert at analyzing web articles and extracting key information.
Based on the following page content, provide a structured summary.
Follow the formatting instructions precisely.

{format_instructions}

Here is the page content:
---
{page_content}
---
"""

prompt = ChatPromptTemplate.from_template(
    template=prompt_template,
    partial_variables={"format_instructions": parser.get_format_instructions()},
)

# 5. Create the LangChain chain
summarization_chain = prompt | llm | parser

# 6. Initialize Jina Search Tool
jina_search = JinaSearch(api_key=JINA_API_KEY)


# --- Pydantic Models for API Requests ---
# These use the standard Pydantic v2 BaseModel, which is fine for FastAPI
class SearchRequest(BaseModel):
    query: str
    gl: Optional[str] = "us"
    num: Optional[int] = 10

class SummarizeRequest(BaseModel):
    url: HttpUrl

# --- API Endpoints ---

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main HTML page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/search")
async def search_endpoint(data: SearchRequest):
    """
    Perform a search using Jina Search API.
    """
    try:
        # Step 1: Invoke the tool. It returns a JSON STRING.
        results_str = jina_search.invoke({"query": data.query})

        # Step 2: Parse the JSON string into a Python list of dictionaries.
        results_list = json.loads(results_str)

        # Step 3: Now, iterate over the list of dictionaries as intended.
        formatted_results = [
            {"title": r.get("title"), "link": r.get("link"), "snippet": r.get("snippet")}
            for r in results_list[:data.num]
        ]
        return {"results": formatted_results}
        
    except json.JSONDecodeError as e:
        print(f"Error decoding JSON from Jina: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse search results from Jina.")
    except Exception as e:
        print(f"Error during Jina search: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")

@app.post("/summarize")
async def summarize_endpoint(data: SummarizeRequest):
    """
    Fetches content for a URL using Jina's reader and processes it with the Groq/LangChain chain.
    """
    url = str(data.url)
    try:
        jina_reader_url = f"https://r.jina.ai/{url}"
        headers = {"Authorization": f"Bearer {JINA_API_KEY}"}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(jina_reader_url, headers=headers)
            response.raise_for_status()
            page_content = response.text

        if not page_content or len(page_content) < 100:
            raise HTTPException(status_code=400, detail="Could not retrieve sufficient content from the URL.")

        summary_data = await summarization_chain.ainvoke({"page_content": page_content})

        return summary_data.dict()

    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL via Jina Reader: {e}")
    except Exception as e:
        print(f"Error during summarization: {e}")
        raise HTTPException(status_code=500, detail=f"An error occurred while processing the URL: {e}")


# For development and deployment
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)