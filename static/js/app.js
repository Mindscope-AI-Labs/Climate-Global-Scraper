// Optimized UI/UX with animations and crawl streaming
console.log('Loading app.js...');

// Global state
let lastJson = null;

// DOM Elements Cache
const dom = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing app...');
  
  try {
    // Cache all DOM elements with error handling
    dom.searchForm = document.getElementById('searchForm');
    dom.crawlForm = document.getElementById('crawlForm');
    dom.sidebar = document.getElementById('sidebar');
    dom.sidebarToggle = document.getElementById('sidebarToggle');
    dom.sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    dom.navItems = document.querySelectorAll('.nav-item');
    dom.contentSections = document.querySelectorAll('.content-section');
    dom.searchResultsWrapper = document.getElementById('searchResultsWrapper');
    dom.searchResultsList = document.getElementById('searchResultsList');
    dom.downloadBtn = document.getElementById('downloadJson');
    dom.clearBtn = document.getElementById('clearResults');
    dom.helpLink = document.getElementById('helpLink');
    dom.helpModal = document.getElementById('helpModal');
    dom.helpCloseBtn = document.getElementById('helpCloseBtn');
    dom.crawlStatus = document.getElementById('crawlStatus');
    dom.crawlLog = document.getElementById('crawlLog');
    
    // Log which elements were found
    console.log('DOM elements found:', {
      searchForm: !!dom.searchForm,
      crawlForm: !!dom.crawlForm,
      sidebar: !!dom.sidebar,
      sidebarToggle: !!dom.sidebarToggle,
      navItems: dom.navItems.length,
      contentSections: dom.contentSections.length,
      searchResultsWrapper: !!dom.searchResultsWrapper,
      searchResultsList: !!dom.searchResultsList,
      downloadBtn: !!dom.downloadBtn,
      clearBtn: !!dom.clearBtn,
      helpModal: !!dom.helpModal,
      helpCloseBtn: !!dom.helpCloseBtn,
      crawlStatus: !!dom.crawlStatus,
      crawlLog: !!dom.crawlLog
    });
    
    // Initialize all functionality
    initializeSidebar();
    initializeNavigation();
    initializeForms();
    initializeModals();

    console.log('App initialization complete');
  } catch (error) {
    console.error('Error during app initialization:', error);
    // Show a user-friendly error message
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: Arial, sans-serif;">
        <h2 style="color: #e74c3c;">Application Error</h2>
        <p>There was an error initializing the application. Please refresh the page and try again.</p>
        <p style="color: #666; font-size: 14px;">Error details: ${error.message}</p>
      </div>
    `;
  }
});

// Sidebar functionality
function initializeSidebar() {
  try {
    if (!dom.sidebar || !dom.sidebarToggle) {
      console.warn('Sidebar elements not found, skipping sidebar initialization');
      return;
    }
    
    dom.sidebarToggle.addEventListener('click', () => {
      dom.sidebar.classList.toggle('collapsed');
    });

    if(dom.sidebarToggleMobile) {
      dom.sidebarToggleMobile.addEventListener('click', () => {
        dom.sidebar.classList.toggle('open');
      });
    }
    console.log('Sidebar initialized successfully');
  } catch (error) {
    console.error('Error initializing sidebar:', error);
  }
}

// Navigation functionality
function initializeNavigation() {
  try {
    if (!dom.navItems || dom.navItems.length === 0) {
      console.warn('Navigation items not found, skipping navigation initialization');
      return;
    }
    
    dom.navItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetSectionId = this.getAttribute('data-section');
        
        dom.navItems.forEach(nav => nav.classList.remove('active'));
        this.classList.add('active');
        
        if (dom.contentSections) {
          dom.contentSections.forEach(section => {
            section.classList.toggle('active', section.id === `${targetSectionId}-section`);
          });
        }
        
        if (window.innerWidth <= 768 && dom.sidebar) {
          dom.sidebar.classList.remove('open');
        }
      });
    });
    console.log('Navigation initialized successfully');
  } catch (error) {
    console.error('Error initializing navigation:', error);
  }
}

// Form initialization
function initializeForms() {
  try {
    if (dom.searchForm) {
      dom.searchForm.addEventListener('submit', handleSearch);
      console.log('Search form listener attached');
    } else {
      console.warn('Search form not found');
    }
    
    if (dom.crawlForm) {
      dom.crawlForm.addEventListener('submit', handleCrawl);
      console.log('Crawl form listener attached');
    } else {
      console.warn('Crawl form not found');
    }

    if (dom.downloadBtn) {
      dom.downloadBtn.addEventListener('click', downloadJson);
      console.log('Download button listener attached');
    } else {
      console.warn('Download button not found');
    }
    
    if (dom.clearBtn) {
      dom.clearBtn.addEventListener('click', clearResults);
      console.log('Clear button listener attached');
    } else {
      console.warn('Clear button not found');
    }
    console.log('Forms initialized successfully');
  } catch (error) {
    console.error('Error initializing forms:', error);
  }
}

// Modal functionality
function initializeModals() {
  try {
    if (dom.helpLink) {
      dom.helpLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (dom.helpModal) dom.helpModal.classList.add('visible');
      });
    } else {
      console.warn('Help link not found');
    }

    if(dom.helpCloseBtn) {
      dom.helpCloseBtn.addEventListener('click', () => {
        if (dom.helpModal) dom.helpModal.classList.remove('visible');
      });
    } else {
      console.warn('Help close button not found');
    }

    if(dom.helpModal) {
      dom.helpModal.addEventListener('click', (e) => {
        if (e.target === dom.helpModal) {
          dom.helpModal.classList.remove('visible');
        }
      });
    } else {
      console.warn('Help modal not found');
    }
    console.log('Modals initialized successfully');
  } catch (error) {
    console.error('Error initializing modals:', error);
  }
}

// Handle search form submission
async function handleSearch(e) {
  e.preventDefault();
  const runBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = runBtn.textContent;
  
  runBtn.textContent = 'Searching...';
  runBtn.disabled = true;

  clearResults();

  const query = document.getElementById('query').value.trim();
  const gl = document.getElementById('gl').value.trim() || 'us';
  const num = parseInt(document.getElementById('num').value || '10', 10);
  
  if (!query) {
    showMessage('Please enter a search query.', 'error');
    runBtn.textContent = originalBtnText;
    runBtn.disabled = false;
    return;
  }
  
  try {
    const response = await fetch('/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, gl: gl.toLowerCase(), num })
    });
    
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    
    const data = await response.json();
    
    if (data.error) {
      showMessage(data.error, 'error');
    } else if (data.results && data.results.length > 0) {
      displayResults(data.results);
    } else {
      showMessage('No results found.', 'info');
    }
  } catch (error) {
    console.error('Search error:', error);
    showMessage('Search failed. Please try again.', 'error');
  } finally {
    runBtn.textContent = originalBtnText;
    runBtn.disabled = false;
  }
}

// Handle crawl form submission
async function handleCrawl(e) {
    e.preventDefault();
    const crawlBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = crawlBtn.textContent;

    crawlBtn.textContent = 'Crawling...';
    crawlBtn.disabled = true;

    dom.crawlStatus.style.display = 'block';
    dom.crawlLog.innerHTML = '';

    const formData = new FormData(dom.crawlForm);

    try {
        const response = await fetch('/intelligent-crawl', {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            lines.forEach(line => {
                try {
                    const data = JSON.parse(line);
                    const logEntry = document.createElement('div');
                    logEntry.className = `crawl-status-${data.status}`;
                    
                    let message = `[${data.status.toUpperCase()}]`;
                    if (data.message) {
                        message += `: ${data.message}`;
                    } else if (data.result) {
                        message += `: Crawled ${data.result.url}`;
                    }
                    
                    logEntry.textContent = message;
                    dom.crawlLog.appendChild(logEntry);
                    dom.crawlLog.scrollTop = dom.crawlLog.scrollHeight; // Auto-scroll
                } catch (e) {
                    console.warn('Could not parse stream line:', line);
                }
            });
        }

    } catch (error) {
        console.error('Crawl failed:', error);
        const errorEntry = document.createElement('div');
        errorEntry.className = 'crawl-status-error';
        errorEntry.textContent = `[ERROR] Crawl failed: ${error.message}`;
        dom.crawlLog.appendChild(errorEntry);
    } finally {
        crawlBtn.textContent = originalBtnText;
        crawlBtn.disabled = false;
    }
}


// Display search results
function displayResults(results) {
  if (!dom.searchResultsList) return;
  
  dom.searchResultsList.innerHTML = '';
  
  results.forEach((result, index) => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.style.animationDelay = `${index * 0.05}s`;
    resultCard.innerHTML = `
      <h4><a href="${result.link}" target="_blank" rel="noopener noreferrer">${result.title}</a></h4>
      <a href="${result.link}" target="_blank" rel="noopener noreferrer" class="link">${result.link}</a>
      <p>${result.snippet}</p>
    `;
    dom.searchResultsList.appendChild(resultCard);
  });
  
  lastJson = results;
  dom.searchResultsWrapper.classList.add('visible');
}

// Show temporary message (Toast notification)
function showMessage(text, type = 'info') {
    const messageContainer = document.createElement('div');
    messageContainer.className = `toast-message toast-${type}`;
    messageContainer.textContent = text;
    document.body.appendChild(messageContainer);

    const style = document.head.querySelector('#toast-style') || document.createElement('style');
    style.id = 'toast-style';
    style.innerHTML = `
        .toast-message {
            position: fixed; bottom: 20px; right: 20px; padding: 12px 20px;
            border-radius: 8px; color: #fff; font-weight: 500; z-index: 9999;
            animation: toast-in 0.3s ease, toast-out 0.3s ease 4.7s;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        .toast-info { background: #1f2937; } .toast-success { background: #10B981; }
        .toast-error { background: #EF4444; }
        @keyframes toast-in { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toast-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }
    `;
    if (!document.head.querySelector('#toast-style')) {
      document.head.appendChild(style);
    }

    setTimeout(() => { messageContainer.remove(); }, 5000);
}

// Download JSON
function downloadJson() {
  if (!lastJson || lastJson.length === 0) {
    showMessage('No results to download', 'error');
    return;
  }
  
  const blob = new Blob([JSON.stringify(lastJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'search_results.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showMessage('Results downloaded', 'success');
}

// Clear search results
function clearResults() {
  if (dom.searchResultsList) {
    dom.searchResultsList.innerHTML = '';
  }
  lastJson = null;
  dom.searchResultsWrapper.classList.remove('visible');
}