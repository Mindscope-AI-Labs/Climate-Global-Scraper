# 🌍 Climate Global Scraper API

A FastAPI-powered web service for performing Google searches via the [Serper.dev API](https://serper.dev/), saving the results as structured JSON files for downstream processing.  

This project is designed for research, data collection, and automation, such as tracking climate organizations, initiatives, or related topics globally.  

---

## 🚀 Features

- **FastAPI Endpoint**: Perform searches dynamically using query parameters.
- **Serper.dev API Integration**: Fetch accurate and structured Google search results.
- **JSON Export**: Save search responses automatically for offline use or further analysis.
- **Environment Variable Support**: Store API keys securely with `.env`.
- **Lightweight Architecture**: Minimal dependencies for fast deployment.

---

## 📂 Project Structure

```

Climate-Global-Scraper/
├── app.py                         # FastAPI entry point
├── main.py                        # Standalone script (manual run)
├── src/
│   └── data/
│       └── climate\_organisations.json  # Sample output file
├── .env                           # Stores sensitive API keys (not committed to git)
├── requirements.txt               # Dependencies
└── README.md                      # Project documentation

````

---

## 🛠️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/Climate-Global-Scraper.git
cd Climate-Global-Scraper
````

### 2. Create and Activate a Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

---

## 🔑 API Key Configuration

This project requires a valid **Serper.dev API Key**.
Sign up at [https://serper.dev](https://serper.dev) to get one.

Create a `.env` file in the project root:

```
SERPER_API_KEY=your_serper_dev_api_key_here
```

---

## ▶️ Running the API

### Start FastAPI Server

```bash
uvicorn app:app --reload
```

Visit:

* **Docs UI:** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
* **Redoc UI:** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔍 API Usage

### Endpoint

`GET /search`

#### Query Parameters

| Parameter | Type   | Default | Description                       |
| --------- | ------ | ------- | --------------------------------- |
| `query`   | string | —       | The search query (required).      |
| `gl`      | string | `ke`    | Geolocation (country code).       |
| `tbs`     | string | `qdr:m` | Time filter (past month default). |

#### Example Request

```bash
curl "http://127.0.0.1:8000/search?query=list+top+50+climate+organisations+in+Africa"
```

#### Example Response

```json
{
  "searchParameters": {
    "q": "list top 50 climate organisations in Africa",
    "gl": "ke",
    "tbs": "qdr:m",
    "engine": "google"
  },
  "organic": [
    {
      "title": "Climate Justice Resilience Fund",
      "link": "https://www.cjrfund.org/news",
      "snippet": "Supporting diverse communities of climate and development practitioners...",
      "date": "20 Aug 2025",
      "position": 4
    }
  ],
  "credits": 1
}
```

---

## 📜 Running as a Script

You can also run `main.py` directly without using the API:

```bash
python main.py
```

This will:

1. Perform the search.
2. Print the result in the console.
3. Save a copy to `src/data/climate_organisations.json`.

---

## 🛡️ Security

* **Never commit `.env` files.**
* Use environment variables for sensitive information.
* Restrict API key permissions in your Serper.dev dashboard.

---

## 📦 Requirements

Minimal dependencies for a lightweight setup:

```
langchain==x.x.x
python-dotenv==x.x.x
fastapi==x.x.x
uvicorn==x.x.x
```

Run:

```bash
pip install -r requirements.txt
```

---

## 📚 Future Improvements

* [ ] Add async support for faster responses.
* [ ] Include caching to avoid repeated queries.
* [ ] Create pagination or bulk search endpoints.
* [ ] Add Docker support for easy deployment.

---

## 🤝 Contributing

Contributions are welcome!
Please fork the repository, make your changes, and submit a pull request.

---

## 📜 License

This project is licensed under the MIT License.
See [LICENSE](LICENSE) for details.

---

## 👨‍💻 Author

Developed by **\[Paul Ndirangu]**
For inquiries, reach out at **[paulmwaura254@gmail.com](mailto:paulmwaura254@gmail.com)**


