from dotenv import load_dotenv
import os
from langchain_community.utilities import SerpAPIWrapper

load_dotenv()

print("Loaded key:", os.getenv("SERPAPI_API_KEY"))  # Debugging

search = SerpAPIWrapper()
print(search.run("list top 50 climate organisations in Africa"))
