// Simple test to isolate button functionality issues
console.log('=== SIMPLE TEST: Button Functionality ===');

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Content Loaded - Starting simple test...');
    
    // Test 1: Check if search form exists
    const searchForm = document.getElementById('searchForm');
    console.log('1. Search form found:', !!searchForm);
    
    if (!searchForm) {
        console.error('❌ Search form not found - this is the main issue!');
        return;
    }
    
    // Test 2: Check if run button exists
    const runBtn = document.getElementById('runBtn');
    console.log('2. Run button found:', !!runBtn);
    
    if (!runBtn) {
        console.error('❌ Run button not found!');
        return;
    }
    
    // Test 3: Check if query input exists
    const queryInput = document.getElementById('query');
    console.log('3. Query input found:', !!queryInput);
    
    // Test 4: Add a simple event listener to the form
    console.log('4. Adding simple event listener to form...');
    
    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();
        console.log('✅ FORM SUBMIT EVENT FIRED!');
        
        const query = queryInput ? queryInput.value : 'No query input found';
        console.log('Query value:', query);
        
        // Show a simple alert to test if it works
        alert('Form submitted! Query: ' + query);
        
        // Try to make a fetch request
        fetch('/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: query,
                gl: 'ke',
                num: 10
            })
        })
        .then(response => response.json())
        .then(data => {
            console.log('✅ Fetch request successful:', data);
            alert('Search successful! Check console for results.');
        })
        .catch(error => {
            console.error('❌ Fetch request failed:', error);
            alert('Search failed: ' + error.message);
        });
    });
    
    // Test 5: Add a click listener to the button as backup
    console.log('5. Adding click listener to button...');
    
    runBtn.addEventListener('click', function(e) {
        console.log('✅ BUTTON CLICK EVENT FIRED!');
        
        // Manually trigger form submission
        if (searchForm) {
            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
            searchForm.dispatchEvent(submitEvent);
        }
    });
    
    // Test 6: Test sidebar toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarToggle = document.getElementById('sidebarToggle');
    
    console.log('6. Sidebar elements found:', {
        sidebar: !!sidebar,
        sidebarToggle: !!sidebarToggle
    });
    
    if (sidebar && sidebarToggle) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('✅ SIDEBAR TOGGLE CLICKED!');
            sidebar.classList.toggle('collapsed');
            console.log('Sidebar collapsed:', sidebar.classList.contains('collapsed'));
        });
    }
    
    // Test 7: Test navigation items
    const navItems = document.querySelectorAll('.nav-item');
    console.log('7. Navigation items found:', navItems.length);
    
    navItems.forEach((item, index) => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log(`✅ NAV ITEM ${index + 1} CLICKED!`);
            console.log('Data section:', this.getAttribute('data-section'));
            
            // Remove active class from all items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Add active class to clicked item
            this.classList.add('active');
        });
    });
    
    console.log('🎉 Simple test setup complete!');
    console.log('Try clicking the search button now...');
});

// Additional test for when DOM is already loaded
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    console.log('DOM already loaded, running test immediately...');
    
    // Small delay to ensure other scripts are loaded
    setTimeout(function() {
        const searchForm = document.getElementById('searchForm');
        if (searchForm && !searchForm.hasAttribute('data-simple-test-attached')) {
            searchForm.setAttribute('data-simple-test-attached', 'true');
            
            searchForm.addEventListener('submit', function(e) {
                e.preventDefault();
                console.log('✅ LATE FORM SUBMIT EVENT FIRED!');
                alert('Late form submission test worked!');
            });
            
            console.log('Late event listener attached');
        }
    }, 2000);
}

// Global test function
window.testButtons = function() {
    console.log('=== MANUAL BUTTON TEST ===');
    
    const elements = {
        searchForm: document.getElementById('searchForm'),
        runBtn: document.getElementById('runBtn'),
        query: document.getElementById('query'),
        sidebar: document.getElementById('sidebar'),
        sidebarToggle: document.getElementById('sidebarToggle'),
        navItems: document.querySelectorAll('.nav-item')
    };
    
    for (const [name, element] of Object.entries(elements)) {
        const exists = element && (element.length === undefined || element.length > 0);
        console.log(`${name}: ${exists ? '✅' : '❌'}`);
    }
    
    // Test form submission manually
    if (elements.searchForm) {
        console.log('Testing manual form submission...');
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        const wasPrevented = !elements.searchForm.dispatchEvent(submitEvent);
        console.log('Form submission prevented:', wasPrevented);
    }
    
    return elements;
};

console.log('Simple test script loaded. Call window.testButtons() to test manually.');
