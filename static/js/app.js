// DOM Elements
const searchForm = document.getElementById('searchForm');
const resultsDiv = document.getElementById('results');
const message = document.getElementById('message');
const downloadBtn = document.getElementById('downloadJson');
let lastJson = null;

// Handle form submission
searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Show loading state
  showMessage('Searching...', 'info');
  resultsDiv.innerHTML = '';
  
  const query = document.getElementById('query').value.trim();
  const gl = document.getElementById('gl').value.trim() || 'us';
  const num = parseInt(document.getElementById('num').value || '10', 10);

  if (!query) {
    showMessage('Please enter a search query.', 'error');
    return;
  }

  try {
    const response = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        query, 
        gl: gl.toLowerCase(),
        num: Math.min(Math.max(num, 1), 50) // Ensure between 1-50
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail || 'Failed to fetch results');
    }

    if (data.error) {
      throw new Error(data.error);
    }

    lastJson = data;

    if (data.results && data.results.length > 0) {
      showMessage(`Found ${data.results.length} results`, 'success');
      renderResults(data.results);
    } else {
      showMessage('No results found. Try a different search query.', 'info');
      resultsDiv.innerHTML = '';
    }
  } catch (error) {
    console.error('Search error:', error);
    showMessage(`Error: ${error.message || 'Failed to fetch results'}`, 'error');
  }
});

// Render search results
function renderResults(items) {
  resultsDiv.innerHTML = '';
  
  if (!items || items.length === 0) {
    resultsDiv.innerHTML = `
      <div class="message">
        No results found. Try adjusting your search query.
      </div>
    `;
    return;
  }
  
  items.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'result-card';
    card.id = `result-${index}`;
    
    const title = document.createElement('h3');
    const link = document.createElement('a');
    link.href = item.link || '#';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = item.title || 'No title';
    title.appendChild(link);
    
    const snippet = document.createElement('p');
    snippet.textContent = item.snippet || 'No description available.';
    
    // Add additional metadata if available
    const meta = document.createElement('div');
    meta.className = 'result-meta';
    meta.style.marginTop = '8px';
    meta.style.fontSize = '12px';
    meta.style.color = 'var(--muted)';
    
    if (item.displayLink) {
      const source = document.createElement('div');
      source.textContent = item.displayLink;
      meta.appendChild(source);
    }
    
    card.appendChild(title);
    card.appendChild(snippet);
    if (meta.hasChildNodes()) {
      card.appendChild(meta);
    }
    
    resultsDiv.appendChild(card);
  });
}

// Download JSON results
function downloadJson() {
  if (!lastJson) {
    showMessage('No results to download', 'warning');
    return;
  }
  
  try {
    const dataStr = JSON.stringify(lastJson, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `climate-search-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage('Download started', 'success');
  } catch (error) {
    console.error('Download error:', error);
    showMessage('Failed to prepare download', 'error');
  }
}

// Show status messages
function showMessage(text, type = 'info') {
  message.textContent = text;
  message.className = 'message';
  
  // Remove any existing type classes
  message.classList.remove('message-info', 'message-success', 'message-error', 'message-warning');
  
  // Add the appropriate type class
  if (type) {
    message.classList.add(`message-${type}`);
  }
  
  // Set background color based on type
  const colors = {
    info: 'rgba(46, 163, 255, 0.1)',
    success: 'rgba(46, 204, 113, 0.1)',
    error: 'rgba(231, 76, 60, 0.1)',
    warning: 'rgba(241, 196, 15, 0.1)'
  };
  
  message.style.backgroundColor = colors[type] || colors.info;
  message.style.display = 'block';
  
  // Auto-hide after 5 seconds for non-error messages
  if (type !== 'error') {
    setTimeout(() => {
      if (message.textContent === text) {
        message.style.display = 'none';
      }
    }, 5000);
  }
}

// Event listeners
downloadBtn.addEventListener('click', downloadJson);

// Initialize
message.style.display = 'none';
