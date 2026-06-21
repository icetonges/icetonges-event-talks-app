// Application State
let state = {
    releases: [],
    filteredReleases: [],
    filters: {
        search: "",
        types: new Set(),
        sort: "newest"
    },
    selectedItemId: null,
    activeHashtags: new Set(),
    lastFetchedTime: null
};

// SVG Circle circumference for progress ring
const CIRCUMFERENCE = 2 * Math.PI * 11; // r=11, C ≈ 69.115

// Document Ready
document.addEventListener("DOMContentLoaded", () => {
    initApp();
});

// Initialize Application
function initApp() {
    // Register event listeners
    document.getElementById("btn-refresh").addEventListener("click", () => fetchReleases(true));
    document.getElementById("btn-retry").addEventListener("click", () => fetchReleases(true));
    document.getElementById("search-input").addEventListener("input", handleSearchInput);
    document.getElementById("search-clear-btn").addEventListener("click", clearSearch);
    document.getElementById("btn-clear-filters").addEventListener("click", resetAllFilters);
    document.getElementById("btn-reset-search").addEventListener("click", resetAllFilters);
    document.getElementById("sort-select").addEventListener("change", handleSortChange);
    document.getElementById("btn-close-composer").addEventListener("click", closeComposer);
    document.getElementById("btn-share-twitter").addEventListener("click", shareOnTwitter);
    
    // Tweet textarea listener
    const textarea = document.getElementById("tweet-textarea");
    textarea.addEventListener("input", handleTweetTextareaInput);

    // Hashtag pills
    const tags = document.querySelectorAll(".hashtag-pill");
    tags.forEach(pill => {
        pill.addEventListener("click", () => toggleHashtag(pill));
    });

    // Stats cards quick filter
    const statsCards = document.querySelectorAll(".stat-card");
    statsCards.forEach(card => {
        card.addEventListener("click", () => {
            const type = card.getAttribute("data-stat-type");
            if (type === "total") {
                state.filters.types.clear();
            } else if (type === "feature") {
                state.filters.types.clear();
                state.filters.types.add("Feature");
            } else if (type === "announcement") {
                state.filters.types.clear();
                state.filters.types.add("Announcement");
            } else if (type === "other") {
                state.filters.types.clear();
                // Add all except feature and announcement
                state.releases.forEach(item => {
                    if (item.type !== "Feature" && item.type !== "Announcement") {
                        state.filters.types.add(item.type);
                    }
                });
            }
            updateFilterPillsUI();
            renderFeed();
        });
    });

    // Fetch initial release notes
    fetchReleases();
}

// Fetch release notes from backend
async function fetchReleases(force = false) {
    showLoading(true);
    
    const refreshButton = document.getElementById("btn-refresh");
    const refreshIcon = refreshButton.querySelector(".icon-refresh");
    refreshIcon.classList.add("spinning");
    refreshButton.disabled = true;

    try {
        const url = `/api/releases${force ? '?refresh=true' : ''}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.status === "success" || result.status === "partial_success") {
            state.releases = result.data;
            state.lastFetchedTime = result.last_fetched;
            
            updateSyncStatus(result.last_fetched);
            updateStatsDashboard();
            buildFilterPills();
            renderFeed();
        } else {
            throw new Error(result.error || "Failed to load release notes.");
        }
    } catch (error) {
        console.error("Fetch Error:", error);
        showError(error.message);
    } finally {
        showLoading(false);
        refreshIcon.classList.remove("spinning");
        refreshButton.disabled = false;
        lucide.createIcons();
    }
}

// Show/Hide loading skeletons
function showLoading(isLoading) {
    const loader = document.getElementById("feed-loading");
    const feed = document.getElementById("releases-feed");
    const errorContainer = document.getElementById("feed-error");
    const emptyContainer = document.getElementById("feed-empty");

    if (isLoading) {
        loader.style.display = "flex";
        feed.style.display = "none";
        errorContainer.style.display = "none";
        emptyContainer.style.display = "none";
    } else {
        loader.style.display = "none";
        feed.style.display = "flex";
    }
}

// Show Error UI
function showError(msg) {
    showLoading(false);
    document.getElementById("releases-feed").style.display = "none";
    document.getElementById("feed-error").style.display = "flex";
    document.getElementById("error-message").innerText = msg;
}

// Update last checked time
function updateSyncStatus(timestamp) {
    const syncText = document.getElementById("sync-status");
    const date = new Date(timestamp * 1000);
    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    syncText.innerText = `Synced at ${timeStr}`;
}

// Calculate and render stats in sidebar
function updateStatsDashboard() {
    const total = state.releases.length;
    const features = state.releases.filter(item => item.type.toLowerCase() === "feature").length;
    const announcements = state.releases.filter(item => item.type.toLowerCase() === "announcement").length;
    const others = total - features - announcements;

    document.getElementById("stat-total").innerText = total;
    document.getElementById("stat-features").innerText = features;
    document.getElementById("stat-announcements").innerText = announcements;
    document.getElementById("stat-others").innerText = others;
}

// Create unique filters dynamically from parsed data
function buildFilterPills() {
    const pillContainer = document.getElementById("filter-pills");
    pillContainer.innerHTML = "";
    
    // Get unique types and their counts
    const counts = {};
    state.releases.forEach(item => {
        counts[item.type] = (counts[item.type] || 0) + 1;
    });

    // Create pills sorted by frequency
    const uniqueTypes = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
    
    uniqueTypes.forEach(type => {
        const pill = document.createElement("button");
        pill.className = "filter-pill";
        pill.setAttribute("data-type", type);
        
        // Add active class if it is selected in filters
        if (state.filters.types.has(type)) {
            pill.classList.add("active");
        }
        
        pill.innerHTML = `
            <span>${type}</span>
            <span class="pill-count">${counts[type]}</span>
        `;
        
        pill.addEventListener("click", () => {
            if (state.filters.types.has(type)) {
                state.filters.types.delete(type);
                pill.classList.remove("active");
            } else {
                state.filters.types.add(type);
                pill.classList.add("active");
            }
            renderFeed();
        });
        
        pillContainer.appendChild(pill);
    });
}

// Update filter pills UI classes based on filters state
function updateFilterPillsUI() {
    const pills = document.querySelectorAll(".filter-pill");
    pills.forEach(pill => {
        const type = pill.getAttribute("data-type");
        if (state.filters.types.has(type)) {
            pill.classList.add("active");
        } else {
            pill.classList.remove("active");
        }
    });
}

// Filter, Sort, and Render release notes list
function renderFeed() {
    const query = state.filters.search.toLowerCase().trim();
    
    // Apply filters
    state.filteredReleases = state.releases.filter(item => {
        // 1. Search Query Filter (Checks type, date, and text content)
        const matchesQuery = !query || 
            item.type.toLowerCase().includes(query) || 
            item.date.toLowerCase().includes(query) || 
            item.text.toLowerCase().includes(query);
            
        // 2. Type Filter (If anything is selected)
        const matchesType = state.filters.types.size === 0 || state.filters.types.has(item.type);
        
        return matchesQuery && matchesType;
    });

    // Apply Sorting
    state.filteredReleases.sort((a, b) => {
        const dateA = new Date(a.updated || a.date);
        const dateB = new Date(b.updated || b.date);
        
        if (state.filters.sort === "newest") {
            return dateB - dateA;
        } else {
            return dateA - dateB;
        }
    });

    // Update Counts
    document.getElementById("visible-count-badge").innerText = state.filteredReleases.length;

    // Render Cards
    const container = document.getElementById("releases-feed");
    const emptyState = document.getElementById("feed-empty");
    container.innerHTML = "";

    if (state.filteredReleases.length === 0) {
        container.style.display = "none";
        emptyState.style.display = "flex";
        return;
    }

    container.style.display = "flex";
    emptyState.style.display = "none";

    state.filteredReleases.forEach(item => {
        const card = document.createElement("article");
        card.className = "release-card";
        card.setAttribute("data-id", item.id);
        
        if (state.selectedItemId === item.id) {
            card.classList.add("selected");
        }
        
        // Define badge class name
        const typeLower = item.type.toLowerCase();
        let badgeClass = "badge-update";
        if (["feature", "announcement", "breaking", "changed", "deprecated", "fix", "issue"].includes(typeLower)) {
            badgeClass = `badge-${typeLower}`;
        }
        
        card.innerHTML = `
            <div class="release-card-header">
                <div class="badge-and-date">
                    <span class="type-badge ${badgeClass}">${item.type}</span>
                    <span class="card-date">${item.date}</span>
                </div>
                <div class="card-select-checkbox-container">
                    <span class="custom-checkbox" aria-label="Select update to tweet">
                        <i data-lucide="check"></i>
                    </span>
                </div>
            </div>
            <div class="release-card-body">
                ${item.html}
            </div>
            <div class="release-card-footer">
                <button class="btn-card-tweet" title="Compose Tweet about this update">
                    <i data-lucide="twitter"></i>
                    <span>Compose Tweet</span>
                </button>
            </div>
        `;

        // Card clicks
        card.addEventListener("click", (e) => {
            // Check if user clicked a link
            if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a')) {
                return; // Let links open normally
            }
            
            handleSelectCard(item);
        });

        // Tweet button click
        const tweetBtn = card.querySelector(".btn-card-tweet");
        tweetBtn.addEventListener("click", (e) => {
            e.stopPropagation(); // Prevent duplicate trigger
            handleSelectCard(item);
            // Scroll to composer on mobile
            if (window.innerWidth <= 1100) {
                document.getElementById("composer-panel").scrollIntoView({ behavior: 'smooth' });
            }
        });

        container.appendChild(card);
    });

    lucide.createIcons();
}

// Handle search bar typing
function handleSearchInput(e) {
    state.filters.search = e.target.value;
    const clearBtn = document.getElementById("search-clear-btn");
    
    if (state.filters.search.length > 0) {
        clearBtn.style.display = "block";
    } else {
        clearBtn.style.display = "none";
    }
    
    renderFeed();
}

// Clear search input
function clearSearch() {
    const input = document.getElementById("search-input");
    input.value = "";
    state.filters.search = "";
    document.getElementById("search-clear-btn").style.display = "none";
    renderFeed();
}

// Reset filters and search
function resetAllFilters() {
    clearSearch();
    state.filters.types.clear();
    updateFilterPillsUI();
    renderFeed();
}

// Sort order dropdown handler
function handleSortChange(e) {
    state.filters.sort = e.target.value;
    renderFeed();
}

// Selection of card logic
function handleSelectCard(item) {
    const cards = document.querySelectorAll(".release-card");
    
    if (state.selectedItemId === item.id) {
        // Toggle selection off if already selected
        state.selectedItemId = null;
        cards.forEach(c => c.classList.remove("selected"));
        closeComposer();
    } else {
        state.selectedItemId = item.id;
        cards.forEach(c => {
            if (c.getAttribute("data-id") === item.id) {
                c.classList.add("selected");
            } else {
                c.classList.remove("selected");
            }
        });
        openComposer(item);
    }
}

// Twitter Composer Open Logic
function openComposer(item) {
    const emptyState = document.getElementById("composer-empty-state");
    const activeState = document.getElementById("composer-active-state");
    
    emptyState.style.display = "none";
    activeState.style.display = "block";
    
    // Set reference card data
    document.getElementById("composer-ref-date").innerText = item.date;
    
    const badge = document.getElementById("composer-ref-badge");
    badge.innerText = item.type;
    badge.className = "type-badge";
    const typeLower = item.type.toLowerCase();
    let badgeClass = "badge-update";
    if (["feature", "announcement", "breaking", "changed", "deprecated", "fix", "issue"].includes(typeLower)) {
        badgeClass = `badge-${typeLower}`;
    }
    badge.classList.add(badgeClass);
    
    document.getElementById("composer-ref-preview").innerText = item.text;
    
    // Generate initial tweet text (ensuring it is safe and under 280 chars)
    // Formula: [BigQuery Type] Date: Text. Details: URL
    const prefix = `[BigQuery ${item.type}] ${item.date}: `;
    const suffix = `\n\nRead more details: https://cloud.google.com/bigquery/docs/release-notes`;
    const hashtagsStr = state.activeHashtags.size > 0 ? "\n" + Array.from(state.activeHashtags).join(" ") : "";
    
    // Let's compute allowed description length
    // Twitter limit = 280
    const currentOverhead = prefix.length + suffix.length + hashtagsStr.length;
    const allowedTextLength = 280 - currentOverhead;
    
    let descriptionText = item.text.replace(/\s+/g, ' '); // normalize spaces
    if (descriptionText.length > allowedTextLength) {
        descriptionText = descriptionText.slice(0, allowedTextLength - 3) + "...";
    }
    
    const draftText = `${prefix}${descriptionText}${suffix}${hashtagsStr}`;
    
    const textarea = document.getElementById("tweet-textarea");
    textarea.value = draftText;
    
    // Refresh composer stats
    updateComposerStats();
}

// Close Twitter Composer
function closeComposer() {
    state.selectedItemId = null;
    const cards = document.querySelectorAll(".release-card");
    cards.forEach(c => c.classList.remove("selected"));
    
    document.getElementById("composer-empty-state").style.display = "flex";
    document.getElementById("composer-active-state").style.display = "none";
}

// Handle changes in textarea
function handleTweetTextareaInput() {
    updateComposerStats();
}

// Toggle hashtag active state in Composer
function toggleHashtag(pill) {
    const hashtag = pill.getAttribute("data-tag");
    const textarea = document.getElementById("tweet-textarea");
    let text = textarea.value;

    if (state.activeHashtags.has(hashtag)) {
        // Remove hashtag
        state.activeHashtags.delete(hashtag);
        pill.classList.remove("active");
        
        // Remove from textarea text
        const regex = new RegExp(`\\s*${hashtag}\\b`, 'g');
        text = text.replace(regex, '').trim();
    } else {
        // Add hashtag
        state.activeHashtags.add(hashtag);
        pill.classList.add("active");
        
        // Append to textarea text
        text = text + " " + hashtag;
    }
    
    textarea.value = text.trim();
    updateComposerStats();
}

// Update Composer metrics, circular progress bar and mockup live tweet
function updateComposerStats() {
    const textarea = document.getElementById("tweet-textarea");
    const text = textarea.value;
    const count = text.length;
    const remaining = 280 - count;
    
    // Update count label
    const label = document.getElementById("char-count-text");
    label.innerText = remaining;
    
    // Update label color state
    label.className = "char-count";
    if (remaining <= 20 && remaining >= 0) {
        label.classList.add("warning");
    } else if (remaining < 0) {
        label.classList.add("danger");
    }

    // Update Progress Ring SVG
    const circle = document.getElementById("char-progress-circle");
    
    // Determine progress percentage (cap at 100%)
    const pct = Math.min(count / 280, 1);
    const offset = CIRCUMFERENCE - (pct * CIRCUMFERENCE);
    
    circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = offset;
    
    // Progress bar colors
    if (remaining < 0) {
        circle.style.stroke = "#ef4444"; // danger red
    } else if (remaining <= 20) {
        circle.style.stroke = "#f59e0b"; // warning amber
    } else {
        circle.style.stroke = "#1d9bf0"; // standard twitter blue
    }
    
    // Disable share button if empty or over-limit
    const shareBtn = document.getElementById("btn-share-twitter");
    if (count === 0 || remaining < 0) {
        shareBtn.disabled = true;
        shareBtn.style.opacity = 0.5;
        shareBtn.style.cursor = "not-allowed";
    } else {
        shareBtn.disabled = false;
        shareBtn.style.opacity = 1;
        shareBtn.style.cursor = "pointer";
    }
    
    // Update live mockup preview
    const preview = document.getElementById("mock-tweet-text");
    
    // Format links in preview text to look blue
    let formattedText = escapeHtml(text);
    
    // Basic URL regex replacement to anchor tags for preview visual
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedText = formattedText.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    
    // Highlight hashtags in preview
    const tagRegex = /(#[a-zA-Z0-9_]+)/g;
    formattedText = formattedText.replace(tagRegex, (tag) => {
        return `<a href="https://twitter.com/hashtag/${tag.slice(1)}" target="_blank">${tag}</a>`;
    });
    
    preview.innerHTML = formattedText || `<span style="color:#71767b">Drafting your tweet...</span>`;
}

// Escape HTML utility to prevent XSS in mock tweet rendering
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Redirect to Twitter Web Intent with drafted text
function shareOnTwitter() {
    const text = document.getElementById("tweet-textarea").value;
    if (!text || text.length > 280) return;
    
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
    window.open(twitterUrl, "_blank", "width=600,height=400,resizable=yes");
}
