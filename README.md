# Climate Data Scraper

A web application that allows you to search for climate-related organizations and initiatives worldwide using the Serper.dev Google Search API.

## Features

- Search for climate organizations and initiatives
- Filter results by country code
- Download search results as JSON
- Responsive design that works on desktop and mobile
- Clean, modern user interface

## Prerequisites

- Python 3.8+
- Node.js 14+ (for frontend development, optional)
- A [Serper.dev](https://serper.dev/) API key (free tier available)

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/climate-global-scraper.git
   cd climate-global-scraper
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Create a `.env` file in the project root and add your Serper.dev API key:
   ```
   SERPER_API_KEY=your_api_key_here
   ```

## Running the Application

1. Start the FastAPI development server:
   ```bash
   uvicorn main:app --reload
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

1. Enter your search query (e.g., "climate non-profits Kenya")
2. Optionally, specify a country code (default: "us")
3. Set the number of results (default: 10, max: 50)
4. Click "Search" to see the results
5. Use the "Download JSON" button to save the results

## Project Structure

```
.
├── static/                 # Static files (CSS, JS, images)
│   ├── css/
│   │   └── styles.css     # Main stylesheet
│   └── js/
│       └── app.js         # Frontend JavaScript
├── templates/
│   └── index.html         # Main HTML template
├── src/
│   └── data/              # Directory for storing search results
├── .env                   # Environment variables
├── .gitignore
├── main.py                # FastAPI application
├── README.md
└── requirements.txt       # Python dependencies
```

## Environment Variables

| Variable       | Description                          | Required | Default |
|----------------|--------------------------------------|----------|---------|
| SERPER_API_KEY | Your Serper.dev API key              | Yes      | -       |

## API Endpoints

- `GET /` - Serve the main application interface
- `POST /search` - Perform a search
  - Request body: `{"query": "search terms", "gl": "country_code", "num": 10}`
  - Response: Search results in JSON format

## Development

To run the development server with auto-reload:

```bash
uvicorn main:app --reload
```

The application will be available at `http://localhost:8000`

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Serper.dev](https://serper.dev/) for the search API
- [FastAPI](https://fastapi.tiangolo.com/) for the web framework
- [Uvicorn](https://www.uvicorn.org/) for the ASGI server
