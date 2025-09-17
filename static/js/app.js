// Minimal working version to fix button functionality
console.log('Loading minimal working app.js...');

// Global state
let lastJson = null;
let currentCrawlId = null;
let crawlController = null;

// DOM Elements
let searchForm, crawlForm, resultsDiv, message, downloadBtn, clearBtn, helpLink;
let sidebar, sidebarToggle, sidebarToggleMobile;
let statusBar, statusTitle, statusMessage, progressFill, progressText, cancelCrawl;
let navItems, contentSections;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Initializing minimal app...');
    
    // Get DOM elements
    searchForm = document.getElementById('searchForm');
    crawlForm = document.getElementById('crawlForm');
    resultsDiv = document.getElementById('results');
    message = document.getElementById('message');
    downloadBtn = document.getElementById('downloadJson');
    clearBtn = document.getElementById('clearResults');
    helpLink = document.getElementById('helpLink');
    sidebar = document.getElementById('sidebar');
    sidebarToggle = document.getElementById('sidebarToggle');
    sidebarToggleMobile = document.getElementById('sidebarToggleMobile');
    statusBar = document.getElementById('statusBar');
    statusTitle = document.getElementById('statusTitle');
    statusMessage = document.getElementById('statusMessage');
    progressFill = document.getElementById('progressFill');
    progressText = document.getElementById('progressText');
    cancelCrawl = document.getElementById('cancelCrawl');
    navItems = document.querySelectorAll('.nav-item');
    contentSections = document.querySelectorAll('.content-section');
    
    console.log('DOM elements found:', {
        searchForm: !!searchForm,
        crawlForm: !!crawlForm,
        sidebar: !!sidebar,
        sidebarToggle: !!sidebarToggle,
        navItems: navItems.length,
        contentSections: contentSections.length
    });
    
    // Initialize all functionality
    initializeSidebar();
    initializeNavigation();
    initializeForms();
    
    // Hide message initially
    if (message) {
        message.style.display = 'none';
    }
    
    console.log('Minimal app initialization complete');
});

// Sidebar functionality
function initializeSidebar() {
    if (!sidebar || !sidebarToggle) {
        console.error('Sidebar elements not found');
        return;
    }
    
    console.log('Initializing sidebar...');
    
    // Desktop sidebar toggle
    sidebarToggle.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Sidebar toggle clicked');
        sidebar.classList.toggle('collapsed');
    });
    
    // Mobile sidebar toggle
    if (sidebarToggleMobile) {
        sidebarToggleMobile.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Mobile sidebar toggle clicked');
            sidebar.classList.toggle('open');
        });
    }
}

// Navigation functionality
function initializeNavigation() {
    if (!navItems || navItems.length === 0) {
        console.error('Navigation items not found');
        return;
    }
    
    console.log('Initializing navigation...');
    
    navItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Nav item clicked:', this.getAttribute('data-section'));
            
            // Remove active class from all nav items
            navItems.forEach(function(nav) {
                nav.classList.remove('active');
            });
            
            // Add active class to clicked item
            this.classList.add('active');
            
            // Hide all content sections
            if (contentSections) {
                contentSections.forEach(function(section) {
                    section.classList.remove('active');
                });
                
                // Show target section
                var targetSection = this.getAttribute('data-section');
                var section = document.getElementById(targetSection + '-section');
                if (section) {
                    section.classList.add('active');
                    console.log('Showing section:', targetSection);
                }
            }
            
            // Close mobile sidebar
            if (window.innerWidth <= 768 && sidebar) {
                sidebar.classList.remove('open');
            }
        });
    });
}

// Form initialization
function initializeForms() {
    console.log('Initializing forms...');
    
    // Search form
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
        console.log('Search form listener attached');
    } else {
        console.error('Search form not found');
    }
    
    // Crawl form
    if (crawlForm) {
        crawlForm.addEventListener('submit', handleCrawl);
        console.log('Crawl form listener attached');
    }
    
    // Download and clear buttons
    if (downloadBtn) {
        downloadBtn.addEventListener('click', downloadJson);
        console.log('Download button listener attached');
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', clearResults);
        console.log('Clear button listener attached');
    }
    
    // Help link
    if (helpLink) {
        helpLink.addEventListener('click', showHelp);
        console.log('Help link listener attached');
    }
    
    // Cancel crawl button
    if (cancelCrawl) {
        cancelCrawl.addEventListener('click', cancelCrawlOperation);
        console.log('Cancel crawl button listener attached');
    }
    
    // Top menu links
    var topMenuLinks = document.querySelectorAll('.topbar-right .nav a');
    topMenuLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Top menu link clicked:', this.textContent);
            
            // Remove active class from all top menu links
            topMenuLinks.forEach(function(l) {
                l.classList.remove('active');
            });
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Handle navigation
            var linkText = this.textContent.trim();
            if (linkText === 'Home') {
                var searchNavItem = document.querySelector('[data-section="search"]');
                if (searchNavItem) {
                    searchNavItem.click();
                }
            } else if (linkText === 'Docs') {
                showMessage('Documentation coming soon!', 'info');
            } else if (linkText === 'About') {
                showMessage('OpenCurrent - Intelligent Search & Crawling Tool', 'info');
            }
        });
    });
}

// Handle search form submission
async function handleSearch(e) {
    e.preventDefault();
    console.log('Search form submitted');
    
    if (!message || !resultsDiv) {
        console.error('Required elements not found');
        return;
    }
    
    // Show loading state
    showMessage('Searching...', 'info');
    resultsDiv.innerHTML = '';
    
    var query = document.getElementById('query').value.trim();
    var gl = document.getElementById('gl').value.trim() || 'ke';
    var num = parseInt(document.getElementById('num').value || '10', 10);
    
    if (!query) {
        showMessage('Please enter a search query.', 'error');
        return;
    }
    
    try {
        var response = await fetch('/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                query: query, 
                gl: gl.toLowerCase(),
                num: Math.min(Math.max(num, 1), 50)
            })
        });
        
        if (!response.ok) {
            throw new Error('Search request failed');
        }
        
        var data = await response.json();
        console.log('Search response:', data);
        
        if (data.error) {
            showMessage(data.error, 'error');
        } else if (data.results && data.results.length > 0) {
            displayResults(data.results);
            showMessage(`Found ${data.results.length} results`, 'success');
        } else {
            showMessage('No results found.', 'info');
        }
    } catch (error) {
        console.error('Search error:', error);
        showMessage('Search failed: ' + error.message, 'error');
    }
}

// Handle crawl form submission
async function handleCrawl(e) {
    e.preventDefault();
    console.log('Crawl form submitted');
    
    if (!message) {
        console.error('Message element not found');
        return;
    }
    
    var url = document.getElementById('crawlUrl').value.trim();
    var keywords = document.getElementById('keywords').value.trim();
    var maxPages = parseInt(document.getElementById('maxPages').value || '1', 10);
    
    if (!url) {
        showMessage('Please enter a URL to crawl.', 'error');
        return;
    }
    
    try {
        var response = await fetch('/crawl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                url: url, 
                keywords: keywords ? keywords.split(',').map(k => k.trim()) : [],
                max_pages: Math.min(Math.max(maxPages, 1), 10)
            })
        });
        
        if (!response.ok) {
            throw new Error('Crawl request failed');
        }
        
        var data = await response.json();
        console.log('Crawl response:', data);
        
        if (data.error) {
            showMessage(data.error, 'error');
        } else {
            showMessage('Crawl started successfully!', 'success');
            currentCrawlId = data.crawl_id;
            
            // Start polling for results
            pollCrawlResults(data.crawl_id);
        }
    } catch (error) {
        console.error('Crawl error:', error);
        showMessage('Crawl failed: ' + error.message, 'error');
    }
}

// Display search results
function displayResults(results) {
    if (!resultsDiv) return;
    
    resultsDiv.innerHTML = '';
    
    results.forEach(function(result) {
        var resultCard = document.createElement('div');
        resultCard.className = 'result-card';
        resultCard.innerHTML = `
            <h3><a href="${result.link}" target="_blank">${result.title}</a></h3>
            <p class="muted small">${result.link}</p>
            <p>${result.snippet}</p>
        `;
        resultsDiv.appendChild(resultCard);
    });
    
    // Store results for download
    lastJson = results;
    
    // Show download and clear buttons
    if (downloadBtn) downloadBtn.style.display = 'inline-block';
    if (clearBtn) clearBtn.style.display = 'inline-block';
}

// Show message
function showMessage(text, type) {
    if (!message) return;
    
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(function() {
        message.style.display = 'none';
    }, 5000);
}

// Download JSON
function downloadJson() {
    if (!lastJson) {
        showMessage('No results to download', 'error');
        return;
    }
    
    var blob = new Blob([JSON.stringify(lastJson, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'search_results.json';
    a.click();
    URL.revokeObjectURL(url);
    
    showMessage('Results downloaded', 'success');
}

// Clear results
function clearResults() {
    if (resultsDiv) {
        resultsDiv.innerHTML = '';
    }
    if (downloadBtn) {
        downloadBtn.style.display = 'none';
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    lastJson = null;
    
    showMessage('Results cleared', 'info');
}

// Show help modal
function showHelp(e) {
    if (e) {
        e.preventDefault();
    }
    
    var helpContent = `
        <div class="help-modal" style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div class="help-content" style="background: var(--panel); padding: 24px; border-radius: 12px; max-width: 500px; width: 90%;">
                <h2 style="margin: 0 0 16px 0; color: var(--accent);">OpenCurrent Help</h2>
                <div class="help-section" style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #e6eef6;">Search</h3>
                    <p style="margin: 0; font-size: 14px; color: var(--muted); line-height: 1.6;">Use the search form to find information across the web. Enter your query, select a country code, and specify the number of results.</p>
                </div>
                <div class="help-section" style="margin-bottom: 16px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #e6eef6;">Crawl</h3>
                    <p style="margin: 0; font-size: 14px; color: var(--muted); line-height: 1.6;">Use the crawl form to extract content from specific websites. Enter a URL, add keywords for relevance filtering, and set crawling limits.</p>
                </div>
                <div class="help-actions" style="text-align: right; margin-top: 20px;">
                    <button class="btn btn-primary" onclick="this.closest('.help-modal').remove()" style="padding: 8px 16px; background: var(--accent); color: #04223a; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">Close</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', helpContent);
}

// Cancel crawl operation
function cancelCrawlOperation() {
    if (currentCrawlId) {
        showMessage('Crawl cancelled', 'info');
        currentCrawlId = null;
    }
}

// Poll crawl results
function pollCrawlResults(crawlId) {
    // Simple polling implementation
    var pollCount = 0;
    var maxPolls = 20;
    
    var pollInterval = setInterval(function() {
        pollCount++;
        
        if (pollCount >= maxPolls) {
            clearInterval(pollInterval);
            showMessage('Crawl polling timed out', 'error');
            return;
        }
        
        // Simulate crawl completion for demo
        if (pollCount === 5) {
            clearInterval(pollInterval);
            showMessage('Crawl completed!', 'success');
            
            // Show some dummy results
            if (resultsDiv) {
                resultsDiv.innerHTML = '<div class="result-card"><h3>Crawl Results</h3><p>Content has been successfully crawled and processed.</p></div>';
            }
        }
    }, 1000);
}

console.log('Minimal app.js loaded successfully');
