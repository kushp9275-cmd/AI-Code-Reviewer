// SHIELD.AI Code Reviewer - Frontend Controller (Dashboard & Scans)

document.addEventListener('DOMContentLoaded', () => {
    
    // API endpoint definitions
    const API_STATUS_URL = '/api/status';
    const API_SCAN_URL = '/api/scan';

    // Global session information
    const sessionName = sessionStorage.getItem('shield_session');
    const sessionEmail = sessionStorage.getItem('shield_email');
    const isNewUser = sessionEmail && sessionEmail.trim().toLowerCase() !== 'admin@shield.ai';

    // Global dashboard datasets
    let totalReviewed = 283;
    let totalCritical = 23;
    let scanResultsDatabase = [];

    // Pre-populated Mock findings (matching showcase admin screen details)
    const mockFindings = [
        {
            title: "SQL Injection (OWASP A03)",
            severity: "High",
            line_number: "721",
            description: "Unsanitized user inputs are directly formatted into the query builder parameter block of the .filesin/amon.py wrapper.",
            vulnerable_code: "def execute_raw(user_id):\n    query = f\"SELECT * FROM users WHERE id = {user_id}\"\n    cursor.execute(query)",
            secure_fix: "def execute_raw(user_id):\n    query = \"SELECT * FROM users WHERE id = ?\"\n    cursor.execute(query, (user_id,))\n    # Parameterization completely seals against SQL Injection"
        },
        {
            title: "Insecure Resource Leaks",
            severity: "Medium",
            line_number: "127",
            description: "File handles inside Flaiver/security-documm.py are opened without a context manager or explicit .close() calls, leading to memory leaks.",
            vulnerable_code: "def read_file(path):\n    f = open(path, 'r')\n    return f.read()",
            secure_fix: "def read_file(path):\n    with open(path, 'r') as f:\n        return f.read()\n    # Using context manager auto-closes files"
        },
        {
            title: "Insecure Authentication Transmission",
            severity: "High",
            line_number: "128",
            description: "Credentials are sent over raw HTTP sockets in Flarver/security-mandhcase instead of TLS-encrypted tunnels.",
            vulnerable_code: "def send_credentials(user, pwd):\n    socket.connect(('http://auth.shield.ai', 80))\n    socket.send(f'{user}:{pwd}')",
            secure_fix: "import ssl\ncontext = ssl.create_default_context()\nwith socket.create_connection(('auth.shield.ai', 443)) as sock:\n    with context.wrap_socket(sock, server_hostname='auth.shield.ai') as ssock:\n        ssock.send(f'{user}:{pwd}')"
        },
        {
            title: "Cross-Site Scripting (XSS)",
            severity: "Medium",
            line_number: "77",
            description: "Unsanitized input is rendered directly into the HTML body via element.innerHTML inside Flenver/security-hatks-gmeece.py.",
            vulnerable_code: "function showMessage(msg) {\n    document.getElementById('msg-box').innerHTML = msg;\n}",
            secure_fix: "function showMessage(msg) {\n    const box = document.getElementById('msg-box');\n    box.textContent = msg; // Escape code input via textContent\n}"
        }
    ];

    // DOM Element Selections
    const triggerScanBtn = document.getElementById('trigger-scan-btn');
    const scanModal = document.getElementById('scan-modal');
    const closeScanModal = document.getElementById('close-scan-modal');
    
    const codeTextarea = document.getElementById('code-textarea');
    const filenameInput = document.getElementById('filename-input');
    const scanBtn = document.getElementById('scan-btn');
    const scanBtnText = document.getElementById('scan-btn-text');
    const scanSpinner = document.getElementById('scan-spinner');
    
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const apiKeyBanner = document.getElementById('api-key-banner');
    const panelLoading = document.getElementById('panel-loading');
    
    // Summary Cards
    const statReviewed = document.getElementById('stat-reviewed');
    const statCritical = document.getElementById('stat-critical');
    const logsContainer = document.getElementById('logs-container');
    const scanQueueBody = document.getElementById('scan-queue-body');
    const findingsTableBody = document.getElementById('findings-table-body');
    
    // Code Diff Modal
    const diffModal = document.getElementById('diff-modal');
    const closeModal = document.getElementById('close-modal');
    const modalTitle = document.getElementById('modal-issue-title');
    const modalLine = document.getElementById('modal-issue-line');
    const modalSeverity = document.getElementById('modal-issue-severity');
    const modalVulnerable = document.getElementById('modal-vulnerable-code');
    const modalSecure = document.getElementById('modal-secure-code');
    const btnCopyFix = document.getElementById('btn-copy-fix');

    // SPA View Sections
    const viewOverview = document.getElementById('view-overview');
    const viewScanHistory = document.getElementById('view-scan-history');
    const viewVulnDb = document.getElementById('view-vuln-db');
    const viewIntegrations = document.getElementById('view-integrations');
    const viewSettings = document.getElementById('view-settings');
    const sidebarNav = document.getElementById('sidebar-nav');

    // -------------------------------------------------------------
    // 1. Initial State / Reset for New Users
    // -------------------------------------------------------------
    function handleInitialUserState() {
        // Set user avatar letter from session
        if (sessionName) {
            const badges = document.querySelectorAll('.rounded-full');
            badges.forEach(badge => {
                if (badge.classList.contains('bg-purple-600') || badge.textContent === 'K') {
                    badge.textContent = sessionName.charAt(0).toUpperCase();
                }
            });
        }

        if (isNewUser) {
            // New user has NO pre-loaded metrics or scan data
            totalReviewed = parseInt(localStorage.getItem('shield_scan_count') || '0', 10);
            totalCritical = parseInt(localStorage.getItem('shield_flaws_count') || '0', 10);
            
            // Populate stats text
            statReviewed.textContent = totalReviewed;
            statCritical.textContent = totalCritical;
            document.getElementById('stat-fp').textContent = totalReviewed > 0 ? '0.03%' : '0.00%';
            document.getElementById('stat-remediation').textContent = totalReviewed > 0 ? '3h 50m' : '0h 0m';
            
            // Empty listings
            scanQueueBody.innerHTML = '';
            findingsTableBody.innerHTML = '';
            logsContainer.innerHTML = '';

            // Render a welcome logs card
            const welcomeCard = document.createElement('div');
            welcomeCard.className = "bg-[#070A13]/60 border border-[#233554]/30 rounded-xl p-4 space-y-2 animate-fade-in";
            welcomeCard.innerHTML = `
                <div class="flex justify-between items-center text-[10px] font-mono">
                    <div class="flex items-center gap-2">
                        <span class="w-2.5 h-2.5 rounded-full bg-[#00F0FF]/30 flex items-center justify-center text-[7px] text-[#00F0FF] font-bold">i</span>
                        <span class="text-slate-300 font-bold">System Initialization</span>
                    </div>
                </div>
                <div class="font-mono text-[9px] text-slate-400 pl-4 border-l border-[#233554]/50 leading-relaxed">
                    <p>Welcome to SHIELD.AI, ${escapeHTML(sessionName)}!</p>
                    <p>No scans performed yet. Click "[ + New Scan / Upload ]" below to perform your first automated SAST audit.</p>
                </div>
            `;
            logsContainer.appendChild(welcomeCard);

            // Load any saved scans from local storage
            const savedScans = JSON.parse(localStorage.getItem('shield_user_scans') || '[]');
            savedScans.forEach(scan => {
                scanResultsDatabase.push(scan.issue);
                const rowIdx = scanResultsDatabase.length - 1;
                
                // Add Queue Row
                const queueRow = document.createElement('tr');
                queueRow.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors";
                queueRow.innerHTML = `
                    <td class="p-3 text-slate-300 max-w-[120px] truncate">${escapeHTML(scan.filename)}</td>
                    <td class="p-3 text-slate-400">${escapeHTML(scan.language)}</td>
                    <td class="p-3 text-center font-bold text-slate-200">1</td>
                    <td class="p-3 text-center text-emerald-400">100%</td>
                    <td class="p-3 text-right text-emerald-400 font-bold">Completed</td>
                `;
                scanQueueBody.appendChild(queueRow);

                // Add Finding Row
                const findingRow = document.createElement('tr');
                findingRow.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors";
                findingRow.innerHTML = `
                    <td class="p-3 text-slate-300 font-bold">${escapeHTML(scan.filename)}</td>
                    <td class="p-3 text-slate-400">${escapeHTML(scan.issue.title)}</td>
                    <td class="p-3 text-center text-slate-400">${scan.issue.line_number || 'N/A'}</td>
                    <td class="p-3 text-right">
                        <button class="text-[#00F0FF] hover:underline font-semibold cursor-pointer outline-none border-0 bg-transparent btn-view-finding" data-idx="${rowIdx}">View details & suggestions</button>
                    </td>
                `;
                findingRow.querySelector('.btn-view-finding').addEventListener('click', (e) => {
                    const idx = e.target.getAttribute('data-idx');
                    openRemediationModal(scanResultsDatabase[idx]);
                });
                findingsTableBody.appendChild(findingRow);
            });
        } else {
            // Showcase admin view: show standard pre-populated mock details
            statReviewed.textContent = totalReviewed;
            statCritical.textContent = totalCritical;
            document.getElementById('stat-fp').textContent = '0.03%';
            document.getElementById('stat-remediation').textContent = '3h 50m';
            scanResultsDatabase = [...mockFindings];

            // 1. Populate mock logs
            logsContainer.innerHTML = `
                <div class="bg-[#070A13]/60 border border-[#233554]/30 rounded-xl p-4 space-y-2">
                    <div class="flex justify-between items-center text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-yellow-500/80 flex items-center justify-center text-[8px] text-black font-bold font-sans">Py</span>
                            <span class="text-slate-300 font-bold">Python</span>
                            <span class="text-slate-500">Commit: #3757eo832ad7</span>
                        </div>
                        <span class="text-slate-500">Name/name</span>
                    </div>
                    <div class="font-mono text-[9px] text-[#A0AEC0] space-y-1 pl-4 border-l border-[#233554]/50 leading-relaxed">
                        <p>Real-time AI analysis logs completed reviews...</p>
                        <p>Real-time AI analysis logs evaluating vulnerabilities...</p>
                        <p>Real-time AI analysis logs tracking commit...</p>
                        <p>Real-time AI analysis logs: audit finished successfully...</p>
                    </div>
                </div>
                <div class="bg-[#070A13]/60 border border-[#233554]/30 rounded-xl p-4 space-y-2">
                    <div class="flex justify-between items-center text-[10px] font-mono">
                        <div class="flex items-center gap-2">
                            <span class="w-2.5 h-2.5 rounded-full bg-blue-500/80 flex items-center justify-center text-[8px] text-white font-bold font-sans">JS</span>
                            <span class="text-slate-300 font-bold">JavaScript</span>
                            <span class="text-slate-500">Commit: #3759ea9e7ab6</span>
                        </div>
                        <span class="text-slate-500">Name/name</span>
                    </div>
                    <div class="font-mono text-[9px] text-[#A0AEC0] space-y-1 pl-4 border-l border-[#233554]/50 leading-relaxed">
                        <p>Real-time AI analysis logs comparing to injection patterns...</p>
                        <p>Real-time AI analysis logs firmware modules...</p>
                        <p>Real-time AI analysis logs validation complete...</p>
                    </div>
                </div>
            `;

            // 2. Populate mock queue
            scanQueueBody.innerHTML = `
                <tr class="border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors">
                    <td class="p-3 text-slate-300 max-w-[120px] truncate">/non/s/nonlangar.py</td>
                    <td class="p-3 text-slate-400">Python</td>
                    <td class="p-3 text-center font-bold text-slate-200">3</td>
                    <td class="p-3 text-center text-emerald-400">100%</td>
                    <td class="p-3 text-right text-emerald-400 font-bold">Completed</td>
                </tr>
                <tr class="hover:bg-[#070A13]/30 transition-colors">
                    <td class="p-3 text-slate-300 max-w-[120px] truncate">/repositors/JavaScript</td>
                    <td class="p-3 text-slate-400">JavaScript</td>
                    <td class="p-3 text-center font-bold text-slate-200">5</td>
                    <td class="p-3 text-center text-emerald-400">98.8%</td>
                    <td class="p-3 text-right text-emerald-400 font-bold">Completed</td>
                </tr>
            `;

            // 3. Populate mock findings table
            findingsTableBody.innerHTML = '';
            mockFindings.forEach((issue, idx) => {
                const row = document.createElement('tr');
                row.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors";
                row.innerHTML = `
                    <td class="p-3 text-slate-300 font-bold">${idx === 0 ? '.filesin/amon.py' : idx === 1 ? 'Flaiver/security-documm.py' : idx === 2 ? 'Flarver/security-mandhcase' : 'Flenver/security-hatks-gmeece.py'}</td>
                    <td class="p-3 text-slate-400">${escapeHTML(issue.title)}</td>
                    <td class="p-3 text-center text-slate-400">${issue.line_number || 'N/A'}</td>
                    <td class="p-3 text-right">
                        <button class="text-[#00F0FF] hover:underline font-semibold cursor-pointer outline-none border-0 bg-transparent btn-view-mock" data-issue-idx="${idx}">View details & suggestions</button>
                    </td>
                `;
                findingsTableBody.appendChild(row);
            });

            // Re-bind click event to mock buttons
            const mockRowButtons = findingsTableBody.querySelectorAll('.btn-view-mock');
            mockRowButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-issue-idx'), 10);
                    openRemediationModal(mockFindings[idx]);
                });
            });
        }
    }

    // -------------------------------------------------------------
    // 2. Initialize Chart.js Instances
    // -------------------------------------------------------------
    let severityChart, issueDonutChart;
    
    function initCharts() {
        const barCtx = document.getElementById('severityBarChart').getContext('2d');
        const donutCtx = document.getElementById('issueDonutChart').getContext('2d');
        
        // Data configurations (0s for new user, mock values for showcase admin)
        const barData = isNewUser ? [0, 0, 0, 0, 0] : [110, 80, 90, 22, 50];
        const donutData = isNewUser ? [0, 0, 0, 0, 0, 0] : [30, 20, 15, 12, 13, 10];

        // If new user has loaded local scans, update chart metrics
        if (isNewUser) {
            const savedScans = JSON.parse(localStorage.getItem('shield_user_scans') || '[]');
            savedScans.forEach(scan => {
                const sev = (scan.issue.severity || 'low').toLowerCase();
                if (sev === 'high' || sev === 'critical') barData[1]++;
                else if (sev === 'medium') barData[2]++;
                else barData[3]++;

                // Increment donut category
                donutData[0]++;
            });
        }

        severityChart = new Chart(barCtx, {
            type: 'bar',
            data: {
                labels: ['Critical', 'High', 'Medium', 'Low', 'Info'],
                datasets: [{
                    data: barData,
                    backgroundColor: ['#EF4444', '#F97316', '#F59E0B', '#10B981', '#3B82F6'],
                    borderRadius: 4,
                    borderWidth: 0,
                    barThickness: 12
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#475569', font: { size: 8, family: 'Fira Code' } } },
                    y: { grid: { color: '#1E293B' }, ticks: { color: '#475569', font: { size: 8, family: 'Fira Code' } } }
                }
            }
        });

        issueDonutChart = new Chart(donutCtx, {
            type: 'doughnut',
            data: {
                labels: ['SQL Injection', 'XSS', 'Resource Leaks', 'Etc', 'Common fses...', 'Others'],
                datasets: [{
                    data: donutData,
                    backgroundColor: ['#3B82F6', '#F97316', '#10B981', '#6B7280', '#F59E0B', '#9CA3AF'],
                    borderWidth: 1,
                    borderColor: '#111827'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#64748B', boxWidth: 8, font: { size: 8, family: 'Plus Jakarta Sans' } }
                    }
                },
                cutout: '65%'
            }
        });
    }

    // Run startup binders
    handleInitialUserState();
    initCharts();

    // -------------------------------------------------------------
    // 3. SPA View Toggling & Routing
    // -------------------------------------------------------------
    function switchView(viewName) {
        // Hide all views
        viewOverview.classList.add('hidden');
        viewScanHistory.classList.add('hidden');
        viewVulnDb.classList.add('hidden');
        viewIntegrations.classList.add('hidden');
        viewSettings.classList.add('hidden');

        // Show active view
        if (viewName === 'overview') viewOverview.classList.remove('hidden');
        else if (viewName === 'scan-history') {
            viewScanHistory.classList.remove('hidden');
            populateScanHistory();
        } else if (viewName === 'vuln-db') viewVulnDb.classList.remove('hidden');
        else if (viewName === 'integrations') viewIntegrations.classList.remove('hidden');
        else if (viewName === 'settings') {
            viewSettings.classList.remove('hidden');
        }

        // Update button active highlighting styles
        const buttons = sidebarNav.querySelectorAll('button[data-view]');
        buttons.forEach(btn => {
            const btnView = btn.getAttribute('data-view');
            const svg = btn.querySelector('svg');
            
            if (btnView === viewName) {
                btn.className = "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg bg-[#00F0FF] text-[#0B0F19] transition-all text-xs font-bold shadow-[0_0_12px_rgba(0,240,255,0.2)] animate-fade-in text-left";
                if (svg) svg.className.baseVal = "shrink-0 text-[#0B0F19]";
            } else {
                btn.className = "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-slate-400 hover:text-slate-200 transition-colors text-xs font-semibold text-left";
                if (svg) svg.className.baseVal = "shrink-0 text-slate-500";
            }
        });
    }

    // Sidebar button clicks
    sidebarNav.querySelectorAll('button[data-view]').forEach(btn => {
        btn.addEventListener('click', () => {
            const view = btn.getAttribute('data-view');
            switchView(view);
        });
    });

    // Check query params on load (e.g. redirected from Profile page)
    const urlParams = new URLSearchParams(window.location.search);
    const initialView = urlParams.get('view') || 'overview';
    switchView(initialView);

    // -------------------------------------------------------------
    // 4. Scan History populating
    // -------------------------------------------------------------
    const scanHistoryTbody = document.getElementById('scan-history-tbody');
    
    function populateScanHistory() {
        scanHistoryTbody.innerHTML = '';
        
        let scansToRender = [];
        if (isNewUser) {
            scansToRender = JSON.parse(localStorage.getItem('shield_user_scans') || '[]');
        } else {
            // Mock history for showcase admin
            scansToRender = [
                { date: "2026-07-05 18:42", filename: "amon.py", language: "Python", issue: mockFindings[0] },
                { date: "2026-07-05 18:15", filename: "security-documm.py", language: "Python", issue: mockFindings[1] },
                { date: "2026-07-05 17:40", filename: "security-mandhcase.py", language: "Python", issue: mockFindings[2] },
                { date: "2026-07-05 16:33", filename: "security-hatks-gmeece.py", language: "JavaScript", issue: mockFindings[3] }
            ];
        }

        if (scansToRender.length === 0) {
            scanHistoryTbody.innerHTML = `
                <tr>
                    <td colspan="5" class="p-8 text-center text-slate-500">
                        No code audits recorded in history. Switch to the Overview tab and scan files to see logs here.
                    </td>
                </tr>
            `;
            return;
        }

        scansToRender.forEach((scan, idx) => {
            const dateStr = scan.date || new Date().toISOString().replace('T', ' ').substring(0, 16);
            const row = document.createElement('tr');
            row.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors";
            row.innerHTML = `
                <td class="p-3 text-slate-400 font-mono">${dateStr}</td>
                <td class="p-3 text-slate-200 font-bold">${escapeHTML(scan.filename)}</td>
                <td class="p-3 text-slate-400">${escapeHTML(scan.language)}</td>
                <td class="p-3 text-center text-red-400 font-bold">1</td>
                <td class="p-3 text-right">
                    <button class="px-3 py-1 bg-[#1D4ED8] hover:bg-blue-700 text-white rounded text-[9px] font-bold uppercase transition-colors tracking-wider cursor-pointer btn-history-details" data-history-idx="${idx}">View Details</button>
                </td>
            `;

            row.querySelector('.btn-history-details').addEventListener('click', () => {
                openRemediationModal(scan.issue);
            });

            scanHistoryTbody.appendChild(row);
        });
    }

    // -------------------------------------------------------------
    // 5. Integrations Connect Action Binders
    // -------------------------------------------------------------
    setupIntegrationConnector('github');
    setupIntegrationConnector('gitlab');
    setupIntegrationConnector('bitbucket');

    function setupIntegrationConnector(platform) {
        const btn = document.getElementById(`btn-connect-${platform}`);
        const badge = document.getElementById(`${platform}-badge`);
        if (!btn || !badge) return;

        btn.addEventListener('click', () => {
            if (btn.textContent === 'Connect Account' || btn.textContent.startsWith('Connect')) {
                btn.disabled = true;
                btn.textContent = 'CONNECTING...';
                
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = 'DISCONNECT';
                    btn.className = "w-full bg-red-600 hover:bg-red-700 text-white font-mono text-[9px] py-2 rounded-lg font-bold transition-all uppercase tracking-wider";
                    badge.textContent = 'CONNECTED';
                    badge.className = "px-1.5 py-0.5 rounded text-[7px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                }, 1000);
            } else {
                btn.textContent = `Connect ${platform === 'github' ? 'Account' : platform.charAt(0).toUpperCase() + platform.slice(1)}`;
                btn.className = "w-full bg-[#1D4ED8] hover:bg-blue-700 text-white font-mono text-[9px] py-2 rounded-lg font-bold transition-all uppercase tracking-wider";
                badge.textContent = 'DISCONNECTED';
                badge.className = "px-1.5 py-0.5 rounded text-[7px] font-mono font-bold bg-slate-500/10 text-slate-400 border border-slate-500/20";
            }
        });
    }

    // -------------------------------------------------------------
    // 6. Settings Saver Binders
    // -------------------------------------------------------------
    const btnSaveSettings = document.getElementById('btn-save-settings');
    if (btnSaveSettings) {
        btnSaveSettings.addEventListener('click', () => {
            const modelInput = document.getElementById('setting-model').value;
            const thresholdInput = document.getElementById('setting-threshold').value;

            localStorage.setItem('shield_user_model_config', modelInput);
            localStorage.setItem('shield_user_threshold_config', thresholdInput);
            
            btnSaveSettings.textContent = 'CONFIGURATIONS SAVED SUCCESSFULLY!';
            btnSaveSettings.className = "w-full bg-emerald-500 text-slate-900 font-mono font-bold py-3.5 rounded-lg shadow-lg hover:shadow-emerald-500/10 transition-all uppercase tracking-wider text-xs cursor-pointer mt-2";
            
            setTimeout(() => {
                btnSaveSettings.textContent = '[ Save Settings ]';
                btnSaveSettings.className = "w-full bg-[#00F0FF] text-[#0B0F19] font-mono font-bold py-3.5 rounded-lg shadow-lg hover:shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all uppercase tracking-wider text-xs cursor-pointer mt-2";
            }, 2000);
        });
    }

    // -------------------------------------------------------------
    // 7. API Connection Status Ping
    // -------------------------------------------------------------
    async function checkAPIStatus() {
        try {
            const res = await fetch(API_STATUS_URL);
            if (!res.ok) throw new Error("Offline");
            
            const data = await res.json();
            
            if (data.configured) {
                if (statusDot) statusDot.className = 'w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]';
                if (statusText) {
                    statusText.textContent = 'API STATUS: CONNECTED';
                    statusText.className = 'text-emerald-400 font-semibold';
                }
                if (apiKeyBanner) apiKeyBanner.classList.add('hidden');
            } else {
                if (statusDot) statusDot.className = 'w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse';
                if (statusText) {
                    statusText.textContent = 'API STATUS: KEY MISSING';
                    statusText.className = 'text-yellow-500 font-semibold';
                }
                if (apiKeyBanner) apiKeyBanner.classList.remove('hidden');
            }
        } catch (err) {
            if (statusDot) statusDot.className = 'w-1.5 h-1.5 rounded-full bg-red-500';
            if (statusText) {
                statusText.textContent = 'API STATUS: OFFLINE';
                statusText.className = 'text-rose-500 font-semibold';
            }
        }
    }

    checkAPIStatus();

    // -------------------------------------------------------------
    // 8. Modal Overlay Controls
    // -------------------------------------------------------------
    triggerScanBtn.addEventListener('click', () => {
        scanModal.classList.remove('hidden');
        codeTextarea.focus();
    });

    closeScanModal.addEventListener('click', () => {
        scanModal.classList.add('hidden');
    });

    scanModal.addEventListener('click', (e) => {
        if (e.target === scanModal) {
            scanModal.classList.add('hidden');
        }
    });

    // -------------------------------------------------------------
    // 9. Scan Execution & Dashboard Updates
    // -------------------------------------------------------------
    scanBtn.addEventListener('click', async () => {
        const code = codeTextarea.value.trim();
        if (!code) {
            alert("Please paste your source code in the terminal input field first.");
            return;
        }

        // Configure loading UI states
        scanBtn.disabled = true;
        scanSpinner.classList.remove('hidden');
        scanBtnText.textContent = "[ RUNNING SCAN... ]";
        panelLoading.classList.remove('hidden');

        // Form payload assembly
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
                throw new Error(errorData.detail || "Scan request failed.");
            }

            const data = await res.json();
            
            // Design delay for scanning animation
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, 1000 - elapsed);
            
            setTimeout(() => {
                scanModal.classList.add('hidden');
                integrateScanResults(data, filenameVal);
            }, remaining);

        } catch (err) {
            console.error(err);
            alert(`Scan Error: ${err.message}`);
        } finally {
            // Restore button triggers
            scanBtn.disabled = false;
            scanSpinner.classList.add('hidden');
            scanBtnText.textContent = "[ Run Security Scan ]";
            panelLoading.classList.add('hidden');
            checkAPIStatus();
        }
    });

    function integrateScanResults(data, filenameVal) {
        // 1. Update Metrics
        totalReviewed += 1;
        statReviewed.textContent = totalReviewed;
        document.getElementById('stat-fp').textContent = '0.03%';
        document.getElementById('stat-remediation').textContent = '3h 50m';

        let highCount = 0;
        let mediumCount = 0;
        let lowCount = 0;

        const scanIssues = data.issues || [];
        scanIssues.forEach(issue => {
            const sev = (issue.severity || 'low').toLowerCase();
            if (sev === 'high') {
                highCount++;
                totalCritical++;
            } else if (sev === 'medium') {
                mediumCount++;
            } else {
                lowCount++;
            }
            
            // Add issue to global findings database for detail popups
            scanResultsDatabase.push(issue);

            // Save to localStorage scans list if new user
            if (isNewUser) {
                const saved = JSON.parse(localStorage.getItem('shield_user_scans') || '[]');
                saved.push({
                    date: new Date().toISOString().replace('T', ' ').substring(0, 16),
                    filename: filenameVal,
                    language: filenameVal.split('.').pop() === 'js' ? 'JavaScript' : 'Python',
                    issue: issue
                });
                localStorage.setItem('shield_user_scans', JSON.stringify(saved));
                
                // Save metrics
                localStorage.setItem('shield_scan_count', totalReviewed.toString());
                localStorage.setItem('shield_flaws_count', totalCritical.toString());
            }
        });

        statCritical.textContent = totalCritical;

        // 2. Add Row to Scan Queue Table
        const fileExt = filenameVal.split('.').pop() || 'py';
        const lang = fileExt === 'js' ? 'JavaScript' : fileExt === 'java' ? 'Java' : 'Python';
        
        const newQueueRow = document.createElement('tr');
        newQueueRow.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors animate-fade-in";
        newQueueRow.innerHTML = `
            <td class="p-3 text-slate-300 max-w-[120px] truncate">${escapeHTML(filenameVal)}</td>
            <td class="p-3 text-slate-400">${lang}</td>
            <td class="p-3 text-center font-bold text-slate-200">${scanIssues.length}</td>
            <td class="p-3 text-center text-emerald-400">100%</td>
            <td class="p-3 text-right text-emerald-400 font-bold">Completed</td>
        `;
        scanQueueBody.insertBefore(newQueueRow, scanQueueBody.firstChild);

        // 3. Add to Recent Critical Findings Table
        scanIssues.forEach(issue => {
            const rowIdx = scanResultsDatabase.length - 1;
            const newFindingRow = document.createElement('tr');
            newFindingRow.className = "border-b border-[#233554]/20 hover:bg-[#070A13]/30 transition-colors animate-fade-in";
            newFindingRow.innerHTML = `
                <td class="p-3 text-slate-300 font-bold">${escapeHTML(filenameVal)}</td>
                <td class="p-3 text-slate-400">${escapeHTML(issue.title)}</td>
                <td class="p-3 text-center text-slate-400">${issue.line_number || 'N/A'}</td>
                <td class="p-3 text-right">
                    <button class="text-[#00F0FF] hover:underline font-semibold cursor-pointer outline-none border-0 bg-transparent btn-view-finding" data-idx="${rowIdx}">View details & suggestions</button>
                </td>
            `;
            
            newFindingRow.querySelector('.btn-view-finding').addEventListener('click', (e) => {
                const idx = e.target.getAttribute('data-idx');
                openRemediationModal(scanResultsDatabase[idx]);
            });

            findingsTableBody.insertBefore(newFindingRow, findingsTableBody.firstChild);
        });

        // 4. Add Log Stream Card
        const logId = Math.random().toString(16).substring(2, 10);
        const newLogCard = document.createElement('div');
        newLogCard.className = "bg-[#070A13]/60 border border-[#233554]/30 rounded-xl p-4 space-y-2 animate-fade-in";
        newLogCard.innerHTML = `
            <div class="flex justify-between items-center text-[10px] font-mono">
                <div class="flex items-center gap-2">
                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80 flex items-center justify-center text-[7px] text-white font-bold font-sans">S</span>
                    <span class="text-slate-300 font-bold">${lang} Audit</span>
                    <span class="text-slate-500">Commit: #s${logId}</span>
                </div>
                <span class="text-slate-500">system/genai</span>
            </div>
            <div class="font-mono text-[9px] text-[#A0AEC0] space-y-1 pl-4 border-l border-[#233554]/50 leading-relaxed">
                <p>Starting static analysis scanning of ${escapeHTML(filenameVal)}...</p>
                <p>Discovered ${scanIssues.length} vulnerabilities / flaws.</p>
                <p>Remediation report generated successfully.</p>
            </div>
        `;
        logsContainer.insertBefore(newLogCard, logsContainer.firstChild);

        // 5. Update Charts
        // Increment Bar chart count
        if (highCount > 0) severityChart.data.datasets[0].data[1] += highCount; // High index
        if (mediumCount > 0) severityChart.data.datasets[0].data[2] += mediumCount; // Med index
        if (lowCount > 0) severityChart.data.datasets[0].data[3] += lowCount; // Low index
        severityChart.update();

        // Increment Donut Chart
        if (highCount > 0) {
            issueDonutChart.data.datasets[0].data[0] += highCount;
            issueDonutChart.update();
        }

        // Clear textarea
        codeTextarea.value = '';
    }

    // -------------------------------------------------------------
    // 10. Remediation Modal Logic
    // -------------------------------------------------------------
    function openRemediationModal(issue) {
        modalTitle.textContent = `${issue.title} Remediation`;
        modalLine.textContent = issue.line_number || 'N/A';
        modalSeverity.textContent = issue.severity || 'Low';
        
        const sev = (issue.severity || 'low').toLowerCase();
        modalSeverity.className = "font-bold uppercase " + 
            (sev === 'high' ? 'text-red-400' : sev === 'medium' ? 'text-amber-400' : 'text-blue-400');

        modalVulnerable.textContent = issue.vulnerable_code || '// Code snippet unavailable';
        modalSecure.textContent = issue.secure_fix || '// Fix code unavailable';

        // Reset copy button state
        btnCopyFix.textContent = "Copy Fix";
        btnCopyFix.className = "px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300 transition-colors uppercase tracking-wider font-mono cursor-pointer";

        diffModal.classList.remove('hidden');
    }

    closeModal.addEventListener('click', () => {
        diffModal.classList.add('hidden');
    });

    diffModal.addEventListener('click', (e) => {
        if (e.target === diffModal) {
            diffModal.classList.add('hidden');
        }
    });

    btnCopyFix.addEventListener('click', () => {
        const fixCode = modalSecure.textContent;
        navigator.clipboard.writeText(fixCode).then(() => {
            btnCopyFix.textContent = "COPIED!";
            btnCopyFix.className = "px-2 py-0.5 bg-emerald-500 text-white rounded text-[8px] font-bold transition-colors uppercase font-mono";
            
            setTimeout(() => {
                btnCopyFix.textContent = "Copy Fix";
                btnCopyFix.className = "btn-copy-fix px-2 py-0.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300 transition-colors uppercase tracking-wider font-mono cursor-pointer";
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy: ', err);
        });
    });



    function escapeHTML(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
