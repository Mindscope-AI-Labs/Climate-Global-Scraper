// --- app.js (or script.js) ---

console.log('Loading app.js...');
const dom = {};
let currentChatSessionId = null;
let currentSearchType = 'search'; // Default search type
let settings = {
  theme: 'dark',
  resultsPerPage: 10,
  autoSaveResults: true
};

document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();
  initializeSidebar();
  initializeNavigation();
  initializeForms();
  initializeModals();
  initializeFilters();
  initializeSettings();
  // Don't auto-load history, let navigation clicks do it
  console.log('App initialization complete');
});

function cacheDOM() {
  // Search
  dom.searchForm = document.getElementById('searchForm');
  dom.searchResultsWrapper = document.getElementById('searchResultsWrapper');
  dom.searchResultsList = document.getElementById('searchResultsList');
  dom.searchFilters = document.getElementById('searchFilters');

  // Summary Modal
  dom.summaryModal = document.getElementById('summaryModal');
  dom.summaryModalContent = document.getElementById('summaryModalContent');
  dom.summaryCloseBtn = document.getElementById('summaryCloseBtn');
  
  // Chat
  dom.ingestForm = document.getElementById('ingestForm');
  dom.ingestUrlInput = document.getElementById('ingestUrl');
  dom.ingestStatus = document.getElementById('ingestStatus');
  dom.chatContainer = document.getElementById('chatContainer');
  dom.chatForm = document.getElementById('chatForm');
  dom.chatWindow = document.getElementById('chatWindow');
  dom.chatInput = document.getElementById('chatInput');

  // Navigation & Layout
  dom.sidebar = document.getElementById('sidebar');
  dom.sidebarToggle = document.getElementById('sidebarToggle');
  dom.sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
  dom.navItems = document.querySelectorAll('.nav-item');
  dom.contentSections = document.querySelectorAll('.content-section');
  
  // Help Modal
  dom.helpModal = document.getElementById('helpModal');
  dom.helpLink = document.getElementById('helpLink');
  dom.helpCloseBtn = document.getElementById('helpCloseBtn');
  
  // History & Knowledge Base
  dom.searchHistoryList = document.getElementById('searchHistoryList');
  dom.chatHistoryList = document.getElementById('chatHistoryList');
  dom.knowledgeBaseList = document.getElementById('knowledgeBaseList');
  
  // Settings
  dom.themeSelect = document.getElementById('themeSelect');
  dom.resultsPerPage = document.getElementById('resultsPerPage');
  dom.autoSaveResults = document.getElementById('autoSaveResults');
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
      if (targetSectionId === 'knowledge-base') loadAndDisplayKnowledgeBase();
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
        // Show loading state
        showHistoryLoading();
        
        const response = await fetch('/history');
        if (!response.ok) throw new Error("Failed to fetch history");
        const history = await response.json();
        
        // Update statistics
        updateHistoryStats(history.searches.length, history.chats.length);
        
        // Display search history
        displaySearchHistory(history.searches);
        
        // Display chat history
        displayChatHistory(history.chats);
        
    } catch (error) {
        console.error("Failed to load history:", error);
        showHistoryError();
    }
}

function showHistoryLoading() {
    dom.searchHistoryList.innerHTML = '<div class="history-loading">Loading search history...</div>';
    dom.chatHistoryList.innerHTML = '<div class="history-loading">Loading chat history...</div>';
}

function showHistoryError() {
    dom.searchHistoryList.innerHTML = `
        <div class="history-error">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Failed to load search history</p>
            <button onclick="loadAndDisplayHistory()" class="btn btn-ghost">Retry</button>
        </div>
    `;
    dom.chatHistoryList.innerHTML = `
        <div class="history-error">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>Failed to load chat history</p>
            <button onclick="loadAndDisplayHistory()" class="btn btn-ghost">Retry</button>
        </div>
    `;
}

function updateHistoryStats(searchCount, chatCount) {
    document.getElementById('searchHistoryCount').textContent = searchCount;
    document.getElementById('chatHistoryCount').textContent = chatCount;
    document.getElementById('searchCount').textContent = `${searchCount} item${searchCount !== 1 ? 's' : ''}`;
    document.getElementById('chatCount').textContent = `${chatCount} item${chatCount !== 1 ? 's' : ''}`;
}

function displaySearchHistory(searches) {
    const searchEmpty = document.getElementById('searchHistoryEmpty');
    const searchList = dom.searchHistoryList;
    
    if (searches.length === 0) {
        searchList.style.display = 'none';
        searchEmpty.style.display = 'flex';
    } else {
        searchList.style.display = 'block';
        searchEmpty.style.display = 'none';
        
        searchList.innerHTML = searches.map((item, index) => {
            const date = new Date(item.timestamp || Date.now());
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return `
                <li style="animation-delay: ${index * 0.05}s">
                    <a href="#" data-query="${item.query}">
                        <div class="history-item-content">
                            <div class="history-item-main">${item.query}</div>
                            <div class="history-item-meta">
                                <span class="history-item-time">${formattedDate} ${formattedTime}</span>
                                <span class="history-item-type">${item.type || 'web'}</span>
                            </div>
                        </div>
                    </a>
                </li>
            `;
        }).join('');
        
        searchList.querySelectorAll('a').forEach(a => a.addEventListener('click', handleSearchHistoryClick));
    }
}

function displayChatHistory(chats) {
    const chatEmpty = document.getElementById('chatHistoryEmpty');
    const chatList = dom.chatHistoryList;
    
    if (chats.length === 0) {
        chatList.style.display = 'none';
        chatEmpty.style.display = 'flex';
    } else {
        chatList.style.display = 'block';
        chatEmpty.style.display = 'none';
        
        chatList.innerHTML = chats.map((item, index) => {
            const date = new Date(item.timestamp || Date.now());
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const urlDisplay = item.url.length > 30 ? item.url.substring(0, 30) + '...' : item.url;
            
            return `
                <li style="animation-delay: ${index * 0.05}s">
                    <a href="#" data-url="${item.url}" data-session-id="${item.session_id}">
                        <div class="history-item-content">
                            <div class="history-item-main">Chat with ${urlDisplay}</div>
                            <div class="history-item-meta">
                                <span class="history-item-time">${formattedDate} ${formattedTime}</span>
                                <span class="history-url">${urlDisplay}</span>
                            </div>
                        </div>
                    </a>
                </li>
            `;
        }).join('');
        
        chatList.querySelectorAll('a').forEach(a => a.addEventListener('click', handleChatHistoryClick));
    }
}

// Clear history functions
async function clearSearchHistory() {
    if (!confirm('Are you sure you want to clear all search history? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/clear-search-history', { method: 'POST' });
        if (!response.ok) throw new Error("Failed to clear search history");
        
        // Refresh history display
        loadAndDisplayHistory();
        
        // Show success feedback
        showNotification('Search history cleared successfully', 'success');
    } catch (error) {
        console.error("Failed to clear search history:", error);
        showNotification('Failed to clear search history', 'error');
    }
}

async function clearChatHistory() {
    if (!confirm('Are you sure you want to clear all chat history? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch('/clear-chat-history', { method: 'POST' });
        if (!response.ok) throw new Error("Failed to clear chat history");
        
        // Refresh history display
        loadAndDisplayHistory();
        
        // Show success feedback
        showNotification('Chat history cleared successfully', 'success');
    } catch (error) {
        console.error("Failed to clear chat history:", error);
        showNotification('Failed to clear chat history', 'error');
    }
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => document.body.removeChild(notification), 300);
    }, 3000);
}

// Initialize clear history buttons
document.addEventListener('DOMContentLoaded', function() {
    const clearSearchBtn = document.getElementById('clearSearchHistory');
    const clearChatBtn = document.getElementById('clearChatHistory');
    
    if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', clearSearchHistory);
    }
    
    if (clearChatBtn) {
        clearChatBtn.addEventListener('click', clearChatHistory);
    }
});

async function loadAndDisplayKnowledgeBase() {
    try {
        const response = await fetch('/knowledge-base');
        if (!response.ok) throw new Error("Failed to fetch knowledge base");
        const entries = await response.json();
        
        if (entries.length === 0) {
            dom.knowledgeBaseList.innerHTML = '<p>Your knowledge base is empty. Save search results to add them here.</p>';
            return;
        }

        // Create a two-column layout
        dom.knowledgeBaseList.innerHTML = `
            <div class="kb-grid-container">
                <div class="kb-cards-grid">
                    ${entries.map((entry, index) => `
                        <div class="kb-card-square" data-id="${entry.id}" style="animation-delay: ${index * 0.05}s">
                            <div class="kb-card-header">
                                <h4>${entry.title || 'Untitled'}</h4>
                                <div class="kb-card-actions">
                                    <button class="btn btn-view-small" data-id="${entry.id}" title="View Details">
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </button>
                                    <button class="btn btn-delete-small" data-id="${entry.id}" title="Delete">
                                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div class="kb-card-content">
                                <p class="kb-card-summary">${entry.summary || 'No summary available.'}</p>
                                <div class="kb-card-meta">
                                    <span class="kb-card-date">${new Date(entry.saved_at).toLocaleDateString()}</span>
                                    ${entry.location ? `<span class="kb-card-location">${entry.location}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="kb-detail-panel" id="kbDetailPanel">
                    <div class="kb-detail-placeholder">
                        <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 15.75l-2.489-2.489m0 0a6 6 0 10-8.262-8.262 6 6 0 008.262 8.262z" />
                        </svg>
                        <p>Select a card to view details</p>
                    </div>
                </div>
            </div>
        `;

        // Store entries globally for detail view
        window.knowledgeBaseEntries = entries;

        // Add event listeners
        dom.knowledgeBaseList.querySelectorAll('.btn-view-small').forEach(btn => btn.addEventListener('click', handleViewKnowledgeBaseEntry));
        dom.knowledgeBaseList.querySelectorAll('.btn-delete-small').forEach(btn => btn.addEventListener('click', handleDeleteKnowledgeBaseEntry));

    } catch (error) {
        console.error("Failed to load knowledge base:", error);
        dom.knowledgeBaseList.innerHTML = `<p style="color: #EF4444;">Error loading knowledge base: ${error.message}</p>`;
    }
}

async function handleViewKnowledgeBaseEntry(e) {
    const entryId = e.target.closest('button').dataset.id;
    const entry = window.knowledgeBaseEntries.find(e => e.id === entryId);
    if (!entry) return;

    const detailPanel = document.getElementById('kbDetailPanel');
    
    const formatList = (items, title) => {
        if (!items || items.length === 0) return `<p class="no-data">No ${title.toLowerCase()} found.</p>`;
        return `<ul class="detail-list">${items.map(item => `<li class="detail-item">${item}</li>`).join('')}</ul>`;
    };

    detailPanel.innerHTML = `
        <div class="kb-detail-content">
            <div class="kb-detail-header">
                <button class="btn btn-close-detail" id="closeDetailBtn">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
                <h2>${entry.title || 'Untitled'}</h2>
                <a href="${entry.link}" target="_blank" rel="noopener noreferrer" class="kb-detail-link">${entry.link}</a>
            </div>
            
            <div class="kb-detail-meta">
                <div class="meta-item">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>${entry.publication_date || "Not found"}</span>
                </div>
                <div class="meta-item">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span>${entry.location || "Not specified"}</span>
                </div>
                <div class="meta-item">
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Saved on ${new Date(entry.saved_at).toLocaleDateString()}</span>
                </div>
            </div>

            <div class="kb-detail-section">
                <h3>Summary</h3>
                <p>${entry.summary || 'No summary available.'}</p>
            </div>
            
            ${entry.subject_name ? `
            <div class="kb-detail-section">
                <h3>Subject</h3>
                <p><strong>${entry.subject_name}</strong></p>
            </div>
            ` : ''}
            
            ${entry.funds_money_investments && entry.funds_money_investments.length > 0 ? `
            <div class="kb-detail-section">
                <h3>Funds, Money & Investments</h3>
                ${formatList(entry.funds_money_investments, 'Funds')}
            </div>
            ` : ''}
            
            ${entry.projects_activities && entry.projects_activities.length > 0 ? `
            <div class="kb-detail-section">
                <h3>Projects & Activities</h3>
                ${formatList(entry.projects_activities, 'Projects')}
            </div>
            ` : ''}
            
            ${entry.locations_mentioned && entry.locations_mentioned.length > 0 ? `
            <div class="kb-detail-section">
                <h3>Mentioned Locations</h3>
                ${formatList(entry.locations_mentioned, 'Locations')}
            </div>
            ` : ''}
            
            ${entry.organizations && entry.organizations.length > 0 ? `
            <div class="kb-detail-section">
                <h3>Mentioned Organizations</h3>
                ${formatList(entry.organizations, 'Organizations')}
            </div>
            ` : ''}
            
            ${entry.emails && entry.emails.length > 0 ? `
            <div class="kb-detail-section">
                <h3>Contact Emails</h3>
                ${formatList(entry.emails, 'Emails')}
            </div>
            ` : ''}
        </div>
    `;

    // Highlight selected card
    document.querySelectorAll('.kb-card-square').forEach(card => card.classList.remove('selected'));
    document.querySelector(`.kb-card-square[data-id="${entryId}"]`).classList.add('selected');

    // Add close button functionality
    document.getElementById('closeDetailBtn').addEventListener('click', () => {
        detailPanel.innerHTML = `
            <div class="kb-detail-placeholder">
                <svg width="48" height="48" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15.75 15.75l-2.489-2.489m0 0a6 6 0 10-8.262-8.262 6 6 0 008.262 8.262z" />
                </svg>
                <p>Select a card to view details</p>
            </div>
        `;
        document.querySelectorAll('.kb-card-square').forEach(card => card.classList.remove('selected'));
    });
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
    dom.ingestUrlInput.value = url; // Pre-fill URL
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
  dom.searchResultsWrapper.classList.remove('visible'); // Hide old results
  try {
    const query = document.getElementById('query').value.trim();
    if (!query) return;
    const response = await fetch('/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, type: currentSearchType }) });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || `HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      displayResults(data.results);
      loadAndDisplayHistory();
    } else {
      dom.searchResultsList.innerHTML = '<p style="padding: 16px;">No results found.</p>';
    }
  } catch (error) {
    console.error('Search error:', error);
    dom.searchResultsList.innerHTML = `<p style="padding: 16px; color: #EF4444;">Search failed: ${error.message}</p>`;
  } finally {
    runBtn.textContent = originalBtnText; runBtn.disabled = false;
    dom.searchResultsWrapper.classList.add('visible');
  }
}

// --- THIS FUNCTION IS NOW CORRECT ---
function displayResults(results) {
  if (!dom.searchResultsList) return;
  dom.searchResultsList.innerHTML = '';
  results.forEach((result, index) => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.style.animationDelay = `${index * 0.05}s`;
    
    // Using template literals and ensuring data attributes are properly encoded
    const title = result.title || '';
    const link = result.link || '#';
    const snippet = result.snippet || '';

    resultCard.innerHTML = `
      <h4><a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a></h4>
      <a href="${link}" target="_blank" rel="noopener noreferrer" class="link">${link}</a>
      <p>${snippet}</p>
      <div class="result-card-actions">
        <button class="btn btn-view" data-url="${link}">View Summary</button>
        <button class="btn btn-save" data-title="${title.replace(/"/g, '&quot;')}" data-link="${link}" data-snippet="${snippet.replace(/"/g, '&quot;')}">Save</button>
        <button class="btn btn-chat" data-url="${link}">Chat with Site</button>
      </div>
    `;
    dom.searchResultsList.appendChild(resultCard);
  });

  // Add event listeners after all cards are in the DOM
  dom.searchResultsList.querySelectorAll('.btn-view').forEach(b => b.addEventListener('click', handleViewSummary));
  dom.searchResultsList.querySelectorAll('.btn-chat').forEach(b => b.addEventListener('click', handleChatWithSite));
  dom.searchResultsList.querySelectorAll('.btn-save').forEach(b => b.addEventListener('click', handleSaveResult));
}

async function handleSaveResult(e) {
    const button = e.target;
    const { title, link, snippet } = button.dataset;
    if (!link || link === '#') return;

    button.textContent = 'Saving...';
    button.disabled = true;

    try {
        // Check if we have summary data from a previous view
        let payload = {
            title: title,
            link: link,
            summary: snippet, // Use snippet as the base summary
        };

        // Try to get enhanced summary data if available
        try {
            const summaryResponse = await fetch('/summarize', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: link })
            });
            
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                // Enhance the payload with detailed summary information
                payload = {
                    ...payload,
                    summary: summaryData.summary || snippet,
                    subject_name: summaryData.subject_name,
                    publication_date: summaryData.publication_date,
                    location: summaryData.location,
                    emails: summaryData.contacts?.emails || [],
                    organizations: summaryData.contacts?.organizations || [],
                    funds_money_investments: summaryData.funds_money_investments || [],
                    projects_activities: summaryData.projects_activities || [],
                    locations_mentioned: summaryData.locations || []
                };
            }
        } catch (summaryError) {
            console.log('Could not fetch enhanced summary, saving with basic data:', summaryError);
            // Continue with basic payload if summary fails
        }
        
        const saveResponse = await fetch('/knowledge-base/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (saveResponse.status === 409) {
            button.textContent = 'Already Saved';
            button.classList.add('saved');
            return;
        }

        if (!saveResponse.ok) {
            const err = await saveResponse.json();
            throw new Error(err.detail || 'Failed to save.');
        }

        button.textContent = 'Saved ✔';
        button.classList.add('saved');

        // Refresh knowledge base if user is on that page
        const kbSection = document.getElementById('knowledge-base-section');
        if (kbSection && kbSection.classList.contains('active')) {
            loadAndDisplayKnowledgeBase();
        }

    } catch (error) {
        console.error('Save error:', error);
        button.textContent = 'Save Failed';
        button.classList.add('error');
        setTimeout(() => {
            button.textContent = 'Save';
            button.disabled = false;
            button.classList.remove('error');
        }, 3000);
    }
}

async function handleDeleteKnowledgeBaseEntry(e) {
    const button = e.target;
    const entryId = button.dataset.id;
    if (!entryId) return;

    if (confirm('Are you sure you want to delete this entry?')) {
        try {
            const response = await fetch(`/knowledge-base/delete/${entryId}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete entry.');
            
            const card = button.closest('.kb-card');
            if (card) {
                card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                card.style.opacity = '0';
                card.style.transform = 'scale(0.95)';
                setTimeout(() => card.remove(), 300);
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Could not delete the entry. Please try again.');
        }
    }
}

async function handleViewSummary(e) {
  const url = e.target.dataset.url; if (!url || url === '#') return;
  dom.summaryModal.classList.add('visible');
  dom.summaryModalContent.innerHTML = `<h2>Extracting Information...</h2><p>Please wait while we analyze the page.</p>`;
  try {
    const response = await fetch('/summarize', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) });
    if (!response.ok) { const data = await response.json(); throw new Error(data.detail); }
    const data = await response.json();
    
    const { 
        subject_name, summary, publication_date, location, contacts,
        funds_money_investments, projects_activities, locations 
    } = data;

    const emails = contacts?.emails || [];
    const orgs = contacts?.organizations || [];

    const formatList = (items, title) => {
        if (!items || items.length === 0) return `<p class="no-data">No ${title.toLowerCase()} found.</p>`;
        return `<ul class="info-list">${items.map(item => `<li class="info-item">${item}</li>`).join('')}</ul>`;
    };

    dom.summaryModalContent.innerHTML = `
      <div class="summary-modal-header">
        <h2>${subject_name}</h2>
        <a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>
      </div>
      
      <div class="summary-metadata">
        <div class="metadata-item">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18" /></svg>
          <span>${publication_date || "Not found"}</span>
        </div>
        <div class="metadata-item">
          <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>
          <span>${location || "Not specified"}</span>
        </div>
      </div>

      <div class="summary-section">
        <h3>Summary</h3>
        <p>${summary}</p>
      </div>
      <div class="summary-section"><h3>Funds, Money & Investments</h3>${formatList(funds_money_investments, 'Funds')}</div>
      <div class="summary-section"><h3>Projects & Activities</h3>${formatList(projects_activities, 'Projects')}</div>
      <div class="summary-section"><h3>Mentioned Locations</h3>${formatList(locations, 'Locations')}</div>
      <div class="summary-section"><h3>Mentioned Organizations</h3>${formatList(orgs, 'Organizations')}</div>
      <div class="summary-section"><h3>Contact Emails</h3>${formatList(emails, 'Emails')}</div>
    `;
  } catch (error) {
    console.error('Failed to get summary:', error);
    dom.summaryModalContent.innerHTML = `<h2>Error</h2><p>Could not retrieve summary.</p><p style="color: #EF4444;"><strong>Details:</strong> ${error.message}</p>`;
  }
}

function handleChatWithSite(e) {
    const url = e.target.dataset.url; if (!url || url === '#') return;
    document.querySelector('a[data-section="chat"]').click();
    if (dom.ingestUrlInput) {
        dom.ingestUrlInput.value = url;
        dom.ingestUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        dom.ingestForm.requestSubmit();
    }
}

async function handleIngest(e) {
  e.preventDefault();
  const url = dom.ingestUrlInput.value.trim(); if (!url) return;
  const ingestButton = dom.ingestForm.querySelector('button');
  const originalBtnText = ingestButton.textContent;
  ingestButton.disabled = true;
  ingestButton.textContent = 'Ingesting...';
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

    if (data.message === "Site already ingested.") {
        dom.ingestStatus.textContent = `✅ Site was already ingested! You can now ask questions.`;
        dom.chatWindow.innerHTML = '<div class="ai-message">Hello! Ask me anything about the site content.</div>';
        dom.chatInput.disabled = false;
        dom.chatInput.placeholder = "Ask a question about the website...";
        ingestButton.textContent = originalBtnText;
        ingestButton.disabled = false;
        dom.ingestForm.style.display = 'none';
        loadAndDisplayHistory();
    } else {
        pollIngestStatus(data.session_id, ingestButton, originalBtnText);
    }
  } catch (error) {
    console.error('Ingest failed:', error);
    dom.ingestStatus.textContent = `❌ Error starting ingest: ${error.message}`;
    ingestButton.textContent = originalBtnText;
    ingestButton.disabled = false;
    dom.chatInput.placeholder = "Ingestion failed. Please try another URL.";
  }
}

function pollIngestStatus(sessionId, button, originalText) {
    let pollCount = 0;
    const maxPolls = 20;
    const intervalId = setInterval(async () => {
        pollCount++;
        if (pollCount > maxPolls) {
            clearInterval(intervalId);
            dom.ingestStatus.textContent = `❌ Ingestion is taking too long. Please try again later.`;
            button.disabled = false;
            button.textContent = originalText;
            return;
        }

        try {
            const response = await fetch(`/ingest-status/${sessionId}`);
            const data = await response.json();
            if (data.status === 'ready') {
                clearInterval(intervalId);
                dom.ingestStatus.textContent = `✅ Site is ready! You can now ask questions below.`;
                dom.chatWindow.innerHTML = '<div class="ai-message">Hello! Ask me anything about the site content.</div>';
                dom.chatInput.disabled = false;
                dom.chatInput.placeholder = "Ask a question about the website...";
                button.disabled = false;
                button.textContent = originalText;
                dom.ingestForm.style.display = 'none';
                loadAndDisplayHistory();
            } else if (data.status === 'error') {
                 clearInterval(intervalId);
                 dom.ingestStatus.textContent = `❌ Ingestion failed during processing.`;
                 button.disabled = false;
                 button.textContent = originalText;
            }
        } catch (error) {
            clearInterval(intervalId);
            dom.ingestStatus.textContent = `❌ Error checking status. Please try again.`;
            button.disabled = false;
            button.textContent = originalText;
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
    thinkingIndicator.textContent = data.answer;
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

function initializeSettings() {
  if (dom.themeSelect) {
    dom.themeSelect.addEventListener('change', (e) => {
      settings.theme = e.target.value;
      localStorage.setItem('settings', JSON.stringify(settings));
      applyTheme();
    });
  }
  if (dom.resultsPerPage) {
    dom.resultsPerPage.addEventListener('change', (e) => {
      settings.resultsPerPage = parseInt(e.target.value);
      localStorage.setItem('settings', JSON.stringify(settings));
    });
  }
  if (dom.autoSaveResults) {
    dom.autoSaveResults.addEventListener('change', (e) => {
      settings.autoSaveResults = e.target.checked;
      localStorage.setItem('settings', JSON.stringify(settings));
    });
  }
  loadSettings();
  applyTheme();
}

function loadSettings() {
  const storedSettings = localStorage.getItem('settings');
  if (storedSettings) {
    settings = JSON.parse(storedSettings);
    if (dom.themeSelect) dom.themeSelect.value = settings.theme;
    if (dom.resultsPerPage) dom.resultsPerPage.value = settings.resultsPerPage;
    if (dom.autoSaveResults) dom.autoSaveResults.checked = settings.autoSaveResults;
  }
}

function applyTheme() {
  document.body.setAttribute('data-theme', settings.theme);
}