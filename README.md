# OpenCurrent - Climate Intelligence Platform

A powerful web application (v3.3.0) that enables intelligent search, crawling, and analysis of climate-related organizations and initiatives worldwide. Combining advanced web scraping with AI-powered content analysis, knowledge base management, and Retrieval-Augmented Generation (RAG) chat to deliver comprehensive insights.

## 🚀 Features

### Core Search & Crawling
- **Intelligent Search**: Search for climate organizations and initiatives using Serper.dev Google Search API
- **Country Filtering**: Filter results by specific country codes
- **Web Crawling**: Deep crawl websites to extract comprehensive content
- **Real-time Results**: Live crawling with streaming progress updates

### Advanced Content Analysis
- **AI-Powered Summarization**: Automatically generate concise summaries of crawled content
- **Entity Extraction**: Intelligently extract emails, organizations, and key entities
- **Publication Date Detection**: Automatically identify and format publication dates
- **Location Intelligence**: Extract and identify geographic locations and addresses
- **Content Cleaning**: Advanced markdown cleaning for better text processing

### User Interface
- **Modern Dark Theme**: Professional, easy-on-the-eyes interface
- **Responsive Design**: Fully responsive layout that works seamlessly on desktop, tablet, and mobile
- **Interactive Modals**: Rich modal dialogs for detailed content analysis
- **Real-time Feedback**: Live status updates and progress indicators
- **Professional Branding**: Custom logos and favicon integration

### Data Management
- **JSON Export**: Download search results and analysis data in JSON format
- **Structured Output**: Well-organized data with metadata and extracted entities
- **Batch Processing**: Handle multiple URLs and large datasets efficiently

## 🛠️ Prerequisites

- Python 3.8+
- A [Serper.dev](https://serper.dev/) API key (free tier available)
- A [Groq](https://groq.com/) API key (for AI summarization and RAG chat)
- Internet connection for web crawling and search functionality

## 📦 Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Mindscope-AI-Labs/Climate-Global-Scraper.git
   cd Climate-Global-Scraper
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install the required Python packages**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Create environment configuration**:
   Create a `.env` file in the project root and add your API keys:
   ```
   SERPER_API_KEY=your_serper_api_key_here
   GROQ_API_KEY=your_groq_api_key_here
   ```

5. **Install Playwright browsers**:
   ```bash
   playwright install
   ```

## 🚀 Running the Application

1. **Start the FastAPI development server**:
   ```bash
   uvicorn main:app --reload
   ```

2. **Open your browser** and navigate to:
   ```
   http://localhost:8000
   ```

## 📖 Usage Guide

### Basic Search
1. Enter your search query (e.g., "climate non-profits Kenya")
2. Optionally specify a country code (default: "us")
3. Set the number of results (default: 10, max: 50)
4. Click "Search" to see results
5. Use "Download JSON" to save search results

### Advanced Crawling & Analysis
1. **Crawl Websites**: Use the crawl feature to extract detailed content from specific URLs
2. **View Analysis**: Click "View Summary" on any result to see AI-powered analysis including:
   - Content summary
   - Extracted entities (emails, organizations)
   - Publication dates
   - Location information
3. **Export Data**: Download comprehensive analysis data in JSON format

### Interface Features
- **Sidebar Navigation**: Toggle between Search and Crawl modes
- **Responsive Design**: Works seamlessly on all device sizes
- **Dark Theme**: Easy on the eyes for extended use
- **Real-time Updates**: Live crawling progress and status updates

## 📁 Project Structure

```
.
├── app.py                  # Legacy FastAPI application (v3.0.0)
├── chroma_db/              # ChromaDB vector database storage
├── debug_buttons.js        # Debug utilities
├── history.json            # Search history data
├── knowledge_base.json     # Saved knowledge base entries
├── LICENSE
├── main.py                 # Main FastAPI application (v3.3.0)
├── README.md
├── requirements.txt        # Python dependencies
├── simple_test.js          # Test utilities
├── src/
│   ├── data/               # Additional data storage
│   └── __pycache__/
├── start.sh                # Startup script for deployment
├── static/                 # Static files (CSS, JS, images)
│   ├── css/
│   │   └── styles.css      # Main stylesheet with dark theme
│   ├── images/
│   │   ├── logo.png        # Main application logo
│   │   └── title-logo.png  # Favicon and title logo
│   └── js/
│       └── app.js          # Frontend JavaScript functionality
├── templates/              # HTML templates
│   ├── index.html          # Main HTML template
│   └── new.html            # Additional template
├── uploads/                # Uploaded files directory
├── venv/                   # Virtual environment
├── .env                    # Environment variables
└── .gitignore
```

## ⚙️ Environment Variables

| Variable       | Description                          | Required | Default |
|----------------|--------------------------------------|----------|---------|
| SERPER_API_KEY | Your Serper.dev API key              | Yes      | -       |
| GROQ_API_KEY   | Your Groq API key for AI features    | Yes      | -       |
| JINA_API_KEY   | Optional Jina AI API key             | Optional | -       |

## 🔌 API Endpoints

### Core Endpoints
- `GET /` - Serve the main application interface
- `GET /history` - Retrieve search and chat session history
- `POST /search` - Perform a search using Serper.dev API
  - Request body: `{"query": "search terms", "type": "search|news|places"}`
  - Response: Search results in JSON format

### Knowledge Base Management
- `GET /knowledge-base` - Retrieve all saved knowledge base entries
- `POST /knowledge-base/save` - Save an entry to the knowledge base
- `DELETE /knowledge-base/delete/{entry_id}` - Delete an entry from the knowledge base

### AI-Powered Analysis
- `POST /summarize` - Analyze and summarize webpage content with Groq AI
  - Request body: `{"url": "https://example.com"}`
  - Response: Comprehensive analysis including:
    ```json
    {
      "subject_name": "Organization Name",
      "summary": "Content summary...",
      "publication_date": "January 15, 2024",
      "location": "Location information",
      "contacts": {
        "emails": ["email@example.com"],
        "organizations": ["Organization Name"]
      },
      "funds_money_investments": ["Project funding"],
      "projects_activities": ["Project descriptions"],
      "locations_mentioned": ["Geographic locations"]
    }
    ```

### Web Scraping & RAG Chat
- `POST /ingest` - Ingest a URL for vectorization and RAG chat
  - Request body: `{"url": "https://example.com"}`
  - Response: `{ "message": "Ingestion started", "session_id": "session_id" }`
- `GET /ingest-status/{session_id}` - Check ingestion status
- `POST /chat` - Ask questions about ingested content
  - Request body: `{"question": "your question", "session_id": "session_id"}`
  - Response: `{ "answer": "AI-generated answer" }`

## 🛠️ Development

### Development Server
To run the development server with auto-reload:
```bash
uvicorn main:app --reload
```

### Frontend Development
For frontend development, you can modify files in the `static/` directory:
- `static/css/styles.css` - Styles and theme customization
- `static/js/app.js` - Frontend functionality and interactions
- `templates/index.html` - HTML structure and layout

### Backend Development
- `main.py` - FastAPI application, API endpoints, and business logic
- Add new endpoints in the main.py file
- Update requirements.txt when adding new dependencies

## 🎨 Design & Styling

The application features a modern dark theme with:
- **Color Scheme**: Dark background (#141820) with blue accent (#2ea3ff)
- **Typography**: Clean, readable fonts with proper hierarchy
- **Responsive Design**: Mobile-first approach with breakpoints
- **Interactive Elements**: Smooth transitions and hover effects
- **Professional Branding**: Custom logos and consistent visual identity

## 📊 Technical Features

### Content Processing
- **Markdown Cleaning**: Removes markdown links, images, and formatting artifacts
- **Entity Recognition**: Advanced regex patterns for email and organization extraction
- **Date Parsing**: Intelligent publication date extraction from HTML meta tags
- **Location Detection**: Geographic information extraction from content

### Web Crawling
- **Async Processing**: Efficient asynchronous web crawling
- **Content Extraction**: Intelligent main content extraction using Crawl4AI
- **Error Handling**: Robust error handling and timeout management
- **Rate Limiting**: Respectful crawling with proper delays

## 🔒 Security & Best Practices

- Environment variable management for API keys
- Input validation and sanitization
- Error handling with proper HTTP status codes
- Secure file handling and directory access
- CORS configuration for API endpoints

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Serper.dev](https://serper.dev/) for the powerful search API
- [Groq](https://groq.com/) for fast AI inference and the LLaMA models
- [FastAPI](https://fastapi.tiangolo.com/) for the modern web framework
- [Crawl4AI](https://github.com/unclecode/crawl4ai) for advanced web crawling and content extraction
- [LangChain](https://langchain.com/) for building AI applications with LLMs
- [ChromaDB](https://chroma-db.com/) for vector database and similarity search
- [BeautifulSoup](https://www.crummy.com/software/BeautifulSoup/) for HTML parsing
- [Bootstrap Icons](https://icons.getbootstrap.com/) for the icon library

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## 📞 Support

If you encounter any issues or have questions:
1. Check the existing issues on GitHub
2. Create a new issue with detailed information
3. Ensure you have the latest version of all dependencies

---

**Built with ❤️ for climate intelligence and research**
