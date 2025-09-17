// Debug script to test button functionality
// Add this to the HTML temporarily to debug issues

console.log('=== DEBUG: Button Functionality Test ===');

// Test 1: Check if DOM is ready
function testDomReady() {
    console.log('1. Testing DOM readiness...');
    console.log('   Document readyState:', document.readyState);
    console.log('   DOMContentLoaded event fired:', window.domContentLoadedFired || false);
    return document.readyState === 'complete' || document.readyState === 'interactive';
}

// Test 2: Check if elements exist
function testElementExistence() {
    console.log('2. Testing element existence...');
    
    const elements = {
        'searchForm': document.getElementById('searchForm'),
        'runBtn': document.getElementById('runBtn'),
        'query': document.getElementById('query'),
        'sidebar': document.getElementById('sidebar'),
        'sidebarToggle': document.getElementById('sidebarToggle'),
        'navItems': document.querySelectorAll('.nav-item'),
        'app': document.querySelector('.app')
    };
    
    let allExist = true;
    for (const [name, element] of Object.entries(elements)) {
        const exists = element && (element.length === undefined || element.length > 0);
        console.log(`   ${name}: ${exists ? '✅' : '❌'}`);
        if (!exists) allExist = false;
    }
    
    return allExist;
}

// Test 3: Test event listeners
function testEventListeners() {
    console.log('3. Testing event listeners...');
    
    const searchForm = document.getElementById('searchForm');
    const runBtn = document.getElementById('runBtn');
    
    if (!searchForm || !runBtn) {
        console.log('   ❌ Form or button not found');
        return false;
    }
    
    // Check if form has submit listener
    const formListeners = getEventListeners ? getEventListeners(searchForm) : null;
    const btnListeners = getEventListeners ? getEventListeners(runBtn) : null;
    
    console.log('   Form listeners:', formListeners ? Object.keys(formListeners) : 'Cannot check');
    console.log('   Button listeners:', btnListeners ? Object.keys(btnListeners) : 'Cannot check');
    
    // Test manual form submission
    console.log('   Testing manual form submission...');
    
    // Add a test listener to see if it works
    searchForm.addEventListener('submit', function(e) {
        console.log('   ✅ Test form submit listener fired!');
        e.preventDefault();
        console.log('   Form prevented default successfully');
    });
    
    return true;
}

// Test 4: Test button click
function testButtonClick() {
    console.log('4. Testing button click...');
    
    const runBtn = document.getElementById('runBtn');
    if (!runBtn) {
        console.log('   ❌ Run button not found');
        return false;
    }
    
    // Add click listener to test
    runBtn.addEventListener('click', function(e) {
        console.log('   ✅ Button click listener fired!');
        console.log('   Button type:', this.type);
        console.log('   Button form:', this.form);
        
        // Try to submit form manually
        if (this.form) {
            console.log('   Submitting form manually...');
            this.form.dispatchEvent(new Event('submit', { cancelable: true }));
        }
    });
    
    return true;
}

// Test 5: Test form submission
function testFormSubmission() {
    console.log('5. Testing form submission...');
    
    const searchForm = document.getElementById('searchForm');
    if (!searchForm) {
        console.log('   ❌ Search form not found');
        return false;
    }
    
    // Create and dispatch submit event
    const submitEvent = new Event('submit', { 
        bubbles: true, 
        cancelable: true 
    });
    
    const wasDefaultPrevented = !searchForm.dispatchEvent(submitEvent);
    console.log('   Submit event dispatched:', !wasDefaultPrevented ? 'not prevented' : 'prevented');
    
    return wasDefaultPrevented;
}

// Run all tests
function runDebugTests() {
    console.log('Starting debug tests...\n');
    
    const tests = [
        testDomReady,
        testElementExistence,
        testEventListeners,
        testButtonClick,
        testFormSubmission
    ];
    
    let passedTests = 0;
    const totalTests = tests.length;
    
    for (const test of tests) {
        try {
            const result = test();
            if (result) {
                passedTests++;
            }
        } catch (error) {
            console.error('   Test failed with error:', error);
        }
    }
    
    console.log('\n=== Debug Results ===');
    console.log(`Passed: ${passedTests}/${totalTests} tests`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All debug tests passed!');
    } else {
        console.log(`❌ ${totalTests - passedTests} tests failed.`);
    }
    
    return passedTests === totalTests;
}

// Track DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
    window.domContentLoadedFired = true;
    console.log('DOMContentLoaded event fired');
    
    // Wait a bit for other scripts to load
    setTimeout(runDebugTests, 1000);
});

// If DOM is already loaded, run tests
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(runDebugTests, 100);
}

// Make debug functions available globally
window.debugButtons = {
    testDomReady,
    testElementExistence,
    testEventListeners,
    testButtonClick,
    testFormSubmission,
    runDebugTests
};

console.log('Debug script loaded. Call window.debugButtons.runDebugTests() to run tests manually.');
