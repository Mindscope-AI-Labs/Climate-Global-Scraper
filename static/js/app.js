// --- app.js (or script.js) ---

console.log('Loading app.js...');
const dom = {};
let currentChatSessionId = null;
let currentSearchType = 'search'; // Default search type

document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();
  initializeSidebar();
  initializeNavigation();
  initializeForms();
  initializeModals();
  initializeFilters(); // Initialize the new search filters
  loadAndDisplayHistory();
  console.log('App initialization complete');
});

function cacheDOM() {
  dom.searchForm = document.getElementById('searchForm');
  dom.searchResultsWrapper = document.getElementById('searchResultsWrapper');
  dom.searchResultsList = document.getElementById('searchResultsList');
  dom.summaryModal = document.getElementById('summaryModal');
  dom.summaryModalContent = document.getElementById('summaryModalContent');
  dom.summaryCloseBtn = document.getElementById('summaryCloseBtn');
  dom.ingestForm = document.getElementById('ingestForm');
  dom.ingestUrlInput = document.getElementById('ingestUrl');
  dom.ingestStatus = document.getElementById('ingestStatus');
  dom.chatContainer = document.getElementById('chatContainer');
  dom.chatForm = document.getElementById('chatForm');
  dom.chatWindow = document.getElementById('chatWindow');
  dom.chatInput = document.getElementById('chatInput');
  dom.sidebar = document.getElementById('sidebar');
  dom.sidebarToggle = document.getElementById('sidebarToggle');
  dom.sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
  dom.navItems = document.querySelectorAll('.nav-item');
  dom.contentSections = document.querySelectorAll('.content-section');
  dom.helpModal = document.getElementById('helpModal');
  dom.helpLink = document.getElementById('helpLink');
  dom.helpCloseBtn = document.getElementById('helpCloseBtn');
  dom.searchHistoryList = document.getElementById('searchHistoryList');
  dom.chatHistoryList = document.getElementById('chatHistoryList');
  dom.searchFilters = document.getElementById('searchFilters');
}

function initializeForms() {
  if (dom.searchForm) dom.searchForm.addEventListener('submit', handleSearch);
  if (dom.ingestForm) dom.ingestForm.addEventListener('submit', handleIngest);
  if (dom.chatForm) dom.chatForm.addEventListener('submit', handleChatMessage);
}

function initializeFilters() {
    if (!dom.searchFilters) return;
    dom.searchFilters.addEventListener('click', (e) => {
        const button = e.target.closest('.filter-btn');
        if (!button) return;
        dom.searchFilters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        currentSearchType = button.dataset.type;
        console.log(`Search type set to: ${currentSearchType}`);
    });
}

function initializeSidebar() {
  if (!dom.sidebar || !dom.sidebarToggle) return;
  dom.sidebarToggle.addEventListener('click', () => dom.sidebar.classList.toggle('collapsed'));
  if (dom.sidebarToggleMobile) dom.sidebarToggleMobile.addEventListener('click', () => dom.sidebar.classList.toggle('open'));
}

function initializeNavigation() {
  if (!dom.navItems) return;
  dom.navItems.forEach(item => {
    item.addEventListener('click', function(e) {
      e.preventDefault();
      const targetSectionId = this.getAttribute('data-section');
      dom.navItems.forEach(nav => nav.classList.remove('active'));
      this.classList.add('active');
      dom.contentSections.forEach(section => section.classList.toggle('active', section.id === `${targetSectionId}-section`));
      if (window.innerWidth <= 768) dom.sidebar.classList.remove('open');
      if (targetSectionId === 'history') loadAndDisplayHistory();
    });
  });
}

function initializeModals() {
  if (dom.helpLink) dom.helpLink.addEventListener('click', e => { e.preventDefault(); dom.helpModal?.classList.add('visible'); });
  if (dom.helpCloseBtn) dom.helpCloseBtn.addEventListener('click', () => dom.helpModal?.classList.remove('visible'));
  if (dom.helpModal) dom.helpModal.addEventListener('click', e => { if (e.target === dom.helpModal) dom.helpModal.classList.remove('visible'); });
  if (dom.summaryCloseBtn) dom.summaryCloseBtn.addEventListener('click', () => dom.summaryModal?.classList.remove('visible'));
  if (dom.summaryModal) dom.summaryModal.addEventListener('click', e => { if (e.target === dom.summaryModal) dom.summaryModal.classList.remove('visible'); });
}

async function loadAndDisplayHistory() {
    try {
        const response = await fetch('/history');
        if (!response.ok) throw new Error("Failed to fetch history");
        const history = await response.json();
        dom.searchHistoryList.innerHTML = history.searches.map(item => `<li><a href="#" data-query="${item.query}">${item.query}</a></li>`).join('');
        dom.searchHistoryList.querySelectorAll('a').forEach(a => a.addEventListener('click', handleSearchHistoryClick));
        dom.chatHistoryList.innerHTML = history.chats.map(item => `<li><a href="#" data-url="${item.url}" data-session-id="${item.session_id}">Chat with...<span class="history-url">${item.url}</span></a></li>`).join('');
        dom.chatHistoryList.querySelectorAll('a').forEach(a => a.addEventListener('click', handleChatHistoryClick));
    } catch (error) {
        console.error("Failed to load history:", error);
    }
}

function handleSearchHistoryClick(e) {
    e.preventDefault();
    const query = e.currentTarget.dataset.query;
    document.querySelector('a[data-section="search"]').click();
    dom.searchForm.querySelector('input').value = query;
    dom.searchForm.requestSubmit();
}

function handleChatHistoryClick(e) {
    e.preventDefault();
    const { url, sessionId } = e.currentTarget.dataset;
    currentChatSessionId = sessionId;
    document.querySelector('a[data-section="chat"]').click();
    dom.ingestForm.style.display = 'block';
    dom.ingestUrlInput.value = '';
    dom.ingestStatus.textContent = `Resumed chat session for: ${url}`;
    dom.ingestStatus.style.display = 'block';
    dom.chatContainer.style.display = 'block';
    dom.chatWindow.innerHTML = '<div class="ai-message">Resumed session. Ask me anything about the site content.</div>';
    dom.chatInput.disabled = false;
    dom.chatInput.placeholder = "Ask a question about the website...";
    dom.chatInput.focus();
}

async function handleSearch(e) {
  e.preventDefault();
  const runBtn = e.target.querySelector('button[type="submit"]');
  const originalBtnText = runBtn.textContent;
  runBtn.textContent = 'Searching...'; runBtn.disabled = true;
  try {
    const query = document.getElementById('query').value.trim();
    const response = await fetch('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, type: currentSearchType }) });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      displayResults(data.results);
      loadAndDisplayHistory();
    } else {
      dom.searchResultsList.innerHTML = '<p style="padding: 16px;">No results found.</p>';
      dom.searchResultsWrapper.classList.add('visible');
    }
  } catch (error) {
    console.error('Search error:', error);
    dom.searchResultsList.innerHTML = `<p style="padding: 16px; color: #EF4444;">Search failed: ${error.message}</p>`;
  } finally {
    runBtn.textContent = originalBtnText; runBtn.disabled = false;
  }
}

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
        <button class="btn btn-chat" data-url="${result.link}">Chat with Site</button>
      </div>
    `;
    dom.searchResultsList.appendChild(resultCard);
  });
  dom.searchResultsList.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', handleViewSummary));
  dom.searchResultsList.querySelectorAll('.btn-chat').forEach(b => b.addEventListener('click', handleChatWithSite));
  dom.searchResultsWrapper.classList.add('visible');
}

async function handleViewSummary(e) {
  const url = e.target.dataset.url; if (!url || url === '#') return;
  dom.summaryModal.classList.add('visible');
  dom.summaryModalContent.innerHTML = `<h2>Extracting Information...</h2><p>Please wait while we analyze the page.</p>`;
  try {
    const response = await fetch('/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    if (!response.ok) { const data = await response.json(); throw new Error(data.detail); }
    const data = await response.json();
    
    // Extract all the information from the response
    const title = data.subject_name || data.title;
    const emails = data.contacts?.emails || [];
    const orgs = data.contacts?.organizations || [];
    const funds = data.funds_money_investments || [];
    const projects = data.projects_activities || [];
    const locations = data.locations || [];
    
    // Format different types of information
    const formatItems = (items, type) => {
      if (!items || items.length === 0) return '<p class="no-data">None found.</p>';
      return items.map(item => `<li class="info-item">${item}</li>`).join('');
    };
    
    // Format entities with proper labels
    const emailsHTML = emails.map(e => `<li class="entity-pill"><span class="pill-label">Email:</span>${e}</li>`).join('');
    const orgsHTML = orgs.map(o => `<li class="entity-pill"><span class="pill-label">Organization:</span>${o}</li>`).join('');
    const fundsHTML = funds.map(f => `<li class="entity-pill"><span class="pill-label">Fund:</span>${f}</li>`).join('');
    const projectsHTML = projects.map(p => `<li class="entity-pill"><span class="pill-label">Project:</span>${p}</li>`).join('');
    const locationsHTML = locations.map(l => `<li class="entity-pill"><span class="pill-label">Location:</span>${l}</li>`).join('');
    
    // Combine all entities
    const allEntities = [emailsHTML, orgsHTML, fundsHTML, projectsHTML, locationsHTML].filter(html => html);
    const entitiesHTML = allEntities.length > 0 ? `<ul class="entity-pills">${allEntities.join('')}</ul>` : '<p class="no-data">No entities found.</p>';
    
    dom.summaryModalContent.innerHTML = `
      <div class="summary-modal-header">
        <h2>${title}</h2>
        <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
      </div>
      
      <div class="summary-metadata">
        <div class="metadata-item">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" />
          </svg>
          <span>${data.publication_date || "Not found"}</span>
        </div>
        <div class="metadata-item">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span>${data.location || "Not specified"}</span>
        </div>
      </div>

      <div class="summary-section">
        <h3>Summary</h3>
        <p>${data.summary}</p>
      </div>
      
      <div class="summary-section">
        <h3>Primary Subject</h3>
        <div class="subject-info">
          <p><strong>${title}</strong> is the primary subject of this page.</p>
        </div>
      </div>
      
      <div class="summary-section">
        <h3>Funds, Money & Investments</h3>
        <div class="funds-info">
          ${formatItems(funds, 'funds')}
        </div>
      </div>
      
      <div class="summary-section">
        <h3>Projects & Activities</h3>
        <div class="projects-info">
          ${formatItems(projects, 'projects')}
        </div>
      </div>
      
      <div class="summary-section">
        <h3>Locations</h3>
        <div class="locations-info">
          ${formatItems(locations, 'locations')}
        </div>
      </div>
      
      <div class="summary-section">
        <h3>Organizations</h3>
        <div class="organizations-info">
          ${formatItems(orgs, 'organizations')}
        </div>
      </div>
      
      <div class="summary-section">
        <h3>Contact Information</h3>
        <div class="contacts-info">
          ${emails.length > 0 ? `<ul class="contact-list">${emails.map(email => `<li class="contact-item">${email}</li>`).join('')}</ul>` : '<p class="no-data">No contact information found.</p>'}
        </div>
      </div>
      
      <div class="summary-section">
        <h3>All Extracted Entities</h3>
        <div class="entities-container">
          ${entitiesHTML}
        </div>
      </div>
    `;
  } catch (error) {
    console.error('Failed to get summary:', error);
    dom.summaryModalContent.innerHTML = `<h2>Error</h2><p>Could not retrieve summary.</p><p style="color: #EF4444;"><strong>Details:</strong> ${error.message}</p>`;
  }
}

function handleChatWithSite(e) {
    const url = e.target.dataset.url; if (!url) return;
    document.querySelector('a[data-section="chat"]').click();
    if (dom.ingestUrlInput) {
        dom.ingestUrlInput.value = url;
        dom.ingestUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    if (dom.ingestForm) dom.ingestForm.requestSubmit();
}

async function handleIngest(e) {
  e.preventDefault();
  const url = dom.ingestUrlInput.value.trim(); if (!url) return;
  const ingestButton = dom.ingestForm.querySelector('button');
  ingestButton.disabled = true;
  dom.ingestStatus.style.display = 'block';
  dom.ingestStatus.textContent = `➡️ Starting ingestion for ${url}...`;
  dom.chatContainer.style.display = 'block';
  dom.chatWindow.innerHTML = '<div class="ai-message">Please wait, processing the website...</div>';
  dom.chatInput.disabled = true;
  dom.chatInput.placeholder = "Waiting for ingestion to complete...";
  try {
    const response = await fetch('/ingest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail);
    currentChatSessionId = data.session_id;
    pollIngestStatus(data.session_id);
  } catch (error) {
    console.error('Ingest failed:', error);
    dom.ingestStatus.textContent = `❌ Error starting ingest: ${error.message}`;
    ingestButton.disabled = false;
    dom.chatInput.placeholder = "Ingestion failed. Please try another URL.";
  }
}

function pollIngestStatus(sessionId) {
    const intervalId = setInterval(async () => {
        try {
            const response = await fetch(`/ingest-status/${sessionId}`);
            const data = await response.json();
            if (data.status === 'ready') {
                clearInterval(intervalId);
                dom.ingestStatus.textContent = `✅ Site is ready! You can now ask questions below.`;
                dom.chatWindow.innerHTML = '<div class="ai-message">Hello! Ask me anything about the site content.</div>';
                dom.chatInput.disabled = false;
                dom.chatInput.placeholder = "Ask a question about the website...";
                dom.ingestForm.querySelector('button').disabled = false;
                dom.ingestForm.style.display = 'none';
                loadAndDisplayHistory();
            } else if (data.status === 'error') {
                 clearInterval(intervalId);
                 dom.ingestStatus.textContent = `❌ Ingestion failed during processing.`;
                 dom.ingestForm.querySelector('button').disabled = false;
            }
        } catch (error) {
            clearInterval(intervalId);
            dom.ingestStatus.textContent = `❌ Error checking status. Please try again.`;
            dom.ingestForm.querySelector('button').disabled = false;
        }
    }, 3000);
}

async function handleChatMessage(e) {
  e.preventDefault();
  const question = dom.chatInput.value.trim(); if (!question || !currentChatSessionId) return;
  appendMessage(question, 'user-message');
  dom.chatInput.value = '';
  const thinkingIndicator = appendMessage('Thinking...', 'ai-message');
  try {
    const response = await fetch('/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, session_id: currentChatSessionId }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.detail);
    thinkingIndicator.remove();
    appendMessage(data.answer, 'ai-message');
  } catch (error) {
    thinkingIndicator.remove();
    appendMessage(`Sorry, an error occurred: ${error.message}`, 'ai-message');
  }
}

function appendMessage(text, className) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `chat-message ${className}`;
  messageDiv.textContent = text;
  dom.chatWindow.appendChild(messageDiv);
  dom.chatWindow.scrollTop = dom.chatWindow.scrollHeight;
  return messageDiv;
}