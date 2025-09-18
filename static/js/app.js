// --- app.js (Complete, Corrected, and Final Version) ---

console.log('Loading app.js...');
const dom = {};
let currentChatSessionId = null;

document.addEventListener('DOMContentLoaded', function() {
  cacheDOM();
  initializeSidebar();
  initializeNavigation();
  initializeForms();
  initializeModals();
  console.log('App initialization complete');
});

function cacheDOM() {
  // ... (cache all elements as before)
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
}

function initializeForms() {
  // ... (no changes here)
  if (dom.searchForm) dom.searchForm.addEventListener('submit', handleSearch);
  if (dom.ingestForm) dom.ingestForm.addEventListener('submit', handleIngest);
  if (dom.chatForm) dom.chatForm.addEventListener('submit', handleChatMessage);
}

// --- Search & Summary Functionality ---

async function handleSearch(e) { /* ... (no changes here) */ }

// --- MAJOR CHANGE HERE ---
function displayResults(results) {
  if (!dom.searchResultsList) return;
  dom.searchResultsList.innerHTML = '';

  results.forEach((result, index) => {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    resultCard.style.animationDelay = `${index * 0.05}s`;
    // Add the new "Chat with Site" button to the template
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

  // Attach event listeners to BOTH buttons
  dom.searchResultsList.querySelectorAll('.btn-view').forEach(button => {
    button.addEventListener('click', handleViewSummary);
  });
  dom.searchResultsList.querySelectorAll('.btn-chat').forEach(button => {
    button.addEventListener('click', handleChatWithSite);
  });

  dom.searchResultsWrapper.classList.add('visible');
}

async function handleViewSummary(e) { /* ... (no changes here) */ }

// --- NEW FUNCTION TO HANDLE THE CHAT BUTTON ---
function handleChatWithSite(e) {
    const url = e.target.dataset.url;
    if (!url) return;

    // 1. Programmatically click the 'Chat with Site' nav link
    const chatNavLink = document.querySelector('a[data-section="chat"]');
    if (chatNavLink) {
        chatNavLink.click();
    }

    // 2. Auto-populate the URL in the ingest form
    if (dom.ingestUrlInput) {
        dom.ingestUrlInput.value = url;
        // Scroll to the form for better UX
        dom.ingestUrlInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // 3. Automatically submit the ingest form to start the process
    if (dom.ingestForm) {
        // We use requestSubmit() for proper form submission handling
        dom.ingestForm.requestSubmit();
    }
}


// --- Chat with Site Functionality (no changes) ---
async function handleIngest(e) { /* ... */ }
async function handleChatMessage(e) { /* ... */ }
function appendMessage(text, className) { /* ... */ }

// --- Other Helper Functions (no changes) ---
function initializeSidebar() { /* ... */ }
function initializeNavigation() { /* ... */ }
function initializeModals() { /* ... */ }

// --- PASTE THE FULL CONTENT OF ALL FUNCTIONS BELOW ---
// (This is to ensure you have the complete, non-empty versions)
async function handleSearch(e) {e.preventDefault();const t=e.target.querySelector('button[type="submit"]'),n=t.textContent;t.textContent="Searching...",t.disabled=!0;try{const e=document.getElementById("query").value.trim(),s=await fetch("/search",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query:e})});if(!s.ok)throw new Error(`HTTP error! status: ${s.status}`);const o=await s.json();o.results&&o.results.length>0?displayResults(o.results):(dom.searchResultsList.innerHTML='<p style="padding: 16px;">No results found.</p>',dom.searchResultsWrapper.classList.add("visible"))}catch(e){console.error("Search error:",e),dom.searchResultsList.innerHTML=`<p style="padding: 16px; color: #EF4444;">Search failed: ${e.message}</p>`}finally{t.textContent=n,t.disabled=!1}}
async function handleViewSummary(e){const t=e.target.dataset.url;if(!t)return;dom.summaryModal.classList.add("visible"),dom.summaryModalContent.innerHTML="<h2>Extracting Information...</h2><p>Please wait while we analyze the page.</p>";try{const e=await fetch("/summarize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})});if(!e.ok){const t=await e.json();throw new Error(t.detail||`HTTP error! Status: ${e.status}`)}const n=await e.json(),s=n.contacts?.emails||[],o=n.contacts?.organizations||[],a=s.length>0?s.map((e=>`<li class="entity-pill"><span class="pill-label">Email:</span>${e}</li>`)).join(""):"",i=o.length>0?o.map((e=>`<li class="entity-pill"><span class="pill-label">Entity:</span>${e}</li>`)).join(""):"",l=a||i?`<ul class="entity-pills">${a}${i}</ul>`:"<p>None found.</p>";dom.summaryModalContent.innerHTML=`\n      <div class="summary-modal-header">\n        <h2>${n.title}</h2>\n        <a href="${t}" target="_blank" rel="noopener noreferrer">${t}</a>\n      </div>\n      <div class="summary-metadata">\n        <div class="metadata-item">\n          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18M-4.5 12h22.5" /></svg>\n          <span>${n.publication_date||"Not found"}</span>\n        </div>\n        <div class="metadata-item">\n          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" /></svg>\n          <span>${n.location||"Not specified"}</span>\n        </div>\n      </div>\n      <div class="summary-section"><h3>Summary</h3><p>${n.summary}</p></div>\n      <div class="summary-section"><h3>Extracted Entities</h3>${l}</div>\n    `}catch(e){console.error("Failed to get summary:",e),dom.summaryModalContent.innerHTML=`<h2>Error</h2><p>Could not retrieve summary for this page.</p><p style="color: #EF4444;"><strong>Details:</strong> ${e.message}</p>`}}
async function handleIngest(e){e.preventDefault();const t=document.getElementById("ingestUrl").value.trim();if(!t)return;dom.ingestStatus.style.display="block",dom.ingestStatus.textContent=`Ingesting ${t}... This may take a moment.`,dom.ingestForm.querySelector("button").disabled=!0;try{const e=await fetch("/ingest",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:t})}),n=await e.json();if(!e.ok)throw new Error(n.detail);currentChatSessionId=n.session_id,dom.ingestStatus.textContent="✅ Site ingested successfully! You can start chatting below.",dom.ingestForm.style.display="none",dom.chatContainer.style.display="block",dom.chatInput.focus()}catch(e){console.error("Ingest failed:",e),dom.ingestStatus.textContent=`❌ Error: ${e.message}`}finally{dom.ingestForm.querySelector("button").disabled=!1}}
async function handleChatMessage(e){e.preventDefault();const t=dom.chatInput.value.trim();if(!t||!currentChatSessionId)return;appendMessage(t,"user-message"),dom.chatInput.value="";const n=appendMessage("Thinking...","ai-message");n.id="thinkingIndicator";try{const e=await fetch("/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({question:t,session_id:currentChatSessionId})}),s=await e.json();if(!e.ok)throw new Error(s.detail);n.remove(),appendMessage(s.answer,"ai-message")}catch(e){console.error("Chat error:",e),n.remove(),appendMessage(`Sorry, an error occurred: ${e.message}`,"ai-message")}}
function appendMessage(e,t){const n=document.createElement("div");return n.className=`chat-message ${t}`,n.textContent=e,dom.chatWindow.appendChild(n),dom.chatWindow.scrollTop=dom.chatWindow.scrollHeight,n}
function initializeSidebar(){dom.sidebar&&dom.sidebarToggle&&(dom.sidebarToggle.addEventListener("click",(()=>{dom.sidebar.classList.toggle("collapsed")})),dom.sidebarToggleMobile&&dom.sidebarToggleMobile.addEventListener("click",(()=>{dom.sidebar.classList.toggle("open")})))}
function initializeNavigation(){dom.navItems&&dom.navItems.forEach((e=>{e.addEventListener("click",(function(t){t.preventDefault();const n=this.getAttribute("data-section");dom.navItems.forEach((e=>{e.classList.remove("active")})),this.classList.add("active"),dom.contentSections.forEach((t=>{t.classList.toggle("active",t.id===`${n}-section`)})),window.innerWidth<=768&&dom.sidebar.classList.remove("open")}))}))}
function initializeModals(){dom.helpLink&&dom.helpLink.addEventListener("click",(e=>{e.preventDefault(),dom.helpModal?.classList.add("visible")})),dom.helpCloseBtn&&dom.helpCloseBtn.addEventListener("click",(()=>{dom.helpModal?.classList.remove("visible")})),dom.helpModal&&dom.helpModal.addEventListener("click",(e=>{e.target===dom.helpModal&&dom.helpModal.classList.remove("visible")})),dom.summaryCloseBtn&&dom.summaryCloseBtn.addEventListener("click",(()=>{dom.summaryModal?.classList.remove("visible")})),dom.summaryModal&&dom.summaryModal.addEventListener("click",(e=>{e.target===dom.summaryModal&&dom.summaryModal.classList.remove("visible")}))}