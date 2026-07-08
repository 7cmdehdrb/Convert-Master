// Header Loader - Dynamically loads the shared header component
(function() {
    // Determine current page from URL
    const currentPath = window.location.pathname;
    let currentPage = 'index';
    
    if (currentPath.includes('pdf-to-image')) {
        currentPage = 'pdf-to-image';
    } else if (currentPath.includes('system-recorder')) {
        currentPage = 'system-recorder';
    }
    
    // Load header HTML
    fetch('/static/components/header.html')
        .then(response => response.text())
        .then(html => {
            // Insert header into the placeholder
            const placeholder = document.getElementById('header-placeholder');
            if (placeholder) {
                placeholder.innerHTML = html;
                
                // Set active class on current page's nav item
                const navItems = document.querySelectorAll('.nav-item[data-page]');
                navItems.forEach(item => {
                    if (item.getAttribute('data-page') === currentPage) {
                        item.classList.add('active');
                    }
                });
            }
        })
        .catch(error => {
            console.error('Failed to load header:', error);
        });
})();
