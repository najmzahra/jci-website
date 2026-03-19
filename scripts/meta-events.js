/**
 * META API EVENTS INJECTION & FILTERING
 * Fetches events securely from Google Apps Script Proxy, handles filtering by year/importance,
 * and injects them into the page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const eventsGrid = document.getElementById('events-grid');
    const eventsFilter = document.getElementById('events-filter');
    
    // REPLACE THIS URL with your deployed Google Apps Script URL
    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEiyZ8NUC00YEF_OYFUPJEohy1YcRCJILtZzzBN0BQ0_gf1mR91gjbmbwLLxwlbLbfVQ/exec';

    let allEvents = [];
    
    // Keywords to determine "Most Important Events" automatically
    const importantKeywords = [
        'talent factory', 
        "leaders' talk", 
        'ai odyssey', 
        'shark tank', 
        'face your fears', 
        'job fair', 
        'olympics', 
        'inno launch',
        'innolaunch'
    ];

    if (eventsGrid && APPS_SCRIPT_URL) {
        const CACHE_KEY = 'jci_events_v1';
        const CACHE_DURATION = 3600 * 1000; // 1 hour in ms

        // Check Local Storage first
        const cached = localStorage.getItem(CACHE_KEY);
        let validCacheFound = false;

        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const now = new Date().getTime();
                
                if (now - parsed.timestamp < CACHE_DURATION) {
                    console.log("Loading events from local cache...");
                    validCacheFound = true;
                    processEvents(parsed.data);
                }
            } catch (e) {
                console.warn("Cache parsing error", e);
                localStorage.removeItem(CACHE_KEY);
            }
        }

        if (!validCacheFound) {
            console.log("Fetching fresh events from API...");
            // Show loading indicator if needed
            eventsGrid.innerHTML = '<div class="loading-spinner">Loading events...</div>';

            fetch(APPS_SCRIPT_URL)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.status === 'error') {
                        throw new Error(data.message || 'Unknown API Error');
                    }
                    
                    if (data && data.events) {
                        // Save to cache
                        localStorage.setItem(CACHE_KEY, JSON.stringify({
                            timestamp: new Date().getTime(),
                            data: data
                        }));
                        processEvents(data);
                    } else {
                        // Handle success but no events structure
                        eventsGrid.innerHTML = '<p class="text-center">No events found.</p>';
                    }
                })
                .catch(error => {
                    console.error('Error fetching Meta events:', error);
                    eventsGrid.innerHTML = `<div class="error-msg" style="text-align: center; color: red;">
                        <p>Could not load events.</p>
                        <p><small>${error.message}</small></p>
                    </div>`;
                });
        }
    }

    function processEvents(data) {
        // Even if empty, we should proceed so we can clear the spinner
        if (data && data.events) {
            allEvents = data.events;
            
            // Clear the manually written fallback events / loading spinner
            eventsGrid.innerHTML = '';
            
            if (allEvents.length === 0) {
                 eventsGrid.innerHTML = '<p class="text-center">No upcoming events found.</p>';
                 return;
            }

            // Setup Filters
            setupFilters(allEvents);

            // Render all originally based on current filter state or default 'All'
            const activeFilterBtn = document.querySelector('.filter-btn.active');
            const currentFilter = activeFilterBtn ? activeFilterBtn.dataset.filter : 'All';
            renderEvents(currentFilter);
        } else {
             eventsGrid.innerHTML = '<p class="text-center">No events available.</p>';
        }
    }

    function isImportantEvent(title) {
        const lowerTitle = title.toLowerCase();
        return importantKeywords.some(keyword => lowerTitle.includes(keyword));
    }

    function setupFilters(events) {
        if (!eventsFilter) return;
        
        // Find all unique years
        const uniqueYears = new Set();
        events.forEach(event => {
            const year = new Date(event.start_time).getFullYear().toString();
            uniqueYears.add(year);
        });

        // Convert to sorted array (newest to oldest)
        const sortedYears = Array.from(uniqueYears).sort((a, b) => b - a);

        // Build filter HTML
        let filterHTML = `<button class="filter-btn active" data-filter="All">All Events</button>`;
        filterHTML += `<button class="filter-btn" data-filter="Important"><i class="fas fa-star" style="color: #f1c40f; margin-right: 5px;"></i> Most Important</button>`;
        filterHTML += `<button class="filter-btn" data-filter="CompanyVisit"><i class="fas fa-building" style="margin-right: 5px;"></i> Company Visits</button>`;
        
        sortedYears.forEach(year => {
            filterHTML += `<button class="filter-btn" data-filter="${year}">${year}</button>`;
        });

        eventsFilter.innerHTML = filterHTML;
        eventsFilter.style.display = 'flex'; // Make it visible

        // Add Click Listeners to buttons
        const filterBtns = eventsFilter.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Update active state
                filterBtns.forEach(b => b.classList.remove('active'));
                
                // Allow clicking child elements (like the i tag) without breaking the filter
                const targetBtn = e.target.closest('.filter-btn');
                targetBtn.classList.add('active');

                // Re-render
                renderEvents(targetBtn.getAttribute('data-filter'));
            });
        });
    }

    function renderEvents(filterVal) {
        eventsGrid.innerHTML = '';
        
        let filteredEvents = allEvents;

        if (filterVal === 'Important') {
            filteredEvents = allEvents.filter(event => isImportantEvent(event.title));
        } else if (filterVal === 'CompanyVisit') {
            filteredEvents = allEvents.filter(event => 
               event.title.toLowerCase().includes('visit') || 
               event.description.toLowerCase().includes('company visit')
            );
        } else if (filterVal !== 'All') {
            // It's a specific year
            filteredEvents = allEvents.filter(event => new Date(event.start_time).getFullYear().toString() === filterVal);
        }

        if (filteredEvents.length === 0) {
            eventsGrid.innerHTML = '<p style="text-align:center; grid-column: 1/-1;">No events found for this filter.</p>';
            return;
        }

        filteredEvents.forEach(event => {
            const dateObj = new Date(event.start_time);
            const day = dateObj.getDate();
            const month = dateObj.toLocaleString('en-US', { month: 'short' });
            const year = dateObj.getFullYear();

            // Use a fallback image if no cover is provided
            const imageUrl = event.cover || 'images/placeholder.jpg';
            
            // Use the facebook link or a generic one
            const eventUrl = event.url || `https://www.facebook.com/events/${event.id}`;
            
            // Limit description length and add fallback
            let excerpt = event.description || 'No description available.';
            if (excerpt.length > 120) {
                excerpt = excerpt.substring(0, 120) + '...';
            }

            // Flag important explicitly visually if desired
            let badgeHTML = '';
            if (isImportantEvent(event.title)) {
                badgeHTML = `<span class="event-type" style="color: #f39c12;"><i class="fas fa-star"></i> Featured Event</span>`;
            } else {
                badgeHTML = `<span class="event-type"><i class="fas fa-calendar-alt"></i> Event</span>`;
            }

            const cardHTML = `
                <div class="event-card reveal active" style="animation: fadeIn 0.5s ease;">
                    <a href="${eventUrl}" class="event-card-link" target="_blank">
                        <div class="event-image">
                            <img src="${imageUrl}" alt="${event.title}" onerror="this.src='images/placeholder.jpg'">
                            <span class="event-date">
                                <span class="event-date-day">${day}</span>
                                <span class="event-date-month">${month}</span>
                                <span class="event-date-year">${year}</span>
                            </span>
                        </div>
                        <div class="event-content">
                            <h3>${event.title}</h3>
                            <p class="event-excerpt">${excerpt}</p>
                            <div class="event-meta">
                                ${badgeHTML}
                            </div>
                        </div>
                    </a>
                </div>
            `;
            eventsGrid.insertAdjacentHTML('beforeend', cardHTML);
        });
    }
});
