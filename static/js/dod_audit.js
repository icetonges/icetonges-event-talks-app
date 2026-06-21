// JavaScript for the DoD FY 2025 Audit Explorer Dashboard

document.addEventListener('DOMContentLoaded', () => {
    // App State
    let auditData = null;
    const remediatedIds = new Set();
    let activeWeakness = null;
    let currentCategory = 'All';
    let searchQuery = '';

    // AI Remedies descriptions for each weakness (fun & educational factor)
    const aiRemedies = {
        1: {
            impact: "Deployed unified cloud-native ERP ledger engines, consolidating 130+ noncompliant legacy systems. Scheduled retirement dates pulled forward from 2031 to 2028.",
            cleanProgress: 4
        },
        2: {
            impact: "Established GitOps configuration monitoring, auto-reverting unauthorized server adjustments and ensuring 100% compliance with NIST SP 800-53.",
            cleanProgress: 4
        },
        3: {
            impact: "Integrated automated compliance scanning engines that automatically catalog vulnerabilities and schedule resolution milestones.",
            cleanProgress: 3
        },
        4: {
            impact: "Deployed Google Cloud Identity, Credential, and Access Management (ICAM) solution. Terminated accounts are automatically revoked in under 5 minutes.",
            cleanProgress: 4
        },
        5: {
            impact: "Implemented cryptographic Segregation of Duties protocols. System access is dynamically verified, blocking any single operator from double-authorizing balances.",
            cleanProgress: 4
        },
        6: {
            impact: "Automated API schema validations on all inter-system interfaces, cutting total interfaces by 40% and deploying auto-reconciling data validation layers.",
            cleanProgress: 3
        },
        7: {
            impact: "Introduced transaction-level tracking across all general ledgers, replacing summary-level reporting with a complete Universe of Transactions (UoT).",
            cleanProgress: 5
        },
        8: {
            impact: "Deployed automated daily reconciliation between DoD records and the U.S. Treasury for TI-97 accounts, neutralizing $223.8B in blind spots.",
            cleanProgress: 5
        },
        9: {
            impact: "Equipped warehouses with automated RFID inventory scanning, resolving SFFAS 3 compliance and establishing ironclad evidence of valuation and existence.",
            cleanProgress: 4
        },
        10: {
            impact: "Automated the evaluation and classification of Excess, Obsolete, and Unserviceable (EOU) materials, automatically writing them down to Net Realizable Value.",
            cleanProgress: 4
        },
        11: {
            impact: "Digitized PP&E procurement documents and linked them to the General Equipment register, establishing complete historical cost support.",
            cleanProgress: 4
        },
        12: {
            impact: "Unified all Real Property databases with GIS location maps, confirming physical existence and eliminating $478B in unverified records.",
            cleanProgress: 4
        },
        13: {
            impact: "Linked contractor inventory systems to DoD property registries, replacing self-reporting with automated real-time contract audits.",
            cleanProgress: 4
        },
        14: {
            impact: "Constructed direct data pipelines into the F-35 Global Spares Pool, instantly accounting for the unquantified material spares pool assets on the balance sheet.",
            cleanProgress: 5
        },
        15: {
            impact: "Deployed automated invoice-matching engines that verify receipt of goods and immediately record accounts payable in the correct fiscal period.",
            cleanProgress: 3
        },
        16: {
            impact: "Developed predictive machine learning models to estimate future environmental disposal costs for General PP&E based on historical cleanups.",
            cleanProgress: 3
        },
        17: {
            impact: "Automated lease scanning using natural language processing to catalog, evaluate, and report lease activity under SFFAS 54.",
            cleanProgress: 3
        },
        18: {
            impact: "Enforced smart rules preventing manual ledger overrides. Journal entries now require automated validation, blocking $859B+ in unsupported adjustments.",
            cleanProgress: 5
        },
        19: {
            impact: "Fully implemented G-Invoicing across all trading partners, automating the elimination of intragovernmental balances.",
            cleanProgress: 3
        },
        20: {
            impact: "Built real-time subledger validation scripts, ensuring Gross Costs are accurately reconciled and matched to their proper accounting period.",
            cleanProgress: 3
        },
        21: {
            impact: "Implemented automated billing and revenue-tracking systems matching services rendered to cash received to stabilize Earned Revenue logs.",
            cleanProgress: 3
        },
        22: {
            impact: "Created automated Note 24 reconciliation dashboard, resolving the $1.3B difference between budgetary resources and net outlays.",
            cleanProgress: 3
        },
        23: {
            impact: "Deployed automated SBR monitoring and alert systems, preventing Antideficiency Act (ADA) violations by locking accounts before caps are breached.",
            cleanProgress: 4
        },
        24: {
            impact: "Implemented real-time SOC report analysis tools, verifying service organization internal controls and logging complementary user controls.",
            cleanProgress: 3
        },
        25: {
            impact: "Introduced corporate-level internal audit monitoring dashboards, providing real-time entity control overview to the CFO.",
            cleanProgress: 3
        },
        26: {
            impact: "Synced DDRS reports to the component ledger systems in real-time, blocking out-of-sync consolidations and pulling forward BPC balances.",
            cleanProgress: 4
        }
    };

    // DOM Elements
    const navTabs = document.querySelectorAll('.nav-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const categoryPills = document.querySelectorAll('.filter-pill');
    const searchInput = document.getElementById('weakness-search');
    const weaknessGrid = document.getElementById('weaknesses-container');
    const misstatementsGrid = document.getElementById('misstatements-container');
    const roadmapContainer = document.getElementById('roadmap-container');
    
    // Drawer Elements
    const detailsDrawer = document.getElementById('details-drawer');
    const btnCloseDrawer = document.getElementById('btn-close-drawer');
    const drawerEmptyState = document.getElementById('drawer-empty-state');
    const drawerActiveState = document.getElementById('drawer-active-state');
    const drawerCategoryBadge = document.getElementById('drawer-category-badge');
    const drawerId = document.getElementById('drawer-id');
    const drawerTitle = document.getElementById('drawer-title');
    const drawerDescription = document.getElementById('drawer-description');
    const drawerRecommendationsList = document.getElementById('drawer-recommendations-list');
    const drawerRemedyStatus = document.getElementById('drawer-remedy-status');
    const drawerRemedyImpactRow = document.getElementById('drawer-remedy-impact-row');
    const drawerRemedyImpactDesc = document.getElementById('drawer-remedy-impact-desc');
    const btnRemediateIndividual = document.getElementById('btn-remediate-individual');

    // Simulation Elements
    const gaugeBar = document.getElementById('gauge-bar-progress');
    const gaugeValueText = document.getElementById('gauge-value-text');
    const simSolvedText = document.getElementById('sim-solved');
    const predictedOpinionText = document.getElementById('predicted-opinion');
    const topOpinionTag = document.querySelector('.opinion-tag');
    const btnAutoRemediate = document.getElementById('btn-auto-remediate');
    const btnResetSimulation = document.getElementById('btn-reset-simulation');

    // Init
    init();

    async function init() {
        try {
            const response = await fetch('/api/dod-audit');
            const resData = await response.json();
            if (resData.status === 'success') {
                auditData = resData.data;
                renderDashboard();
                setupEventListeners();
                updateSimulationUI();
            } else {
                console.error("Failed to load audit data", resData.error);
            }
        } catch (error) {
            console.error("Error fetching audit data", error);
        }
    }

    function renderDashboard() {
        renderWeaknesses();
        renderMisstatements();
        renderRoadmap();
        lucide.createIcons();
    }

    function setupEventListeners() {
        // Tab Navigation
        navTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                navTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const target = tab.getAttribute('data-target');
                tabPanels.forEach(panel => {
                    if (panel.id === `panel-${target}`) {
                        panel.classList.add('active');
                    } else {
                        panel.classList.remove('active');
                    }
                });
            });
        });

        // Category Filter Pills
        categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                categoryPills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
                currentCategory = pill.getAttribute('data-category');
                renderWeaknesses();
                lucide.createIcons();
            });
        });

        // Search Input
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.toLowerCase().trim();
            renderWeaknesses();
            lucide.createIcons();
        });

        // Drawer Close
        btnCloseDrawer.addEventListener('click', closeDrawer);

        // Individual Remediation Button in Drawer
        btnRemediateIndividual.addEventListener('click', () => {
            if (!activeWeakness) return;
            toggleRemediation(activeWeakness.id);
        });

        // Auto Remediate Blast Button
        btnAutoRemediate.addEventListener('click', triggerRemediationBlast);

        // Reset Simulation Button
        btnResetSimulation.addEventListener('click', resetSimulation);
        
        // Key Materiality Clicks - search filters
        document.querySelectorAll('.materiality-item').forEach(item => {
            item.addEventListener('click', () => {
                const name = item.querySelector('.materiality-name').textContent;
                searchInput.value = name;
                searchQuery = name.toLowerCase();
                
                // Switch to Weaknesses Tab if not active
                const weaknessTab = document.querySelector('[data-target="weaknesses"]');
                weaknessTab.click();
                
                // Show all categories
                const allPill = document.querySelector('[data-category="All"]');
                allPill.click();
                
                renderWeaknesses();
                lucide.createIcons();
            });
        });
    }

    function renderWeaknesses() {
        if (!auditData) return;
        
        weaknessGrid.innerHTML = '';
        const filtered = auditData.materialWeaknesses.filter(item => {
            const matchesCat = currentCategory === 'All' || item.category === currentCategory;
            const matchesSearch = item.title.toLowerCase().includes(searchQuery) || 
                                  item.description.toLowerCase().includes(searchQuery);
            return matchesCat && matchesSearch;
        });

        if (filtered.length === 0) {
            weaknessGrid.innerHTML = `<div class="empty-container" style="grid-column: 1/-1; display: block; text-align: center; padding: 2rem;">
                <i data-lucide="info" style="margin: 0 auto 1rem; width: 32px; height: 32px; color: var(--text-dimmed);"></i>
                <h3>No Material Weaknesses Found</h3>
                <p>Try adjusting your filters or search keywords.</p>
            </div>`;
            return;
        }

        filtered.forEach(item => {
            const isRemediated = remediatedIds.has(item.id);
            const card = document.createElement('div');
            card.className = `weakness-card ${isRemediated ? 'remediated' : ''} ${activeWeakness && activeWeakness.id === item.id ? 'active-select' : ''}`;
            card.innerHTML = `
                <div class="weakness-card-top">
                    <div class="weakness-card-meta">
                        <span class="category-tag" data-cat="${item.category}">${item.category}</span>
                        <span class="id-label">MW-${item.id}</span>
                    </div>
                    <h4 class="weakness-card-title">${item.title}</h4>
                </div>
                <div class="weakness-card-bottom">
                    <span class="remedy-badge ${isRemediated ? 'remediated' : 'unsolved'}">
                        ${isRemediated ? 'AI Remedied' : 'Unresolved'}
                    </span>
                    <button class="btn-card-remedy" title="${isRemediated ? 'Revoke AI Solution' : 'Apply AI Solution'}">
                        <i data-lucide="${isRemediated ? 'check-circle' : 'zap'}"></i>
                    </button>
                </div>
            `;

            // Click on card to open details
            card.addEventListener('click', (e) => {
                // If clicked on the remedy button directly
                if (e.target.closest('.btn-card-remedy')) {
                    e.stopPropagation();
                    toggleRemediation(item.id);
                    return;
                }
                
                selectWeakness(item);
                document.querySelectorAll('.weakness-card').forEach(c => c.classList.remove('active-select'));
                card.classList.add('active-select');
            });

            weaknessGrid.appendChild(card);
        });
    }

    function renderMisstatements() {
        if (!auditData) return;
        misstatementsGrid.innerHTML = '';
        
        auditData.materialMisstatements.forEach(item => {
            const card = document.createElement('div');
            card.className = 'misstatement-card';
            card.innerHTML = `
                <div class="misstatement-metric-box">
                    <span class="misstatement-amount">${item.amount}</span>
                    <span class="misstatement-impact-badge ${item.impact.toLowerCase()}">${item.impact} Impact</span>
                </div>
                <div class="misstatement-card-details">
                    <h3>${item.title}</h3>
                    <p>${item.description}</p>
                </div>
            `;
            
            // Interaction: clicking misstatement highlights search
            card.addEventListener('click', () => {
                searchInput.value = item.title.split(' (')[0]; // search base phrase
                searchQuery = searchInput.value.toLowerCase();
                
                const weaknessTab = document.querySelector('[data-target="weaknesses"]');
                weaknessTab.click();
                
                const allPill = document.querySelector('[data-category="All"]');
                allPill.click();
                
                renderWeaknesses();
                lucide.createIcons();
            });
            
            misstatementsGrid.appendChild(card);
        });
    }

    function renderRoadmap() {
        if (!auditData) return;
        roadmapContainer.innerHTML = '';

        auditData.roadmap2028.forEach((item, index) => {
            const div = document.createElement('div');
            div.className = 'timeline-item';
            div.innerHTML = `
                <div class="timeline-marker"></div>
                <div class="timeline-phase">${item.phase}</div>
                <h3>${item.title}</h3>
                <div class="timeline-milestone">${item.milestone}</div>
            `;
            roadmapContainer.appendChild(div);
        });
    }

    function selectWeakness(item) {
        activeWeakness = item;
        drawerEmptyState.style.display = 'none';
        drawerActiveState.style.display = 'flex';
        
        drawerCategoryBadge.textContent = item.category;
        drawerCategoryBadge.setAttribute('data-cat', item.category);
        drawerId.textContent = item.id;
        drawerTitle.textContent = item.title;
        drawerDescription.textContent = item.description;

        drawerRecommendationsList.innerHTML = '';
        item.recommendations.forEach(rec => {
            const li = document.createElement('li');
            li.textContent = rec;
            drawerRecommendationsList.appendChild(li);
        });

        updateDrawerRemedyUI();
        lucide.createIcons();
    }

    function closeDrawer() {
        activeWeakness = null;
        drawerActiveState.style.display = 'none';
        drawerEmptyState.style.display = 'flex';
        document.querySelectorAll('.weakness-card').forEach(c => c.classList.remove('active-select'));
    }

    function updateDrawerRemedyUI() {
        if (!activeWeakness) return;
        
        const isRemediated = remediatedIds.has(activeWeakness.id);
        if (isRemediated) {
            drawerRemedyStatus.textContent = 'AI Remediation Active';
            drawerRemedyStatus.className = 'status-badge status-val status-badge remediated';
            drawerRemedyImpactRow.style.display = 'block';
            drawerRemedyImpactDesc.textContent = aiRemedies[activeWeakness.id].impact;
            btnRemediateIndividual.className = 'btn btn-remediate-action solved';
            btnRemediateIndividual.querySelector('span').textContent = 'Revoke Remedy';
            btnRemediateIndividual.querySelector('i').setAttribute('data-lucide', 'rotate-ccw');
        } else {
            drawerRemedyStatus.textContent = 'Unsolved Deficiencies';
            drawerRemedyStatus.className = 'status-badge status-val status-badge disclaimer';
            drawerRemedyImpactRow.style.display = 'none';
            btnRemediateIndividual.className = 'btn btn-primary btn-remediate-action';
            btnRemediateIndividual.querySelector('span').textContent = 'Simulate AI Remedy';
            btnRemediateIndividual.querySelector('i').setAttribute('data-lucide', 'zap');
        }
    }

    function toggleRemediation(id) {
        if (remediatedIds.has(id)) {
            remediatedIds.delete(id);
        } else {
            remediatedIds.add(id);
        }
        
        // Audio tick effect if supported
        try {
            const context = new (window.AudioContext || window.webkitAudioContext)();
            const osc = context.createOscillator();
            const gain = context.createGain();
            osc.connect(gain);
            gain.connect(context.destination);
            osc.frequency.setValueAtTime(remediatedIds.has(id) ? 800 : 400, context.currentTime);
            gain.gain.setValueAtTime(0.05, context.currentTime);
            osc.start();
            osc.stop(context.currentTime + 0.08);
        } catch(e) {}

        renderWeaknesses();
        updateDrawerRemedyUI();
        updateSimulationUI();
        lucide.createIcons();
    }

    function updateSimulationUI() {
        const totalSolved = remediatedIds.size;
        simSolvedText.textContent = totalSolved;
        
        // Progress Calculation
        let progress = Math.round((totalSolved / 26) * 100);
        gaugeBar.style.width = `${progress}%`;
        gaugeValueText.textContent = `${progress}%`;

        // Update Opinion Tag & Projections
        if (totalSolved === 26) {
            predictedOpinionText.textContent = "Unmodified (CLEAN!)";
            predictedOpinionText.className = "predict-val clean";
            
            topOpinionTag.textContent = "Unmodified Opinion";
            topOpinionTag.className = "opinion-tag clean-active";
            topOpinionTag.style.animation = "pulse 2s infinite";
        } else if (totalSolved >= 16) {
            predictedOpinionText.textContent = "Modified / Qualified";
            predictedOpinionText.className = "predict-val clean";
            
            topOpinionTag.textContent = "Qualified Opinion";
            topOpinionTag.className = "opinion-tag clean-active";
            topOpinionTag.style.animation = "none";
        } else if (totalSolved > 0) {
            predictedOpinionText.textContent = "Disclaimer of Opinion (Improving)";
            predictedOpinionText.className = "predict-val";
            
            topOpinionTag.textContent = "Disclaimer (Draft)";
            topOpinionTag.className = "opinion-tag disclaimer";
            topOpinionTag.style.animation = "none";
        } else {
            predictedOpinionText.textContent = "Disclaimer of Opinion";
            predictedOpinionText.className = "predict-val";
            
            topOpinionTag.textContent = "Disclaimer of Opinion";
            topOpinionTag.className = "opinion-tag disclaimer";
            topOpinionTag.style.animation = "none";
        }
    }

    function triggerRemediationBlast() {
        if (!auditData) return;
        
        // Disable button during animation
        btnAutoRemediate.disabled = true;
        btnAutoRemediate.querySelector('span').textContent = 'Remediating...';
        
        let delay = 0;
        const allWeaknesses = auditData.materialWeaknesses;

        allWeaknesses.forEach(mw => {
            if (!remediatedIds.has(mw.id)) {
                setTimeout(() => {
                    toggleRemediation(mw.id);
                }, delay);
                delay += 80; // trigger one every 80ms for neat waterfall effect
            }
        });

        setTimeout(() => {
            btnAutoRemediate.disabled = false;
            btnAutoRemediate.querySelector('span').textContent = 'AI Remediation Blast';
        }, delay + 100);
    }

    function resetSimulation() {
        remediatedIds.clear();
        closeDrawer();
        renderWeaknesses();
        updateSimulationUI();
        lucide.createIcons();
    }
});
