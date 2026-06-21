// Application State
let state = {
    releases: [],
    filteredReleases: [],
    filters: {
        search: "",
        types: new Set(),
        sort: "newest",
        timeRange: "all" // "all", "7days", "30days", "month"
    },
    selectedItemIds: new Set(), // Set of selected item IDs
    tweetStyle: "detailed",     // "detailed", "minimal"
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
    document.getElementById("btn-export-csv").addEventListener("click", exportToCSV);
    document.getElementById("btn-theme-toggle").addEventListener("click", toggleTheme);
    
    // Tweet textarea listener
    const textarea = document.getElementById("tweet-textarea");
    textarea.addEventListener("input", handleTweetTextareaInput);

    // Hashtag pills
    const tags = document.querySelectorAll(".hashtag-pill");
    tags.forEach(pill => {
        pill.addEventListener("click", () => toggleHashtag(pill));
    });

    // Time range pills
    const timePills = document.querySelectorAll(".time-pill");
    timePills.forEach(pill => {
        pill.addEventListener("click", () => {
            timePills.forEach(p => p.classList.remove("active"));
            pill.classList.add("active");
            state.filters.timeRange = pill.getAttribute("data-range");
            renderFeed();
        });
    });

    // Tweet style switcher buttons
    const btnStyleDetailed = document.getElementById("btn-style-detailed");
    const btnStyleMinimal = document.getElementById("btn-style-minimal");
    
    if (btnStyleDetailed && btnStyleMinimal) {
        btnStyleDetailed.addEventListener("click", () => {
            btnStyleDetailed.classList.add("active");
            btnStyleDetailed.style.background = "var(--bg-card)";
            btnStyleDetailed.style.color = "var(--text-main)";
            
            btnStyleMinimal.classList.remove("active");
            btnStyleMinimal.style.background = "transparent";
            btnStyleMinimal.style.color = "var(--text-secondary)";
            
            state.tweetStyle = "detailed";
            updateComposerState();
        });
        
        btnStyleMinimal.addEventListener("click", () => {
            btnStyleMinimal.classList.add("active");
            btnStyleMinimal.style.background = "var(--bg-card)";
            btnStyleMinimal.style.color = "var(--text-main)";
            
            btnStyleDetailed.classList.remove("active");
            btnStyleDetailed.style.background = "transparent";
            btnStyleDetailed.style.color = "var(--text-secondary)";
            
            state.tweetStyle = "minimal";
            updateComposerState();
        });
    }

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

    // Apply saved theme
    applySavedTheme();

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
    
    const counts = {};
    state.releases.forEach(item => {
        counts[item.type] = (counts[item.type] || 0) + 1;
    });

    const uniqueTypes = Object.keys(counts).sort((a,b) => counts[b] - counts[a]);
    
    uniqueTypes.forEach(type => {
        const pill = document.createElement("button");
        pill.className = "filter-pill";
        pill.setAttribute("data-type", type);
        
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
        // 1. Search Query Filter
        const matchesQuery = !query || 
            item.type.toLowerCase().includes(query) || 
            item.date.toLowerCase().includes(query) || 
            item.text.toLowerCase().includes(query);
            
        // 2. Type Filter
        const matchesType = state.filters.types.size === 0 || state.filters.types.has(item.type);
        
        // 3. Time Range Filter
        let matchesTime = true;
        if (state.filters.timeRange !== 'all') {
            const itemDate = new Date(item.updated || item.date);
            const now = new Date();
            now.setHours(23, 59, 59, 999); // Reset to end of day to include today's releases
            const diffMs = now - itemDate;
            const diffDays = diffMs / (1000 * 60 * 60 * 24);
            
            if (state.filters.timeRange === '7days') {
                matchesTime = diffDays >= 0 && diffDays <= 7;
            } else if (state.filters.timeRange === '30days') {
                matchesTime = diffDays >= 0 && diffDays <= 30;
            } else if (state.filters.timeRange === 'month') {
                matchesTime = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
            }
        }
        
        return matchesQuery && matchesType && matchesTime;
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
        
        if (state.selectedItemIds.has(item.id)) {
            card.classList.add("selected");
        }
        
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
                <button class="btn-card-copy" title="Copy text to clipboard">
                    <i data-lucide="copy"></i>
                    <span>Copy</span>
                </button>
                <button class="btn-card-tweet" title="Compose Tweet about this update">
                    <i data-lucide="twitter"></i>
                    <span>Compose Tweet</span>
                </button>
            </div>
        `;

        // Card clicks
        card.addEventListener("click", (e) => {
            if (e.target.tagName.toLowerCase() === 'a' || e.target.closest('a') || e.target.closest('button')) {
                return; // Let links and buttons handle their own clicks
            }
            handleSelectCard(item);
        });

        // Copy button click
        const copyBtn = card.querySelector(".btn-card-copy");
        copyBtn.addEventListener("click", async (e) => {
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(item.text);
                
                const btnText = copyBtn.querySelector("span");
                const btnIcon = copyBtn.querySelector("i");
                const oldText = btnText.innerText;
                
                btnText.innerText = "Copied!";
                copyBtn.style.borderColor = "var(--color-fix)";
                copyBtn.style.color = "var(--color-fix)";
                
                btnIcon.setAttribute("data-lucide", "check");
                lucide.createIcons();
                
                setTimeout(() => {
                    btnText.innerText = oldText;
                    copyBtn.style.borderColor = "";
                    copyBtn.style.color = "";
                    btnIcon.setAttribute("data-lucide", "copy");
                    lucide.createIcons();
                }, 1500);
            } catch (err) {
                console.error("Clipboard Error:", err);
            }
        });

        // Tweet button click
        const tweetBtn = card.querySelector(".btn-card-tweet");
        tweetBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            
            // If it wasn't selected, select it (and unselect others if they want a clean composition of just this one)
            if (!state.selectedItemIds.has(item.id)) {
                state.selectedItemIds.clear();
                state.selectedItemIds.add(item.id);
                
                // Update all cards visual selection state
                const cards = document.querySelectorAll(".release-card");
                cards.forEach(c => {
                    const id = c.getAttribute("data-id");
                    if (state.selectedItemIds.has(id)) {
                        c.classList.add("selected");
                    } else {
                        c.classList.remove("selected");
                    }
                });
            }
            
            updateComposerState();
            
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
    state.filters.timeRange = "all";
    
    // Reset time UI active state
    const timePills = document.querySelectorAll(".time-pill");
    timePills.forEach(p => {
        if (p.getAttribute("data-range") === "all") {
            p.classList.add("active");
        } else {
            p.classList.remove("active");
        }
    });
    
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
    if (state.selectedItemIds.has(item.id)) {
        state.selectedItemIds.delete(item.id);
    } else {
        state.selectedItemIds.add(item.id);
    }
    
    // Update visual classes on cards
    const cards = document.querySelectorAll(".release-card");
    cards.forEach(c => {
        const id = c.getAttribute("data-id");
        if (state.selectedItemIds.has(id)) {
            c.classList.add("selected");
        } else {
            c.classList.remove("selected");
        }
    });
    
    updateComposerState();
}

// Update Composer panel state based on current selections
function updateComposerState() {
    const emptyState = document.getElementById("composer-empty-state");
    const activeState = document.getElementById("composer-active-state");
    
    if (state.selectedItemIds.size === 0) {
        emptyState.style.display = "flex";
        activeState.style.display = "none";
        return;
    }
    
    emptyState.style.display = "none";
    activeState.style.display = "block";
    
    // Retrieve actual objects of selected releases
    const selectedItems = state.releases.filter(item => state.selectedItemIds.has(item.id));
    
    // Sort selected items by date (newest first)
    selectedItems.sort((a, b) => new Date(b.updated || b.date) - new Date(a.updated || a.date));
    
    const badge = document.getElementById("composer-ref-badge");
    const dateLabel = document.getElementById("composer-ref-date");
    const textPreview = document.getElementById("composer-ref-preview");
    
    if (selectedItems.length === 1) {
        const item = selectedItems[0];
        dateLabel.innerText = item.date;
        badge.innerText = item.type;
        badge.className = "type-badge";
        
        const typeLower = item.type.toLowerCase();
        let badgeClass = "badge-update";
        if (["feature", "announcement", "breaking", "changed", "deprecated", "fix", "issue"].includes(typeLower)) {
            badgeClass = `badge-${typeLower}`;
        }
        badge.classList.add(badgeClass);
        textPreview.innerText = item.text;
    } else {
        // Multi-select view in reference card
        dateLabel.innerText = `${selectedItems.length} items selected`;
        badge.innerText = "Multi-Select";
        badge.className = "type-badge badge-update";
        
        textPreview.innerText = selectedItems.map((item, index) => {
            return `${index + 1}. [${item.type}] ${item.text.substring(0, 50)}...`;
        }).join("\n");
    }
    
    // Generate tweet text dynamically and write it into the editor textarea
    const textarea = document.getElementById("tweet-textarea");
    textarea.value = generateTweetText(selectedItems);
    
    // Update count labels and mockup visual
    updateComposerStats();
}

// Generate the text for the tweet based on selection size and template style
function generateTweetText(selectedItems) {
    const baseUrl = "https://cloud.google.com/bigquery/docs/release-notes";
    const hashtagsStr = state.activeHashtags.size > 0 ? "\n" + Array.from(state.activeHashtags).join(" ") : "";
    
    if (selectedItems.length === 1) {
        const item = selectedItems[0];
        if (state.tweetStyle === "detailed") {
            const prefix = `[BigQuery ${item.type}] ${item.date}: `;
            const suffix = `\n\nRead details: ${baseUrl}${hashtagsStr}`;
            const allowedLength = 280 - prefix.length - suffix.length;
            
            let desc = item.text.replace(/\s+/g, ' ');
            if (desc.length > allowedLength) {
                desc = desc.slice(0, allowedLength - 3) + "...";
            }
            return `${prefix}${desc}${suffix}`;
        } else {
            // Minimal
            const prefix = `New BigQuery ${item.type} (${item.date}): `;
            const suffix = `\n\nDetails: ${baseUrl}${hashtagsStr}`;
            const allowedLength = 280 - prefix.length - suffix.length;
            
            // Grab first sentence or truncate short
            let firstSentence = item.text.split(/[.!?]/)[0].trim();
            if (firstSentence.length > allowedLength || firstSentence.length < 15) {
                firstSentence = item.text.replace(/\s+/g, ' ');
                if (firstSentence.length > allowedLength) {
                    firstSentence = firstSentence.slice(0, allowedLength - 3) + "...";
                }
            }
            return `${prefix}${firstSentence}${suffix}`;
        }
    } else {
        // Multi-select composition
        if (state.tweetStyle === "detailed") {
            const header = `[BigQuery Updates] ${selectedItems.length} new updates:\n`;
            const suffix = `\n\nRead all: ${baseUrl}${hashtagsStr}`;
            
            const budget = 280 - header.length - suffix.length;
            const budgetPerItem = Math.floor(budget / selectedItems.length) - 8; // budget accounting for formatting
            
            const itemTexts = selectedItems.map(item => {
                // Shorten date: "June 17, 2026" -> "Jun 17"
                const dateParts = item.date.split(' ');
                const shortDate = dateParts.length >= 2 ? `${dateParts[0].slice(0, 3)} ${dateParts[1].replace(',', '')}` : item.date;
                const itemPrefix = `• ${shortDate} (${item.type}): `;
                const maxDescLen = budgetPerItem - itemPrefix.length;
                
                let desc = item.text.replace(/\s+/g, ' ');
                if (desc.length > maxDescLen) {
                    desc = desc.slice(0, maxDescLen - 3) + "...";
                }
                return `${itemPrefix}${desc}`;
            });
            
            return `${header}${itemTexts.join('\n')}${suffix}`;
        } else {
            // Minimal Multi-select
            const typesCount = {};
            selectedItems.forEach(item => {
                typesCount[item.type] = (typesCount[item.type] || 0) + 1;
            });
            const typesSummary = Object.keys(typesCount).map(t => `${typesCount[t]} ${t}(s)`).join(', ');
            
            const tweet = `Check out the latest BigQuery releases! ${selectedItems.length} new updates have been posted, including: ${typesSummary}.\n\nDetails: ${baseUrl}${hashtagsStr}`;
            
            if (tweet.length > 280) {
                return `New BigQuery releases: ${selectedItems.length} changes available. Details: ${baseUrl}${hashtagsStr}`;
            }
            return tweet;
        }
    }
}

// Close Twitter Composer
function closeComposer() {
    state.selectedItemIds.clear();
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
        
        const regex = new RegExp(`\\s*${hashtag}\\b`, 'g');
        text = text.replace(regex, '').trim();
    } else {
        // Add hashtag
        state.activeHashtags.add(hashtag);
        pill.classList.add("active");
        
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
    
    const label = document.getElementById("char-count-text");
    label.innerText = remaining;
    
    label.className = "char-count";
    if (remaining <= 20 && remaining >= 0) {
        label.classList.add("warning");
    } else if (remaining < 0) {
        label.classList.add("danger");
    }

    const circle = document.getElementById("char-progress-circle");
    const pct = Math.min(count / 280, 1);
    const offset = CIRCUMFERENCE - (pct * CIRCUMFERENCE);
    
    circle.style.strokeDasharray = `${CIRCUMFERENCE} ${CIRCUMFERENCE}`;
    circle.style.strokeDashoffset = offset;
    
    if (remaining < 0) {
        circle.style.stroke = "#ef4444";
    } else if (remaining <= 20) {
        circle.style.stroke = "#f59e0b";
    } else {
        circle.style.stroke = "#1d9bf0";
    }
    
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
    
    const preview = document.getElementById("mock-tweet-text");
    let formattedText = escapeHtml(text);
    
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    formattedText = formattedText.replace(urlRegex, (url) => {
        return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
    });
    
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

// Export current filtered releases to a CSV file
function exportToCSV() {
    if (state.filteredReleases.length === 0) return;
    
    const headers = ["ID", "Date", "Updated Date", "Type", "Text Content"];
    
    const formatCSVField = (text) => {
        if (text === null || text === undefined) return '""';
        let str = String(text);
        str = str.replace(/"/g, '""');
        return `"${str}"`;
    };
    
    const rows = [
        headers.join(",")
    ];
    
    state.filteredReleases.forEach(item => {
        const row = [
            formatCSVField(item.id),
            formatCSVField(item.date),
            formatCSVField(item.updated),
            formatCSVField(item.type),
            formatCSVField(item.text)
        ];
        rows.push(row.join(","));
    });
    
    const csvContent = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    const dateStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `bigquery_release_notes_${dateStr}.csv`);
    link.style.visibility = "hidden";
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Apply saved theme preference on startup
function applySavedTheme() {
    const savedTheme = localStorage.getItem("theme") || "dark";
    const body = document.body;
    const themeIcon = document.getElementById("theme-icon");
    
    if (savedTheme === "light") {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
        if (themeIcon) {
            themeIcon.setAttribute("data-lucide", "moon");
        }
    } else {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
        if (themeIcon) {
            themeIcon.setAttribute("data-lucide", "sun");
        }
    }
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Toggle Theme between dark and light
function toggleTheme() {
    const body = document.body;
    const themeIcon = document.getElementById("theme-icon");
    
    if (body.classList.contains("light-theme")) {
        body.classList.remove("light-theme");
        body.classList.add("dark-theme");
        localStorage.setItem("theme", "dark");
        if (themeIcon) {
            themeIcon.setAttribute("data-lucide", "sun");
        }
    } else {
        body.classList.remove("dark-theme");
        body.classList.add("light-theme");
        localStorage.setItem("theme", "light");
        if (themeIcon) {
            themeIcon.setAttribute("data-lucide", "moon");
        }
    }
    if (window.lucide) {
        window.lucide.createIcons();
    }
}
