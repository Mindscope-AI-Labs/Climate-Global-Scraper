from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import http.client
import json
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

# Initialize FastAPI app
app = FastAPI(title="Climate Data Scraper", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Set up templates and static files
BASE_DIR = Path(__file__).parent
app.mount("/static", StaticFiles(directory=str(BASE_DIR / "static")), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))

# ----- SerperClient -----
class SerperClient:
    """A client to interact with the Serper.dev Search API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.host = "google.serper.dev"

    def search(self, query: str, gl: str = "us", num: int = 10) -> dict:
        """Perform a search query using Serper.dev API."""
        conn = http.client.HTTPSConnection(self.host)

        payload = json.dumps({
            "q": query,
            "gl": gl,
            "num": num
        })

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

        try:
            conn.request("POST", "/search", payload, headers)
            res = conn.getresponse()
            data = res.read()
            
            if res.status != 200:
                error_msg = f"API request failed with status {res.status}: {res.reason}"
                return {"error": error_msg, "status_code": res.status}
                
            result = json.loads(data.decode("utf-8"))
            return {"results": self._format_results(result)}
            
        except json.JSONDecodeError as e:
            return {"error": "Failed to parse API response", "details": str(e)}
        except Exception as e:
            return {"error": f"API request failed: {str(e)}"}
        finally:
            conn.close()
    
    def _format_results(self, data: dict) -> list:
        """Format the API response to match frontend expectations."""
        results = []
        
        # Handle organic results
        if "organic" in data:
            for item in data["organic"]:
                results.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "snippet": item.get("snippet", ""),
                    "displayLink": item.get("displayLink", "")
                })
        
        # Handle knowledge graph results if no organic results
        if not results and "knowledgeGraph" in data:
            kg = data["knowledgeGraph"]
            results.append({
                "title": kg.get("title", ""),
                "link": kg.get("website", ""),
                "snippet": kg.get("description", ""),
                "displayLink": kg.get("title", "")
            })
            
        return results

# Initialize Serper client
API_KEY = os.getenv("SERPER_API_KEY")
if not API_KEY:
    print("Warning: SERPER_API_KEY environment variable not set")
client = SerperClient(api_key=API_KEY) if API_KEY else None

# ----- API Endpoints -----
@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Serve the main HTML page."""
    return templates.TemplateResponse("index.html", {"request": request})

@app.post("/search")
async def search_endpoint(data: dict):
    """
    Perform a search using Serper.dev API.
    Expected input: {"query": "search terms", "gl": "country_code", "num": 10}
    """
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error: Missing SERPER_API_KEY"
        )
    
    query = data.get("query", "")
    if not query:
        raise HTTPException(
            status_code=400,
            detail="Missing required parameter: query"
        )
    
    gl = data.get("gl", "us")
    num = min(int(data.get("num", 10)), 50)  # Limit to max 50 results
    
    result = client.search(query=query, gl=gl, num=num)
    
    # Save results to file
    try:
        os.makedirs("src/data", exist_ok=True)
        with open("src/data/search_results.json", "w", encoding="utf-8") as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
    except Exception as e:
        print(f"Warning: Failed to save results: {e}")
    
    return result

# For development
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Render's PORT, default to 8000 locally
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
    
