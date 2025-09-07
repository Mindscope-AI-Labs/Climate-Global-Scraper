from fastapi import FastAPI, Query
from pydantic import BaseModel
import http.client
import json
from dotenv import load_dotenv
import os

load_dotenv()

# ----- SerperClient -----
class SerperClient:
    """A client to interact with the Serper.dev Search API."""

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.host = "google.serper.dev"

    def search(self, query: str, gl: str = "ke", tbs: str = "qdr:m") -> dict:
        """Perform a search query using Serper.dev API."""
        conn = http.client.HTTPSConnection(self.host)

        payload = json.dumps({
            "q": query,
            "gl": gl,
            "tbs": tbs
        })

        headers = {
            "X-API-KEY": self.api_key,
            "Content-Type": "application/json"
        }

        conn.request("POST", "/search", payload, headers)
        res = conn.getresponse()
        data = res.read()

        try:
            return json.loads(data.decode("utf-8"))
        except json.JSONDecodeError:
            return {"error": "Invalid JSON response", "raw": data.decode("utf-8")}


# ----- JSON Saving Helper -----
def save_to_json(data: dict, filename: str) -> None:
    """Save search results to a JSON file."""
    try:
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"Data successfully saved to {filename}")
    except Exception as e:
        print(f"Error saving JSON file: {e}")


# ----- FastAPI App -----
app = FastAPI(title="Serper Search API", version="1.0.0")

API_KEY = os.getenv("SERPER_API_KEY")
client = SerperClient(api_key=API_KEY)


@app.get("/search")
def search_endpoint(
    query: str = Query(..., description="Search query"),
    gl: str = Query("ke", description="Geolocation code"),
    tbs: str = Query("qdr:m", description="Time filter")
):
    """
    Perform a search using Serper.dev API.
    """
    if not API_KEY:
        return {"error": "Missing SERPER_API_KEY in environment variables."}

    result = client.search(query=query, gl=gl, tbs=tbs)
    save_to_json(result, "src/data/climate_organisations.json")
    return result
