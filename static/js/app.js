// Optimized UI/UX with animations and crawl streaming
console.log('Loading app.js...');

// Global state
let lastJson = null;

// DOM Elements Cache
const dom = {};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM Content Loaded - Initializing app...');
  
  // Cache all DOM elements
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
  dom.summaryModal = document.getElementById('summaryModal');
  dom.summaryModalContent = document.getElementById('summaryModalContent');
  dom.summaryCloseBtn = document.getElementById('summaryCloseBtn');

  initializeSidebar();
  initializeNavigation();
  initializeForms();
  initializeModals();

  console.log('App initialization complete');
});

// Sidebar functionality
function initializeSidebar() {
  if (!dom.sidebar || !dom.sidebarToggle) return;
  dom.sidebarToggle.addEventListener('click', () => dom.sidebar.classList.toggle('collapsed'));
  if(dom.sidebarToggleMobile) {
    dom.sidebarToggleMobile.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
  }
}

// Navigation functionality
function initializeNavigation() {
  if (!dom.navItems) return;
  dom.navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const targetSectionId = this.getAttribute('data-section');
      dom.navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      dom.contentSections.forEach(section => {
        section.classList.toggle('active', section.id === `${targetSectionId}-section`);
      });
      if (window.innerWidth <= 768) dom.sidebar.classList.remove('open');
    });
  });
}

// Form initialization
function initializeForms() {
  if (dom.searchForm) dom.searchForm.addEventListener('submit', handleSearch);
  if (dom.crawlForm) dom.crawlForm.addEventListener('submit', handleCrawl);
  if (dom.downloadBtn) dom.downloadBtn.addEventListener('click', downloadJson);
  if (dom.clearBtn) dom.clearBtn.addEventListener('click', clearResults);
}

// Modal functionality
function initializeModals() {
    // Help Modal
    if (dom.helpLink) dom.helpLink.addEventListener('click', e => { e.preventDefault(); dom.helpModal?.classList.add('visible'); });
    if(dom.helpCloseBtn) dom.helpCloseBtn.addEventListener('click', () => dom.helpModal?.classList.remove('visible'));
    if(dom.helpModal) dom.helpModal.addEventListener('click', e => { if (e.target === dom.helpModal) dom.helpModal.classList.remove('visible'); });

    // Summary Modal
    if(dom.summaryCloseBtn) dom.summaryCloseBtn.addEventListener('click', () => dom.summaryModal?.classList.remove('visible'));
    if(dom.summaryModal) dom.summaryModal.addEventListener('click', e => { if (e.target === dom.summaryModal) dom.summaryModal.classList.remove('visible'); });
}

// Handle search form submission
async function handleSearch(e) {
  e.preventDefault();
  const runBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = runBtn.textContent;
  
  runBtn.textContent = 'Searching...'; runBtn.disabled = true;
  clearResults();

  const query = document.getElementById('query').value.trim();
  const gl = document.getElementById('gl').value.trim() || 'us';
  const num = parseInt(document.getElementById('num').value || '10', 10);
  
  if (!query) { showMessage('Please enter a search query.', 'error'); runBtn.textContent = originalBtnText; runBtn.disabled = false; return; }
  
  try {
    const response = await fetch('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, gl: gl.toLowerCase(), num }) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.error) { showMessage(data.error, 'error'); } 
    else if (data.results && data.results.length > 0) { displayResults(data.results); } 
    else { showMessage('No results found.', 'info'); }
  } catch (error) { console.error('Search error:', error); showMessage('Search failed. Please try again.', 'error');
  } finally { runBtn.textContent = originalBtnText; runBtn.disabled = false; }
}

// Handle crawl form submission
async function handleCrawl(e) {
    e.preventDefault();
    const crawlBtn = e.target.querySelector('button[type="submit"]');
    const originalBtnText = crawlBtn.textContent;
    crawlBtn.textContent = 'Crawling...'; crawlBtn.disabled = true;
    dom.crawlStatus.style.display = 'block'; dom.crawlLog.innerHTML = '';
    const formData = new FormData(dom.crawlForm);

    try {
        const response = await fetch('/intelligent-crawl', { method: 'POST', body: formData });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
            const { done, value } = await reader.read(); if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            lines.forEach(line => {
                try {
                    const data = JSON.parse(line);
                    const logEntry = document.createElement('div');
                    logEntry.className = `crawl-status-${data.status}`;
                    let message = `[${data.status.toUpperCase()}]`;
                    if (data.message) { message += `: ${data.message}`; } 
                    else if (data.result) { message += `: Crawled ${data.result.url}`; }
                    logEntry.textContent = message;
                    dom.crawlLog.appendChild(logEntry);
                    dom.crawlLog.scrollTop = dom.crawlLog.scrollHeight;
                } catch (e) { console.warn('Could not parse stream line:', line); }
            });
        }
    } catch (error) {
        console.error('Crawl failed:', error);
        const errorEntry = document.createElement('div');
        errorEntry.className = 'crawl-status-error';
        errorEntry.textContent = `[ERROR] Crawl failed: ${error.message}`;
        dom.crawlLog.appendChild(errorEntry);
    } finally { crawlBtn.textContent = originalBtnText; crawlBtn.disabled = false; }
}

// Display search results with 'View Summary' button
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
      <div class="result-card-actions">
        <button class="btn btn-view" data-url="${result.link}">View Summary</button>
      </div>
    `;
    dom.searchResultsList.appendChild(resultCard);
  });
  // Add event listeners to the new buttons
  dom.searchResultsList.querySelectorAll('.btn-view').forEach(button => {
      button.addEventListener('click', handleViewSummary);
  });
  lastJson = results;
  dom.searchResultsWrapper.classList.add('visible');
}

// This should be the content of your handleViewSummary function in app.js

async function handleViewSummary(e) {
    const url = e.target.dataset.url; if (!url) return;
    
    dom.summaryModal.classList.add('visible');
    dom.summaryModalContent.innerHTML = `<h2>Extracting Information...</h2><p>Please wait while we analyze the page.</p>`;

    try {
        const response = await fetch('/summarize', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ url }) 
        });

        if (!response.ok) { 
            const errorData = await response.json(); 
            throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`); 
        }

        const data = await response.json();
        
        // --- THIS IS THE CRITICAL FIX ---
        // It safely handles cases where 'emails' or 'organizations' might be null or undefined.
        const emails = data.contacts?.emails || [];
        const organizations = data.contacts?.organizations || [];

        let emailsHTML = emails.length > 0
            ? emails.map(email => `<li class="entity-pill"><span class="pill-label">Email:</span>${email}</li>`).join('')
            : '';

        let orgsHTML = organizations.length > 0
            ? organizations.map(org => `<li class="entity-pill"><span class="pill-label">Entity:</span>${org}</li>`).join('')
            : '';
            
        let entitiesHTML = (emailsHTML || orgsHTML) ? `<ul class="entity-pills">${emailsHTML}${orgsHTML}</ul>` : `<p>None found.</p>`;

        dom.summaryModalContent.innerHTML = `
            <div class="summary-modal-header">
                <h2>${data.title}</h2>
                <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
            </div>

            <div class="summary-metadata">
                <div class="metadata-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>
                    <span>${data.publication_date || "Not found"}</span>
                </div>
                <div class="metadata-item">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
                    <span>${data.location || "Not specified"}</span>
                </div>
            </div>

            <div class="summary-section">
                <h3>Summary</h3>
                <p>${data.summary}</p>
            </div>
            
            <div class="summary-section">
                <h3>Extracted Entities</h3>
                ${entitiesHTML}
            </div>
        `;

    } catch (error) {
        console.error('Failed to get summary:', error);
        dom.summaryModalContent.innerHTML = `<h2>Error</h2><p>Could not retrieve summary for this page.</p><p style="color: #EF4444;"><strong>Details:</strong> ${error.message}</p>`;
    }
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
        .toast-message { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 8px; color: #fff; font-weight: 500; z-index: 9999; animation: toast-in 0.3s ease, toast-out 0.3s ease 4.7s; box-shadow: 0 5px 15px rgba(0,0,0,0.3); }
        .toast-info { background: #1f2937; } .toast-success { background: #10B981; } .toast-error { background: #EF4444; }
        @keyframes toast-in { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes toast-out { from { transform: translateY(0); opacity: 1; } to { transform: translateY(100%); opacity: 0; } }`;
    if (!document.head.querySelector('#toast-style')) document.head.appendChild(style);
    setTimeout(() => { messageContainer.remove(); }, 5000);
}

// Download JSON
function downloadJson() {
  if (!lastJson || lastJson.length === 0) { showMessage('No results to download', 'error'); return; }
  const blob = new Blob([JSON.stringify(lastJson, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'search_results.json';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showMessage('Results downloaded', 'success');
}

// Clear search results
function clearResults() {
  if (dom.searchResultsList) dom.searchResultsList.innerHTML = '';
  lastJson = null;
  dom.searchResultsWrapper.classList.remove('visible');
}