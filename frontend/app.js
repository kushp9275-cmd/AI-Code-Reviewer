// SHIELD.AI Code Reviewer - Frontend Controller

document.addEventListener('DOMContentLoaded', () => {
    
    // API endpoint definitions
    const API_STATUS_URL = '/api/status';
    const API_SCAN_URL = '/api/scan';

    // Global state
    let activeIssues = [];

    // DOM Element Selections
    const codeTextarea = document.getElementById('code-textarea');
    const filenameInput = document.getElementById('filename-input');
    const scanBtn = document.getElementById('scan-btn');
    const scanBtnText = document.getElementById('scan-btn-text');
    const scanSpinner = document.getElementById('scan-spinner');
    
    const connectionStatus = document.getElementById('connection-status');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const apiKeyBanner = document.getElementById('api-key-banner');
    
    // Panels
    const panelWelcome = document.getElementById('panel-welcome');
    const panelLoading = document.getElementById('panel-loading');
    const panelResults = document.getElementById('panel-results');
    
    // Results Metrics
    const metricHigh = document.getElementById('metric-high');
    const metricMedium = document.getElementById('metric-medium');
    const metricLow = document.getElementById('metric-low');
    const metricHealth = document.getElementById('metric-health');
    const resultSummary = document.getElementById('result-summary');
    const issuesFeed = document.getElementById('issues-feed');
    const healthBlock = document.getElementById('health-block');
    
    // Filters
    const filterToolbar = document.getElementById('filter-toolbar');
    const filterAll = document.getElementById('filter-all');
    const filterHigh = document.getElementById('filter-high');
    const filterMedium = document.getElementById('filter-medium');
    const filterLow = document.getElementById('filter-low');

    // -------------------------------------------------------------
    // 1. API Status check
    // -------------------------------------------------------------
    async function checkAPIStatus() {
        try {
            const res = await fetch(API_STATUS_URL);
            if (!res.ok) throw new Error("Offline");
            
            const data = await res.json();
            
            if (data.configured) {
                statusDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]';
                statusText.textContent = 'CONNECTED';
                statusText.className = 'text-emerald-400 font-semibold';
                apiKeyBanner.classList.add('hidden');
            } else {
                statusDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse';
                statusText.textContent = 'CREDENTIALS MISSING';
                statusText.className = 'text-yellow-500 font-semibold';
                apiKeyBanner.classList.remove('hidden');
            }
        } catch (err) {
            statusDot.className = 'w-1.5 h-1.5 rounded-full bg-red-500';
            statusText.textContent = 'OFFLINE';
            statusText.className = 'text-rose-500 font-semibold';
        }
    }

    // Ping status on load
    checkAPIStatus();

    // -------------------------------------------------------------
    // 2. Scan Execution
    // -------------------------------------------------------------
    scanBtn.addEventListener('click', async () => {
        const code = codeTextarea.value.trim();
        if (!code) {
            alert("Please paste your source code in the terminal input field first.");
            return;
        }

        // Configure loading UI state
        scanBtn.disabled = true;
        scanSpinner.classList.remove('hidden');
        scanBtnText.textContent = "[ RUNNING SCAN... ]";
        
        // Show loading panel, hide other views
        panelWelcome.classList.add('hidden');
        panelResults.classList.add('hidden');
        panelLoading.classList.remove('hidden');
        filterToolbar.classList.add('hidden');

        // Form data payload assembly
        const formData = new FormData();
        formData.append('code_text', code);
        
        const filenameVal = filenameInput.value.trim() || 'main.py';
        formData.append('filename', filenameVal);

        const startTime = Date.now();

        try {
            const res = await fetch(API_SCAN_URL, {
                method: 'POST',
                body: formData
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.detail || "SAST scan request failed.");
            }

            const data = await res.json();
            
            // Premium design delay: ensure the progress bar is visible for at least 1 second
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 1000 - elapsed);
            
            setTimeout(() => {
                renderReport(data);
            }, remaining);

        } catch (err) {
            console.error(err);
            alert(`Scan Error: ${err.message}`);
            
            // Revert loading state
            panelLoading.classList.add('hidden');
            panelWelcome.classList.remove('hidden');
        } finally {
            // Restore button trigger state
            scanBtn.disabled = false;
            scanSpinner.classList.add('hidden');
            scanBtnText.textContent = "[ Run Security Scan ]";
            checkAPIStatus(); // Update key connection status
        }
    });

    // -------------------------------------------------------------
    // 3. Render Results Report
    // -------------------------------------------------------------
    function renderReport(data) {
        panelLoading.classList.add('hidden');
        panelResults.classList.remove('hidden');
        
        activeIssues = data.issues || [];
        
        // Compute statistics
        let high = 0;
        let medium = 0;
        let low = 0;

        activeIssues.forEach(issue => {
            const sev = (issue.severity || 'low').toLowerCase();
            if (sev === 'high') high++;
            else if (sev === 'medium') medium++;
            else low++;
        });

        // Set counts
        metricHigh.textContent = high;
        metricMedium.textContent = medium;
        metricLow.textContent = low;

        // Calculate a mock health rating based on vulnerability count and severity weights
        // High severity = 25% deduction, Medium = 10%, Low = 3%
        const healthScore = Math.max(0, 100 - (high * 25) - (medium * 10) - (low * 3));
        metricHealth.textContent = `${healthScore}%`;

        // Style the health score box dynamically
        if (healthScore >= 80) {
            healthBlock.className = "bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-lg p-2.5 text-center shadow-sm";
        } else if (healthScore >= 50) {
            healthBlock.className = "bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-lg p-2.5 text-center shadow-sm";
        } else {
            healthBlock.className = "bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-2.5 text-center shadow-sm";
        }

        // Summary statement
        resultSummary.textContent = data.summary || "Security review audit complete.";

        // Clear previous cards and populate list
        issuesFeed.innerHTML = '';

        if (activeIssues.length === 0) {
            filterToolbar.classList.add('hidden');
            issuesFeed.innerHTML = `
                <div class="bg-[#131B2E]/40 border border-[#233554]/50 rounded-xl p-8 text-center flex flex-col items-center justify-center animate-fade-in">
                    <div class="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 shadow-[0_0_8px_rgba(16,185,129,0.2)]">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h4 class="text-xs font-bold text-slate-200 mb-1 font-mono uppercase tracking-wide">Audit Clear</h4>
                    <p class="text-[10px] text-slate-500 max-w-xs leading-normal">
                        No security flaws or code quality issues detected. The code satisfies secure design recommendations.
                    </p>
                </div>
            `;
        } else {
            // Enable filtering toolbar
            filterToolbar.classList.remove('hidden');
            resetFilterButtons();
            
            // Loop and add cards
            activeIssues.forEach((issue, index) => {
                const card = createIssueCard(issue, index);
                issuesFeed.appendChild(card);
            });
        }
    }

    function createIssueCard(issue, index) {
        const severity = (issue.severity || 'low').toLowerCase();
        let badgeColor = 'bg-blue-500/10 text-blue-400 border border-blue-500/30';
        let cardBorder = 'border-[#233554]/30 hover:border-blue-500/30';

        if (severity === 'high') {
            badgeColor = 'bg-red-500/10 text-red-400 border border-red-500/30';
            cardBorder = 'border-red-500/20 hover:border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.03)]';
        } else if (severity === 'medium') {
            badgeColor = 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
            cardBorder = 'border-amber-500/20 hover:border-amber-500/40';
        }

        const card = document.createElement('div');
        card.className = `issue-card bg-[#0D1424]/80 border ${cardBorder} rounded-xl p-5 space-y-3 transition-all duration-300 animate-fade-in`;
        card.dataset.severity = severity;
        card.dataset.index = index;

        card.innerHTML = `
            <!-- Header -->
            <div class="flex items-start justify-between gap-4">
                <div class="flex flex-col gap-1.5">
                    <span class="inline-block self-start text-[8px] font-bold font-mono tracking-widest uppercase px-2 py-0.5 rounded ${badgeColor}">
                        ${issue.severity}
                    </span>
                    <h4 class="text-xs font-bold text-slate-100">${escapeHTML(issue.title)}</h4>
                </div>
                <div class="text-[9px] font-mono font-semibold text-slate-500">
                    Line ${issue.line_number || 'N/A'}
                </div>
            </div>
            
            <!-- Description -->
            <p class="text-[11px] text-slate-400 leading-relaxed">
                ${escapeHTML(issue.description)}
            </p>
            
            <!-- Split Code Block View -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <!-- Vulnerable Code block -->
                <div class="flex flex-col rounded-lg overflow-hidden border border-red-500/20 bg-red-950/5">
                    <div class="bg-red-500/10 px-3 py-1.5 text-[9px] font-mono font-bold text-red-400 border-b border-red-500/20">
                        VULNERABLE CODE
                    </div>
                    <pre class="p-3 overflow-x-auto text-[10px] font-mono text-red-300/90 whitespace-pre"><code>${escapeHTML(issue.vulnerable_code || '// Code snippet unavailable')}</code></pre>
                </div>
                <!-- Secure Fix block -->
                <div class="flex flex-col rounded-lg overflow-hidden border border-emerald-500/20 bg-emerald-950/5">
                    <div class="bg-emerald-500/10 px-3 py-1.5 text-[9px] font-mono font-bold text-emerald-400 border-b border-emerald-500/20 flex items-center justify-between">
                        <span>SECURE REMEDIATION</span>
                        <button class="btn-copy-fix px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300 transition-colors uppercase tracking-wider font-mono cursor-pointer">
                            Copy Fix
                        </button>
                    </div>
                    <pre class="p-3 overflow-x-auto text-[10px] font-mono text-emerald-300/90 whitespace-pre"><code>${escapeHTML(issue.secure_fix || '// Secure code fix unavailable')}</code></pre>
                </div>
            </div>
        `;

        // Add event listener to Copy button
        card.querySelector('.btn-copy-fix').addEventListener('click', (e) => {
            const button = e.currentTarget;
            const secureCode = issue.secure_fix;
            
            navigator.clipboard.writeText(secureCode).then(() => {
                button.textContent = "COPIED!";
                button.className = "px-2 py-0.5 bg-emerald-500 text-white border border-emerald-500 rounded text-[8px] font-bold transition-colors uppercase tracking-wider font-mono";
                
                setTimeout(() => {
                    button.textContent = "Copy Fix";
                    button.className = "btn-copy-fix px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300 transition-colors uppercase tracking-wider font-mono cursor-pointer";
                }, 2000);
            }).catch(err => {
                console.error("Failed to copy remediation: ", err);
            });
        });

        return card;
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // -------------------------------------------------------------
    // 4. Filtering Logic
    // -------------------------------------------------------------
    function resetFilterButtons() {
        const inactive = 'px-2 py-1 rounded text-slate-500 hover:text-slate-300 font-bold transition-all';
        const active = 'px-2 py-1 rounded bg-[#233554]/50 text-slate-200 font-bold transition-all';

        filterAll.className = inactive;
        filterHigh.className = inactive;
        filterMedium.className = inactive;
        filterLow.className = inactive;
    }

    function applyFilter(sev) {
        resetFilterButtons();
        
        // Highlight active filter button
        const activeBtn = document.getElementById(`filter-${sev}`);
        if (activeBtn) {
            activeBtn.className = 'px-2 py-1 rounded bg-[#233554]/50 text-slate-200 font-bold transition-all';
        }

        const cards = issuesFeed.querySelectorAll('.issue-card');
        cards.forEach(card => {
            if (sev === 'all' || card.dataset.severity === sev) {
                card.classList.remove('hidden');
            } else {
                card.classList.add('hidden');
            }
        });
    }

    filterAll.addEventListener('click', () => applyFilter('all'));
    filterHigh.addEventListener('click', () => applyFilter('high'));
    filterMedium.addEventListener('click', () => applyFilter('medium'));
    filterLow.addEventListener('click', () => applyFilter('low'));
});
