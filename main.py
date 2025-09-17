from fastapi import FastAPI, Request, HTTPException, BackgroundTasks, Form
from fastapi.responses import HTMLResponse, FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, List, Any, AsyncGenerator
import http.client
import json
import os
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from crawl4ai import AsyncWebCrawler, CrawlerRunConfig
from crawl4ai.deep_crawling import BestFirstCrawlingStrategy
from crawl4ai.deep_crawling.scorers import KeywordRelevanceScorer
import uuid
import re
import requests
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta

load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="OpenCurrent",
    description="Knowledge flowing at your fingertips. Search and discover information from across the web with precision and ease.",
    version="1.0.0"
)

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
            "num": num,
            "tbs": "qdr:w"
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

# ----- Intelligent Crawling with Streaming -----
class IntelligentCrawler:
    """Intelligent crawler with BestFirstCrawlingStrategy and streaming support."""
    
    def __init__(self):
        self.crawl_results: Dict[str, Dict[str, Any]] = {}
    
    def create_scorer(self, keywords: List[str], weight: float = 0.7) -> KeywordRelevanceScorer:
        """Create a keyword relevance scorer for intelligent crawling."""
        return KeywordRelevanceScorer(
            keywords=keywords,
            weight=weight
        )
    
    def create_strategy(self, scorer: KeywordRelevanceScorer, max_depth: int = 2, 
                       max_pages: int = 25, include_external: bool = False) -> BestFirstCrawlingStrategy:
        """Create BestFirstCrawlingStrategy with intelligent scoring."""
        return BestFirstCrawlingStrategy(
            max_depth=max_depth,
            include_external=include_external,
            url_scorer=scorer,
            max_pages=max_pages
        )
    
    async def stream_crawl(self, start_url: str, keywords: List[str], 
                          max_depth: int = 2, max_pages: int = 25, 
                          include_external: bool = False) -> AsyncGenerator[str, None]:
        """Stream crawl results using basic crawling approach."""
        crawl_id = str(uuid.uuid4())
        
        # Initialize crawl result
        self.crawl_results[crawl_id] = {
            "status": "in_progress",
            "start_url": start_url,
            "keywords": keywords,
            "max_depth": max_depth,
            "max_pages": max_pages,
            "include_external": include_external,
            "pages_crawled": 0,
            "results": [],
            "start_time": datetime.now().isoformat()
        }
        
        try:
            # Send initial status
            yield json.dumps({
                "crawl_id": crawl_id,
                "status": "started",
                "message": f"Starting intelligent crawl from {start_url}",
                "config": {
                    "keywords": keywords,
                    "max_depth": max_depth,
                    "max_pages": max_pages,
                    "include_external": include_external
                }
            }) + "\n"
            
            # Use basic crawling without complex strategies
            async with AsyncWebCrawler() as crawler:
                # Simple crawl configuration
                config = CrawlerRunConfig(
                    word_count_threshold=10,
                    excluded_tags=['script', 'style', 'nav', 'footer', 'header'],
                    remove_overlay_elements=True
                )
                
                # Perform the crawl
                result = await crawler.arun(start_url, config=config)
                
                if result and hasattr(result, 'url') and hasattr(result, 'markdown'):
                    # Process the result
                    processed_result = {
                        "url": result.url,
                        "title": getattr(result, 'title', ''),
                        "content": getattr(result, 'markdown', '')[:1000] + '...' if len(getattr(result, 'markdown', '')) > 1000 else getattr(result, 'markdown', ''),
                        "success": getattr(result, 'success', True),
                        "error": getattr(result, 'error', None),
                        "timestamp": datetime.now().isoformat()
                    }
                    
                    # Add to results
                    self.crawl_results[crawl_id]["results"].append(processed_result)
                    self.crawl_results[crawl_id]["pages_crawled"] += 1
                    
                    # Stream the result
                    yield json.dumps({
                        "crawl_id": crawl_id,
                        "result": processed_result,
                        "pages_crawled": self.crawl_results[crawl_id]["pages_crawled"],
                        "status": "streaming"
                    }) + "\n"
                else:
                    print(f"Crawl result type: {type(result)}")
                    print(f"Crawl result: {result}")
                    if result:
                        print(f"Result attributes: {dir(result)}")
                
                # Mark as completed
                self.crawl_results[crawl_id]["status"] = "completed"
                self.crawl_results[crawl_id]["end_time"] = datetime.now().isoformat()
                
                # Calculate summary statistics
                successful_crawls = len([r for r in self.crawl_results[crawl_id]["results"] if r.get("success", False)])
                failed_crawls = len([r for r in self.crawl_results[crawl_id]["results"] if not r.get("success", False)])
                
                yield json.dumps({
                    "crawl_id": crawl_id,
                    "status": "completed",
                    "total_pages": self.crawl_results[crawl_id]["pages_crawled"],
                    "successful_crawls": successful_crawls,
                    "failed_crawls": failed_crawls,
                    "message": "Intelligent crawl completed successfully",
                    "end_time": self.crawl_results[crawl_id]["end_time"]
                }) + "\n"
                
        except Exception as e:
            # Mark as error
            self.crawl_results[crawl_id]["status"] = "error"
            self.crawl_results[crawl_id]["error"] = str(e)
            self.crawl_results[crawl_id]["end_time"] = datetime.now().isoformat()
            
            yield json.dumps({
                "crawl_id": crawl_id,
                "status": "error",
                "error": str(e),
                "message": "Intelligent crawl failed",
                "end_time": self.crawl_results[crawl_id]["end_time"]
            }) + "\n"
    
    def get_crawl_status(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a crawl by its ID."""
        if crawl_id not in self.crawl_results:
            return None
        
        result = self.crawl_results[crawl_id]
        return {
            "crawl_id": crawl_id,
            "status": result["status"],
            "start_url": result.get("start_url"),
            "keywords": result.get("keywords"),
            "pages_crawled": result.get("pages_crawled", 0),
            "max_pages": result.get("max_pages"),
            "max_depth": result.get("max_depth"),
            "include_external": result.get("include_external"),
            "error": result.get("error"),
            "start_time": result.get("start_time"),
            "end_time": result.get("end_time"),
            "results": result.get("results", [])[:10]  # Return first 10 results for preview
        }
    
    def get_crawl_results(self, crawl_id: str) -> Optional[Dict[str, Any]]:
        """Get all results of a completed crawl."""
        if crawl_id not in self.crawl_results:
            return None
        
        result = self.crawl_results[crawl_id]
        if result["status"] == "in_progress":
            return None
        
        # Calculate summary statistics
        successful_crawls = len([r for r in result.get("results", []) if r.get("success", False)])
        failed_crawls = len([r for r in result.get("results", []) if not r.get("success", False)])
        average_score = sum(r.get("score", 0) for r in result.get("results", [])) / max(1, len(result.get("results", [])))
        
        return {
            "crawl_id": crawl_id,
            "status": result["status"],
            "start_url": result.get("start_url"),
            "keywords": result.get("keywords"),
            "pages_crawled": result.get("pages_crawled", 0),
            "max_pages": result.get("max_pages"),
            "max_depth": result.get("max_depth"),
            "include_external": result.get("include_external"),
            "results": result.get("results", []),
            "error": result.get("error"),
            "start_time": result.get("start_time"),
            "end_time": result.get("end_time"),
            "summary": {
                "total_pages": result.get("pages_crawled", 0),
                "successful_crawls": successful_crawls,
                "failed_crawls": failed_crawls,
                "average_score": round(average_score, 2),
                "success_rate": round((successful_crawls / max(1, result.get("pages_crawled", 0))) * 100, 2)
            }
        }

    def list_crawls(self) -> List[Dict[str, Any]]:
        """List all crawl jobs with basic information."""
        crawls = []
        for crawl_id, result in self.crawl_results.items():
            crawls.append({
                "crawl_id": crawl_id,
                "status": result["status"],
                "start_url": result.get("start_url"),
                "keywords": result.get("keywords"),
                "pages_crawled": result.get("pages_crawled", 0),
                "max_pages": result.get("max_pages"),
                "start_time": result.get("start_time"),
                "end_time": result.get("end_time"),
                "error": result.get("error")
            })
        return crawls
    
    def cleanup_old_crawls(self, max_age_hours: int = 24) -> int:
        """Clean up old crawl results."""
        current_time = datetime.now()
        cutoff_time = current_time - timedelta(hours=max_age_hours)
        
        old_crawl_ids = []
        for crawl_id, result in self.crawl_results.items():
            start_time_str = result.get("start_time")
            if start_time_str:
                try:
                    start_time = datetime.fromisoformat(start_time_str)
                    if start_time < cutoff_time:
                        old_crawl_ids.append(crawl_id)
                except ValueError:
                    # If we can't parse the time, clean it up
                    old_crawl_ids.append(crawl_id)
        
        # Remove old crawls
        for crawl_id in old_crawl_ids:
            del self.crawl_results[crawl_id]
        
        return len(old_crawl_ids)

# Initialize intelligent crawler
intelligent_crawler = IntelligentCrawler()

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

# ----- Intelligent Crawling API Endpoints -----
@app.post("/intelligent-crawl")
async def start_intelligent_crawl(
    request: Request,
    url: str = Form(..., description="The starting URL for the intelligent crawl"),
    keywords: str = Form(..., description="Comma-separated keywords for relevance scoring"),
    max_depth: int = Form(2, description="Maximum crawl depth"),
    max_pages: int = Form(25, description="Maximum number of pages to crawl"),
    include_external: bool = Form(False, description="Include external links")
):
    """
    Start an intelligent crawl with BestFirstCrawlingStrategy and streaming.
    
    Form Data:
    - url: The starting URL to crawl
    - keywords: Comma-separated keywords for relevance scoring
    - max_depth: Maximum crawl depth (default: 2)
    - max_pages: Maximum number of pages to crawl (default: 25)
    - include_external: Whether to include external links (default: False)
    """
    try:
        # Parse keywords
        keyword_list = [k.strip() for k in keywords.split(',') if k.strip()]
        
        if not keyword_list:
            raise HTTPException(status_code=400, detail="At least one keyword must be provided")
        
        # Validate URL
        if not url.startswith(('http://', 'https://')):
            raise HTTPException(status_code=400, detail="URL must start with http:// or https://")
        
        # Return streaming response
        return StreamingResponse(
            intelligent_crawler.stream_crawl(
                start_url=url,
                keywords=keyword_list,
                max_depth=max_depth,
                max_pages=max_pages,
                include_external=include_external
            ),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start intelligent crawl: {str(e)}")

@app.get("/intelligent-crawl/status/{crawl_id}")
async def get_intelligent_crawl_status(crawl_id: str):
    """Get the status of an intelligent crawl by its ID."""
    result = intelligent_crawler.get_crawl_status(crawl_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Intelligent crawl not found")
    
    return result

@app.get("/intelligent-crawl/results/{crawl_id}")
async def get_intelligent_crawl_results(crawl_id: str):
    """Get all results of a completed intelligent crawl."""
    result = intelligent_crawler.get_crawl_results(crawl_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Intelligent crawl not found")
    
    if result["status"] == "in_progress":
        raise HTTPException(status_code=202, detail="Intelligent crawl in progress")
    
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result.get("error", "Intelligent crawl failed"))
    
    return result

@app.get("/intelligent-crawl/list")
async def list_intelligent_crawls():
    """List all intelligent crawl jobs with basic information."""
    return {
        "crawls": intelligent_crawler.list_crawls(),
        "total_crawls": len(intelligent_crawler.crawl_results)
    }

@app.delete("/intelligent-crawl/cleanup")
async def cleanup_old_crawls(max_age_hours: int = 24):
    """Clean up old crawl results."""
    cleaned_count = intelligent_crawler.cleanup_old_crawls(max_age_hours)
    return {
        "message": f"Cleaned up {cleaned_count} old crawl results",
        "max_age_hours": max_age_hours,
        "cleaned_count": cleaned_count
    }

# For development
if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))  # Use Render's PORT, default to 8000 locally
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
