# OpenCurrent - Climate Intelligence Platform

A powerful web application that enables intelligent search, crawling, and analysis of climate-related organizations and initiatives worldwide. Combining advanced web scraping with AI-powered content analysis to deliver comprehensive insights.

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
- Node.js 14+ (for frontend development, optional)
- A [Serper.dev](https://serper.dev/) API key (free tier available)
- Internet connection for web crawling and search functionality

## 📦 Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/climate-global-scraper.git
   cd climate-global-scraper
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
   Create a `.env` file in the project root and add your API key:
   ```
   SERPER_API_KEY=your_api_key_here
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
├── static/                 # Static files (CSS, JS, images)
│   ├── css/
│   │   └── styles.css     # Main stylesheet with dark theme
│   ├── js/
│   │   └── app.js         # Frontend JavaScript functionality
│   └── images/
│       ├── logo.png       # Main application logo
│       └── title-logo.png # Favicon and title logo
├── templates/
│   └── index.html         # Main HTML template
├── src/
│   └── data/              # Directory for storing search results
│       ├── climate_organisations.json
│       ├── search_results.json
│       └── test.json
├── venv/                  # Virtual environment
├── .env                   # Environment variables
├── .gitignore
├── debug_buttons.js       # Debug utilities
├── LICENSE
├── main.py                # FastAPI application with crawling & analysis
├── README.md
├── requirements.txt       # Python dependencies
└── simple_test.js         # Test utilities
```

## ⚙️ Environment Variables

| Variable       | Description                          | Required | Default |
|----------------|--------------------------------------|----------|---------|
| SERPER_API_KEY | Your Serper.dev API key              | Yes      | -       |

## 🔌 API Endpoints

### Core Endpoints
- `GET /` - Serve the main application interface
- `POST /search` - Perform a search using Serper.dev API
  - Request body: `{"query": "search terms", "gl": "country_code", "num": 10}`
  - Response: Search results in JSON format

### Advanced Endpoints
- `POST /crawl` - Crawl a specific URL and extract content
  - Request body: `{"url": "https://example.com"}`
  - Response: Crawled content with metadata

- `POST /summarize` - Analyze and summarize webpage content
  - Request body: `{"url": "https://example.com"}`
  - Response: Comprehensive analysis including:
    ```json
    {
      "url": "https://example.com",
      "title": "Page Title",
      "publication_date": "January 15, 2024",
      "summary": "Content summary...",
      "contacts": {
        "emails": ["email@example.com"],
        "organizations": ["Organization Name"]
      },
      "location": "Location information"
    }
    ```

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
- [FastAPI](https://fastapi.tiangolo.com/) for the modern web framework
- [Uvicorn](https://www.uvicorn.org/) for the high-performance ASGI server
- [Crawl4AI](https://github.com/unclecode/crawl4ai) for advanced web crawling
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
