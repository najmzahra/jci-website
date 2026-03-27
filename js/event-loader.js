/**
 * JCI TBS - Event Pre-loader
 *
 * This script fetches event data from the Google Apps Script proxy in the background
 * as soon as any page on the website is loaded. The data is then stored in
 * localStorage.
 *
 * When a user navigates to the events.html page, the meta-events.js script
 * will find the cached data and render it instantly, improving perceived performance.
 */

(function() {
    // Ensure this runs only once
    if (window.eventLoaderHasRun) {
        return;
    }
    window.eventLoaderHasRun = true;

    const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzEiyZ8NUC00YEF_OYFUPJEohy1YcRCJILtZzzBN0BQ0_gf1mR91gjbmbwLLxwlbLbfVQ/exec';
    const CACHE_KEY = 'jci_events_v1';
    const CACHE_DURATION = 3600 * 1000; // 1 hour in milliseconds

    function preFetchEvents() {
        const cached = localStorage.getItem(CACHE_KEY);

        // If a valid cache exists, do nothing.
        if (cached) {
            try {
                const parsed = JSON.parse(cached);
                const now = new Date().getTime();
                if (now - parsed.timestamp < CACHE_DURATION) {
                    // Cache is fresh, no need to re-fetch in the background.
                    return;
                }
            } catch (e) {
                // Invalid cache, proceed to fetch.
                localStorage.removeItem(CACHE_KEY);
            }
        }

        console.log("Pre-fetching events in the background...");

        fetch(APPS_SCRIPT_URL)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.status === 'error') {
                    throw new Error(data.message || 'Unknown API Error during pre-fetch');
                }
                
                if (data && data.events) {
                    // Save the fetched data and a timestamp to localStorage.
                    localStorage.setItem(CACHE_KEY, JSON.stringify({
                        timestamp: new Date().getTime(),
                        data: data
                    }));
                    console.log("Events pre-fetched and cached successfully.");
                }
            })
            .catch(error => {
                // We don't show this error to the user, as it's a background process.
                console.error('Error pre-fetching Meta events:', error);
            });
    }

    // Run the pre-fetch logic as soon as the script loads.
    preFetchEvents();

})();
