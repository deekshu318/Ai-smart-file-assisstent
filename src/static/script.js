document.addEventListener('DOMContentLoaded', () => {
    console.log('SmartFile Script v2 Loaded');
    // --- UI Element References ---
    const authView = document.getElementById('auth-view');
    const authModal = document.getElementById('auth-modal');
    const loginCard = document.getElementById('login-card');
    const registerCard = document.getElementById('register-card');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const goToRegister = document.getElementById('go-to-register');
    const goToLogin = document.getElementById('go-to-login');
    const btnShowLogin = document.getElementById('btn-show-login');
    const btnShowRegister = document.getElementById('btn-show-register');
    const btnHeroGetStarted = document.getElementById('btn-hero-get-started');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnForgotPassword = document.getElementById('btn-forgot-password');

    const appMain = document.getElementById('app-container');
    const historyList = document.getElementById('history-list');
    const historySearchInput = document.getElementById('history-search-input');
    const newChatBtn = document.getElementById('new-chat-btn');
    const viewTitle = document.getElementById('view-title');
    const userInitialsHeader = document.getElementById('user-initials-header');
    const navTabs = document.querySelectorAll('.nav-tab');
    const queryCards = document.querySelectorAll('.query-card');
    const chatFileCount = document.getElementById('chat-file-count');
    const dashboardFileCounter = document.getElementById('file-counter-text');

    // Views
    const views = {
        dashboard: document.getElementById('dashboard-view'),
        chat: document.getElementById('chat-view'),
        profile: document.getElementById('profile-view'),
        settings: document.getElementById('settings-view'),
        upload: document.getElementById('upload-view'),
        library: document.getElementById('library-view'),
        assistants: document.getElementById('assistants-view')
    };



    // Chat Elements
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const fileInfoPill = document.getElementById('file-info-pill');
    const uploadBtnChat = document.getElementById('upload-btn-chat');

    // State
    let currentUser = JSON.parse(sessionStorage.getItem('currentUser')) || null;
    let currentConversationId = null;
    let currentDocumentId = null;
    let searchHistory = [];
    let libraryDocuments = [];
    let currentFilter = 'all';
    let currentHistoryFilter = 'all';

    const VIEW_TITLES = {
        dashboard: 'Dashboard',
        chat: 'Chat',
        profile: 'Profile',
        settings: 'Settings',
        library: 'Library',
        assistants: 'AI Assistants'
    };

    // --- Init ---
    initTheme();
    if (currentUser) {
        onLoginSuccess();
    }

    function initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        const themeToggle = document.getElementById('settings-theme-sync');
        
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
            if (themeToggle) themeToggle.checked = false;
        } else {
            document.documentElement.classList.remove('light-mode');
            if (themeToggle) themeToggle.checked = true;
        }
    }

    // --- Toggle Password Visibility ---
    function setupPasswordToggle(toggleId, inputId) {
        const toggleIcon = document.getElementById(toggleId);
        const passwordInput = document.getElementById(inputId);
        if (toggleIcon && passwordInput) {
            toggleIcon.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                if (type === 'password') {
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                } else {
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                }
            });
        }
    }
    setupPasswordToggle('toggle-login-password', 'password');
    setupPasswordToggle('toggle-reg-password', 'reg-password');

    // --- Auth Logic Helpers ---
    function showAuthMessage(msg, type = 'error', isRegister = false) {
        const id = isRegister ? 'register-status-message' : 'auth-status-message';
        const statusEl = document.getElementById(id);
        if (!statusEl) return;
        statusEl.textContent = msg;
        statusEl.className = `status-message ${type}`;
        statusEl.classList.remove('hidden');
    }

    // --- Landing Page Interactions ---
    const toggleAuthModal = (show = true, view = 'login') => {
        if (show) {
            authModal?.classList.remove('hidden');
            if (view === 'login') {
                loginCard?.classList.remove('hidden');
                registerCard?.classList.add('hidden');
            } else {
                loginCard?.classList.add('hidden');
                registerCard?.classList.remove('hidden');
            }
        } else {
            authModal?.classList.add('hidden');
        }
    };

    if (btnShowLogin) btnShowLogin.onclick = () => toggleAuthModal(true, 'login');
    if (btnShowRegister) btnShowRegister.onclick = () => toggleAuthModal(true, 'register');
    if (btnHeroGetStarted) btnHeroGetStarted.onclick = () => toggleAuthModal(true, 'register');
    if (btnCloseModal) btnCloseModal.onclick = () => toggleAuthModal(false);

    // Landing Features Smooth Scroll
    const btnSeeFeatures = document.getElementById('btn-see-features');
    const linkFeatures = document.getElementById('link-features');
    if (btnSeeFeatures) {
        btnSeeFeatures.onclick = (e) => {
            e.preventDefault();
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        };
    }
    if (linkFeatures) {
        linkFeatures.onclick = (e) => {
            e.preventDefault();
            document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
        };
    }

    if (btnForgotPassword) {
        btnForgotPassword.onclick = () => {
            showAuthMessage('A password reset link has been sent to your email (Demo).', 'success');
        };
    }

    // Close modal on overlay click
    if (authModal) {
        authModal.onclick = (e) => {
            if (e.target === authModal) toggleAuthModal(false);
        };
    }

    if (goToRegister) {
        goToRegister.onclick = (e) => {
            e.preventDefault();
            document.getElementById('auth-status-message')?.classList.add('hidden');
            document.getElementById('register-status-message')?.classList.add('hidden');
            loginCard?.classList.add('hidden');
            registerCard?.classList.remove('hidden');
        };
    }

    if (goToLogin) {
        goToLogin.onclick = (e) => {
            e.preventDefault();
            document.getElementById('auth-status-message')?.classList.add('hidden');
            document.getElementById('register-status-message')?.classList.add('hidden');
            registerCard?.classList.add('hidden');
            loginCard?.classList.remove('hidden');
        };
    }

    if (loginForm) {
        loginForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = loginForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Sign In';

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            if (!email || !password) {
                showAuthMessage('Please enter both email and password.');
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Signing in...';
                }
                showAuthMessage('Verifying credentials...', 'success');

                console.log('Attempting login for:', email);
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                if (res.ok) {
                    const data = await res.json();
                    currentUser = data.user;
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    console.log('Login successful');
                    onLoginSuccess();
                } else {
                    const err = await res.json();
                    console.error('Login failed:', err);
                    showAuthMessage(err.detail || 'Invalid email or password.');
                }
            } catch (err) {
                console.error('Connection error:', err);
                showAuthMessage('Could not connect to server. Please try again.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        };
    }

    if (registerForm) {
        registerForm.onsubmit = async (e) => {
            e.preventDefault();
            const submitBtn = registerForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.textContent : 'Create Account';

            const payload = {
                full_name: document.getElementById('reg-full-name').value,
                username: document.getElementById('reg-username').value,
                email: document.getElementById('reg-email').value,
                password: document.getElementById('reg-password').value
            };

            // Password strength validation
            if (payload.password.length < 8) {
                showAuthMessage('Password must be at least 8 characters long.', 'error', true);
                return;
            }
            if (!/[A-Z]/.test(payload.password)) {
                showAuthMessage('Password must contain at least one uppercase letter.', 'error', true);
                return;
            }
            if (!/[0-9]/.test(payload.password)) {
                showAuthMessage('Password must contain at least one number.', 'error', true);
                return;
            }
            if (!/[^a-zA-Z0-9\s]/.test(payload.password)) {
                showAuthMessage('Password must contain at least one special character.', 'error', true);
                return;
            }

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating account...';
                }
                showAuthMessage('Saving your account...', 'success', true);

                console.log('Attempting registration for:', payload.username);
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    showAuthMessage('Account created! You can now sign in.', 'success', true);
                    setTimeout(() => {
                        registerCard?.classList.add('hidden');
                        loginCard?.classList.remove('hidden');
                        registerForm.reset();
                    }, 1500);
                } else {
                    const err = await res.json();
                    console.error('Registration failed:', err);
                    showAuthMessage(err.detail || 'Registration failed. Try a different username/email.', 'error', true);
                }
            } catch (err) {
                console.error('Connection error:', err);
                showAuthMessage('Could not connect to server during registration.', 'error', true);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        };
    }

    function getInitials(name) {
        if (!name) return 'JD';
        const parts = name.trim().split(/\s+/);
        if (parts.length >= 2) {
            return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
        }
        return name.slice(0, 2).toUpperCase();
    }

    function updateElementAvatar(el, avatarValue, initialsText) {
        if (!el) return;
        if (avatarValue && avatarValue.length > 2) {
            el.style.setProperty('background', `url("${avatarValue}") no-repeat center/cover`, 'important');
            el.style.setProperty('color', 'transparent', 'important');
            el.textContent = '';
        } else {
            el.style.removeProperty('background');
            el.style.removeProperty('color');
            el.style.backgroundImage = 'none';
            el.style.color = '';
            el.textContent = initialsText;
        }
    }

    function refreshProfileUI() {
        if (!currentUser) return;
        const name = currentUser.full_name || currentUser.username || 'User';
        const initials = getInitials(name);
        const avatarVal = currentUser.avatar;

        if (userInitialsHeader) updateElementAvatar(userInitialsHeader, avatarVal, initials);

        const userDisp = document.getElementById('user-display-name');
        if (userDisp) userDisp.textContent = name;

        const userInitials = document.getElementById('user-initials');
        if (userInitials) updateElementAvatar(userInitials, avatarVal, initials);

        // Dynamic Dashboard greeting update
        const welcomeUsername = document.getElementById('welcome-username');
        if (welcomeUsername) welcomeUsername.textContent = name;

        // Dynamic welcome message in Chat view
        const chatMessages = document.getElementById('chat-messages');
        if (chatMessages) {
            const welcomeMsg = chatMessages.querySelector('.welcome-message');
            if (welcomeMsg) {
                welcomeMsg.className = 'chat-welcome-hero welcome-message';
                welcomeMsg.innerHTML = `
                    <h1>Welcome to <span class="gradient-text-premium">AI Smart File Assistant</span></h1>
                    <p style="margin: 0; line-height: 1.6; font-size: 1.05rem; opacity: 0.95;">Hello, <span class="user-highlight">${name}</span>! Your intelligent workspace is ready. Let's transform your files into instant answers.</p>
                `;
            }
        }

        // Populate Profile view
        const profileAvatar = document.getElementById('profile-avatar-large');
        if (profileAvatar) updateElementAvatar(profileAvatar, avatarVal, initials);

        const editProfileAvatar = document.getElementById('edit-profile-avatar-large');
        if (editProfileAvatar) updateElementAvatar(editProfileAvatar, avatarVal, initials);

        const fieldFullName = document.getElementById('field-full-name');
        if (fieldFullName) fieldFullName.textContent = currentUser.full_name || '—';

        const fieldUsername = document.getElementById('field-username');
        if (fieldUsername) fieldUsername.textContent = '@' + (currentUser.name || currentUser.username || '—');

        const fieldEmail = document.getElementById('field-email');
        if (fieldEmail) fieldEmail.textContent = currentUser.email || '—';

        // Refresh Plan UI in Settings
        const userPlan = currentUser.plan || 'Free';
        const tierDisplay = document.querySelector('#settings-view .tier-display');
        if (tierDisplay) {
            const badge = tierDisplay.querySelector('.tier-info span');
            const heading = tierDisplay.querySelector('.tier-info h3');
            const btn = tierDisplay.querySelector('.btn-premium');
            
            if (badge && heading && btn) {
                if (userPlan === 'Go') {
                    badge.textContent = 'Go Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = 'rgba(59, 130, 246, 0.15)'; // Blue/indigo accent
                    badge.style.color = '#3b82f6';
                    heading.textContent = 'Expanded Access';
                    btn.textContent = 'Manage Plan';
                } else if (userPlan === 'Plus') {
                    badge.textContent = 'Plus Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = 'rgba(99, 102, 241, 0.15)'; // Indigo/purple accent
                    badge.style.color = '#6366f1';
                    heading.textContent = 'Advanced Intelligence';
                    btn.textContent = 'Manage Plan';
                } else if (userPlan === 'Pro') {
                    badge.textContent = 'Pro Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = 'rgba(251, 191, 36, 0.15)'; // Gold/orange accent
                    badge.style.color = 'var(--amber)';
                    heading.textContent = 'Maximum Productivity';
                    btn.textContent = 'Manage Plan';
                } else if (userPlan === 'Business') {
                    badge.textContent = 'Business Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = 'rgba(168, 85, 247, 0.15)'; // Purple/violet accent
                    badge.style.color = '#a855f7';
                    heading.textContent = 'Enterprise Intelligence';
                    btn.textContent = 'Manage Plan';
                } else if (userPlan === 'Codex') {
                    badge.textContent = 'Codex Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = 'rgba(236, 72, 153, 0.15)'; // Pink/magenta accent
                    badge.style.color = '#ec4899';
                    heading.textContent = 'Developer Intelligence';
                    btn.textContent = 'Manage Plan';
                } else {
                    // Free Tier
                    badge.textContent = 'Free Tier';
                    badge.className = 'badge-pro';
                    badge.style.background = ''; // reset
                    badge.style.color = ''; // reset
                    heading.textContent = 'Standard Intelligence';
                    btn.textContent = 'Upgrade to Pro';
                }
            }
        }
    }

    // --- App Init After Login ---
    function onLoginSuccess() {
        authView?.classList.add('hidden');
        appMain?.classList.remove('hidden');

        refreshProfileUI();

        // Respect saved theme or default to light mode
        const savedTheme = localStorage.getItem('theme');
        if (!savedTheme) {
            document.documentElement.classList.add('light-mode');
            localStorage.setItem('theme', 'light');
        } else {
            initTheme();
        }

        switchView('chat');
        loadHistory();
        loadLibrary();
        updateFileCounters();
    }

    async function updateFileCounters() {
        try {
            const res = await fetch('/documents/count');
            if (res.ok) {
                const data = await res.json();
                const count = data.count;
                if (chatFileCount) chatFileCount.textContent = count;
                if (dashboardFileCounter) dashboardFileCounter.textContent = `${count} files in your library`;
                
                const dashboardFileStat = document.getElementById('dashboard-file-count-stat');
                if (dashboardFileStat) dashboardFileStat.textContent = `${count} ${count === 1 ? 'File' : 'Files'}`;
            }
        } catch (err) {
            console.error('Counter error', err);
        }
    }

    // --- Tab Switching ---
    navTabs.forEach(tab => {
        tab.onclick = () => {
            const viewId = tab.dataset.view;
            navTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            switchView(viewId);
        };
    });

    // --- Branding Logo Click -> Welcome Dashboard ---
    const brandLogoBtn = document.querySelector('.header-left');
    if (brandLogoBtn) {
        brandLogoBtn.style.cursor = 'pointer';
        brandLogoBtn.onclick = () => {
            switchView('chat');
        };
    }

    // --- Onboarding Step Cards Click Navigation ---
    const stepPink = document.querySelector('.step-card.highlight-pink');
    const stepTeal = document.querySelector('.step-card.highlight-teal');
    const stepPurple = document.querySelector('.step-card.highlight-purple');
    if (stepPink) {
        stepPink.onclick = () => switchView('upload');
    }
    if (stepTeal) {
        stepTeal.onclick = () => switchView('library');
    }
    if (stepPurple) {
        stepPurple.onclick = () => switchView('chat');
    }

    // --- Suggested Queries ---
    queryCards.forEach(card => {
        card.onclick = () => {
            const query = card.dataset.query;
            switchView('chat');
            if (chatInput) {
                chatInput.value = query;
                sendMessage();
            }
        };
    });

    // --- View Switching ---
    function switchView(viewId) {
        const uniqueElements = new Set(Object.values(views).filter(el => el !== null));
        const targetElement = views[viewId];
        
        uniqueElements.forEach(el => {
            if (el === targetElement) {
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        });
        
        if (viewTitle) viewTitle.textContent = VIEW_TITLES[viewId] || 'Dashboard';

        // Synchronize header nav-pill active tab state
        if (navTabs) {
            navTabs.forEach(tab => {
                const targetViewId = (viewId === 'dashboard') ? 'chat' : viewId;
                if (tab.dataset.view === targetViewId) {
                    tab.classList.add('active');
                } else {
                    tab.classList.remove('active');
                }
            });
        }

        if (viewId === 'library') {
            loadLibrary();
        }
    }

    // --- Library Management Section ---
    const libraryGrid = document.getElementById('library-grid');
    const libraryEmptyState = document.getElementById('library-empty-state');
    const libSearchInput = document.getElementById('lib-search-input');
    const libClearSearch = document.getElementById('lib-clear-search');
    const filterTabs = document.querySelectorAll('.lib-filter-tabs .filter-tab');
    
    // Stats elements
    const statTotalCount = document.getElementById('stat-total-count');
    const statDocCount = document.getElementById('stat-doc-count');
    const statYtCount = document.getElementById('stat-yt-count');
    const statWebCount = document.getElementById('stat-web-count');

    // Modal elements
    const libPreviewModal = document.getElementById('lib-preview-modal');
    const libClosePreviewModal = document.getElementById('lib-close-preview-modal');
    const previewModalTitle = document.getElementById('preview-modal-title');
    const previewModalTypeBadge = document.getElementById('preview-modal-type-badge');
    const previewChunksContainer = document.getElementById('preview-chunks-container');
    const previewChunksVal = document.getElementById('preview-chunks-val');
    const previewDateVal = document.getElementById('preview-date-val');
    const previewModalChatBtn = document.getElementById('preview-modal-chat-btn');
    const previewModalCloseBtn = document.getElementById('preview-modal-close-btn');
    let previewingDocId = null;

    async function loadLibrary() {
        if (libraryGrid) {
            libraryGrid.innerHTML = `
                <div class="library-loading-container">
                    <i class="fas fa-circle-notch fa-spin fa-3x"></i>
                    <p>Loading library assets...</p>
                </div>
            `;
        }
        if (libraryEmptyState) libraryEmptyState.classList.add('hidden');

        try {
            const res = await fetch('/documents');
            if (res.ok) {
                libraryDocuments = await res.json();
                if (libraryGrid) renderLibrary();
                updateLibraryStats();
                renderHistory(); // Re-render history now that document categories are loaded
            } else {
                if (libraryGrid) libraryGrid.innerHTML = '<div class="library-error-msg"><i class="fas fa-exclamation-triangle"></i> Failed to fetch library documents.</div>';
            }
        } catch (err) {
            console.error('Error fetching library:', err);
            if (libraryGrid) libraryGrid.innerHTML = '<div class="library-error-msg"><i class="fas fa-exclamation-triangle"></i> Connection error. Please try again.</div>';
        }
    }

    function updateLibraryStats() {
        if (!libraryDocuments) return;
        
        const total = libraryDocuments.length;
        const docs = libraryDocuments.filter(d => d.type === 'document').length;
        const yt = libraryDocuments.filter(d => d.type === 'youtube').length;
        const web = libraryDocuments.filter(d => d.type === 'website').length;

        if (statTotalCount) statTotalCount.textContent = total;
        if (statDocCount) statDocCount.textContent = docs;
        if (statYtCount) statYtCount.textContent = yt;
        if (statWebCount) statWebCount.textContent = web;
    }

    function renderLibrary() {
        if (!libraryGrid) return;
        
        let filtered = libraryDocuments;

        // Apply Tab Filter
        if (currentFilter !== 'all') {
            filtered = libraryDocuments.filter(doc => doc.type === currentFilter);
        }

        // Apply Search Input
        const searchTerm = libSearchInput ? libSearchInput.value.trim().toLowerCase() : '';
        if (searchTerm) {
            filtered = filtered.filter(doc => 
                doc.name.toLowerCase().includes(searchTerm) || 
                doc.type.toLowerCase().includes(searchTerm) ||
                doc.id.toLowerCase().includes(searchTerm)
            );
            if (libClearSearch) libClearSearch.classList.remove('hidden');
        } else {
            if (libClearSearch) libClearSearch.classList.add('hidden');
        }

        if (filtered.length === 0) {
            libraryGrid.innerHTML = '';
            if (libraryEmptyState) libraryEmptyState.classList.remove('hidden');
            return;
        }

        if (libraryEmptyState) libraryEmptyState.classList.add('hidden');

        // Render cards
        libraryGrid.innerHTML = filtered.map(doc => {
            let iconClass = 'fas fa-file-alt';
            let typeLabel = 'Document';
            let cardTypeClass = 'type-document';

            if (doc.type === 'youtube') {
                iconClass = 'fab fa-youtube';
                typeLabel = 'YouTube Transcript';
                cardTypeClass = 'type-youtube';
            } else if (doc.type === 'website') {
                iconClass = 'fas fa-globe';
                typeLabel = 'Scraped Webpage';
                cardTypeClass = 'type-website';
            }

            return `
                <div class="library-card ${cardTypeClass} animate-in" data-id="${doc.id}">
                    <div class="card-header">
                        <span class="type-badge"><i class="${iconClass}"></i> ${typeLabel}</span>
                        <button class="card-delete-btn" data-id="${doc.id}" title="Delete Resource"><i class="fas fa-trash-alt"></i></button>
                    </div>
                    <h3 class="card-title">${escapeHTML(doc.name)}</h3>
                    <div class="card-meta">
                        <span class="meta-item"><i class="fas fa-database"></i> <strong>${doc.chunks_count}</strong> Chunks</span>
                        <span class="meta-item"><i class="fas fa-calendar-alt"></i> ${doc.created_at}</span>
                    </div>
                    <div class="card-actions">
                        <button class="card-action-btn query-btn" data-id="${doc.id}" data-name="${escapeHTML(doc.name)}"><i class="fas fa-comment-alt"></i> Query</button>
                        <button class="card-action-btn preview-btn" data-id="${doc.id}"><i class="fas fa-eye"></i> Preview</button>
                    </div>
                </div>
            `;
        }).join('');

        // Attach listeners
        libraryGrid.querySelectorAll('.query-btn').forEach(btn => {
            btn.onclick = () => queryResource(btn.dataset.id, btn.dataset.name);
        });

        libraryGrid.querySelectorAll('.preview-btn').forEach(btn => {
            btn.onclick = () => openPreviewModal(btn.dataset.id);
        });

        libraryGrid.querySelectorAll('.card-delete-btn').forEach(btn => {
            btn.onclick = () => deleteResource(btn.dataset.id);
        });
    }

    function escapeHTML(str) {
        if (!str) return '';
        return str.replace(/[&<>'"]/g, 
            tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
        );
    }

    function startNewThreadForResource(id, name) {
        currentDocumentId = id;
        currentConversationId = null;
        chatMessages.innerHTML = '';
        addMessage(`**New Conversation started for ${escapeHTML(name)}!**\n\nWhat would you like to know about this resource in this new thread?`, 'ai', 'welcome-message');
        
        if (fileInfoPill) {
            fileInfoPill.innerHTML = `
                <div class="chat-header-pills">
                    <span class="file-name-span"><i class="fas fa-file-alt"></i> ${escapeHTML(name)}</span>
                    <button class="chat-new-thread-btn" id="new-thread-pill-btn"><i class="fas fa-plus"></i> New Chat</button>
                </div>
            `;
            const newThreadBtn = document.getElementById('new-thread-pill-btn');
            if (newThreadBtn) {
                newThreadBtn.onclick = (e) => {
                    e.stopPropagation();
                    startNewThreadForResource(id, name);
                };
            }
        }
    }

    function queryResource(id, name, isNewUpload = false) {
        currentDocumentId = id;
        
        // Search conversation history for any thread matching this specific document ID
        const existingConv = searchHistory.find(item => item.document_id === id);
        
        if (fileInfoPill) {
            fileInfoPill.innerHTML = `
                <div class="chat-header-pills">
                    <span class="file-name-span"><i class="fas fa-file-alt"></i> ${escapeHTML(name)}</span>
                    <button class="chat-new-thread-btn" id="new-thread-pill-btn"><i class="fas fa-plus"></i> New Chat</button>
                </div>
            `;
            fileInfoPill.classList.remove('hidden');
            
            const newThreadBtn = document.getElementById('new-thread-pill-btn');
            if (newThreadBtn) {
                newThreadBtn.onclick = (e) => {
                    e.stopPropagation();
                    startNewThreadForResource(id, name);
                };
            }
        }

        // Switch active state of nav tab in HTML
        navTabs.forEach(t => {
            if (t.dataset.view === 'chat') t.classList.add('active');
            else t.classList.remove('active');
        });

        switchView('chat');

        if (existingConv) {
            // Load and restore this conversation!
            loadConversation(existingConv.id);
        } else {
            // Start a fresh conversation context
            currentConversationId = null;
            chatMessages.innerHTML = '';
            
            const uName = currentUser ? (currentUser.full_name || currentUser.username || 'User') : 'User';
            chatMessages.innerHTML = `
                <div class="chat-welcome-hero welcome-message">
                    <h1>Welcome to <span class="gradient-text-premium">AI Smart File Assistant</span></h1>
                    <p style="margin: 0; line-height: 1.6; font-size: 1.05rem; opacity: 0.95;">Hello, <span class="user-highlight">${uName}</span>! Your intelligent workspace is ready. Let's transform your files into instant answers.</p>
                </div>
            `;
            
            if (isNewUpload) {
                addMessage(`**Resource successfully loaded!**\n\nI have finished processing **${name}**. What would you like to know about it?`, 'ai');
            } else {
                addMessage(`**Document context active!**\n\nI have loaded **${name}** into my workspace context. Ask me anything about this resource!`, 'ai');
            }
        }
    }

    async function openPreviewModal(id) {
        previewingDocId = id;
        const doc = libraryDocuments.find(d => d.id === id);
        if (!doc) return;

        if (previewModalTitle) previewModalTitle.textContent = doc.name;
        if (previewChunksVal) previewChunksVal.textContent = doc.chunks_count;
        if (previewDateVal) previewDateVal.textContent = doc.created_at;
        
        let typeLabel = 'PDF / DOC';
        let badgeClass = 'pdf';
        if (doc.type === 'youtube') {
            typeLabel = 'YOUTUBE';
            badgeClass = 'yt';
        } else if (doc.type === 'website') {
            typeLabel = 'WEBSITE';
            badgeClass = 'web';
        }
        
        if (previewModalTypeBadge) {
            previewModalTypeBadge.textContent = typeLabel;
            previewModalTypeBadge.className = `modal-badge ${badgeClass}`;
        }

        if (libPreviewModal) libPreviewModal.classList.remove('hidden');
        if (previewChunksContainer) {
            previewChunksContainer.innerHTML = `
                <div class="preview-loading">
                    <i class="fas fa-circle-notch fa-spin fa-2x"></i>
                    <p style="margin-top:10px">Fetching document chunks...</p>
                </div>
            `;
        }

        try {
            const res = await fetch(`/documents/${id}/preview`);
            if (res.ok) {
                const chunks = await res.json();
                renderPreviewChunks(chunks, doc.type);
            } else {
                if (previewChunksContainer) previewChunksContainer.innerHTML = '<div class="preview-error">Failed to fetch content.</div>';
            }
        } catch (err) {
            console.error('Error fetching preview:', err);
            if (previewChunksContainer) previewChunksContainer.innerHTML = '<div class="preview-error">Connection error.</div>';
        }
    }

    function renderPreviewChunks(chunks, type) {
        if (!previewChunksContainer) return;
        if (!chunks || chunks.length === 0) {
            previewChunksContainer.innerHTML = '<div class="preview-empty">No content chunks available.</div>';
            return;
        }

        previewChunksContainer.innerHTML = chunks.map((chunk, idx) => {
            let label = `Chunk ${idx + 1}`;
            if (type === 'document') {
                label = `Page ${chunk.page} (Chunk ${chunk.chunk_id})`;
            } else if (type === 'youtube') {
                const seconds = chunk.page;
                const m = Math.floor(seconds / 60);
                const s = Math.floor(seconds % 60).toString().padStart(2, '0');
                label = `Timestamp ${m}:${s}`;
            }
            return `
                <div class="preview-chunk-card">
                    <div class="chunk-card-header">${label}</div>
                    <div class="chunk-card-body">${escapeHTML(chunk.text)}</div>
                </div>
            `;
        }).join('');
    }

    async function deleteResource(id) {
        const doc = libraryDocuments.find(d => d.id === id);
        if (!doc) return;

        if (!confirm(`Are you absolutely sure you want to permanently delete "${doc.name}"? This will erase all its semantic chunks from the vector database.`)) {
            return;
        }

        try {
            const res = await fetch(`/documents/${id}`, { method: 'DELETE' });
            if (res.ok) {
                if (currentDocumentId === id) {
                    currentDocumentId = null;
                    if (fileInfoPill) fileInfoPill.classList.add('hidden');
                }
                
                await loadLibrary();
                updateFileCounters();
            } else {
                alert('Failed to delete document.');
            }
        } catch (err) {
            console.error('Error deleting document:', err);
            alert('Could not connect to server to delete the resource.');
        }
    }

    // --- Search & Filters Event Listeners ---
    if (libSearchInput) {
        libSearchInput.addEventListener('input', () => {
            renderLibrary();
        });
    }

    if (libClearSearch) {
        libClearSearch.onclick = () => {
            libSearchInput.value = '';
            renderLibrary();
        };
    }

    filterTabs.forEach(tab => {
        tab.onclick = () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.filter;
            renderLibrary();
        };
    });

    const closePreview = () => {
        if (libPreviewModal) libPreviewModal.classList.add('hidden');
        previewingDocId = null;
    };

    if (libClosePreviewModal) libClosePreviewModal.onclick = closePreview;
    if (previewModalCloseBtn) previewModalCloseBtn.onclick = closePreview;
    if (libPreviewModal) {
        libPreviewModal.onclick = (e) => {
            if (e.target === libPreviewModal) closePreview();
        };
    }

    if (previewModalChatBtn) {
        previewModalChatBtn.onclick = () => {
            if (previewingDocId) {
                const doc = libraryDocuments.find(d => d.id === previewingDocId);
                if (doc) {
                    closePreview();
                    queryResource(doc.id, doc.name);
                }
            }
        };
    }

    const libEmptyCta = document.getElementById('library-empty-cta');
    if (libEmptyCta) {
        libEmptyCta.onclick = () => {
            navTabs.forEach(t => {
                if (t.dataset.view === 'upload') t.classList.add('active');
                else t.classList.remove('active');
            });
            switchView('upload');
        };
    }

    // --- Conversation History ---
    async function loadHistory() {
        if (!currentUser) return;
        try {
            const res = await fetch(`/conversations?user_id=${currentUser.id}`);
            if (res.ok) {
                searchHistory = await res.json();
                renderHistory();
            }
        } catch (err) { console.error('History error', err); }
    }

    function renderHistory() {
        const hList = document.getElementById('history-list');
        const searchInput = document.getElementById('history-search-input');
        if (!hList) return;
        
        let filteredHistory = searchHistory;
        
        // Search term filter
        if (searchInput && searchInput.value.trim() !== '') {
            const term = searchInput.value.trim().toLowerCase();
            filteredHistory = filteredHistory.filter(item => 
                (item.title || 'Untitled').toLowerCase().includes(term)
            );
        }

        // Resource type segmented filter
        if (currentHistoryFilter !== 'all') {
            filteredHistory = filteredHistory.filter(item => {
                if (!item.document_id) return false;
                const doc = libraryDocuments.find(d => d.id === item.document_id);
                if (doc) {
                    return doc.type === currentHistoryFilter;
                }
                
                // Fallback filtering if the document is not currently in the library list
                const docId = item.document_id;
                if (currentHistoryFilter === 'document') {
                    return docId.startsWith('doc_') || docId === 'default_doc';
                } else if (currentHistoryFilter === 'youtube') {
                    return docId.startsWith('yt_');
                } else if (currentHistoryFilter === 'website') {
                    return docId.startsWith('web_');
                }
                return false;
            });
        }

        if (!filteredHistory || filteredHistory.length === 0) {
            hList.innerHTML = '<div class="history-empty"><i class="fas fa-clock"></i><p>No conversations found</p></div>';
            return;
        }

        hList.innerHTML = filteredHistory.map(item => {
            let docName = '';
            let docType = 'general';
            let iconClass = 'fas fa-message';
            
            if (item.document_id) {
                const doc = libraryDocuments.find(d => d.id === item.document_id);
                if (doc) {
                    docName = doc.name || doc.filename || doc.title || 'Attached Resource';
                    docType = doc.type || 'document';
                    if (docType === 'document') iconClass = 'fas fa-file-alt';
                    else if (docType === 'youtube') iconClass = 'fab fa-youtube';
                    else if (docType === 'website') iconClass = 'fas fa-globe';
                } else {
                    // Fallback: Infer type and name from the document_id string format
                    const docId = item.document_id;
                    if (docId.startsWith('doc_') || docId === 'default_doc') {
                        docType = 'document';
                        iconClass = 'fas fa-file-alt';
                    } else if (docId.startsWith('yt_')) {
                        docType = 'youtube';
                        iconClass = 'fab fa-youtube';
                    } else if (docId.startsWith('web_')) {
                        docType = 'website';
                        iconClass = 'fas fa-globe';
                    }
                    
                    if (docId === 'default_doc') {
                        docName = 'Indian Stock Market.pdf';
                    } else {
                        const parts = docId.split('_');
                        if (parts.length >= 3) {
                            docName = parts.slice(2).join(' ');
                        } else {
                            docName = docId;
                        }
                    }
                }
            }

            const badgeText = docType === 'general' ? 'General' : docType === 'document' ? 'File' : docType === 'youtube' ? 'Video' : 'Website';
            const badgeClass = `history-doc-badge type-${docType}`;
            
            return `
                <div class="history-item ${currentConversationId === item.id ? 'active' : ''}" data-id="${item.id}">
                    <div class="history-item-header">
                        <i class="${iconClass}"></i>
                        <span>${escapeHTML(item.title || 'Untitled')}</span>
                    </div>
                    <span class="${badgeClass}">${badgeText}${docName ? ': ' + escapeHTML(docName) : ''}</span>
                </div>
            `;
        }).join('');

        hList.querySelectorAll('.history-item').forEach(item => {
            item.onclick = () => loadConversation(item.dataset.id);
        });
    }

    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'history-search-input') {
            renderHistory();
        }
    });

    // Segmented sidebar filters event delegation
    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.history-filter-btn');
        if (btn) {
            document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentHistoryFilter = btn.dataset.type || 'all';
            renderHistory();
        }
    });

    async function loadConversation(id) {
        currentConversationId = id;
        renderHistory();
        switchView('chat');
        chatMessages.innerHTML = `
            <div class="message ai animate-in welcome-message">
                <div class="msg-bubble" style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-circle-notch fa-spin" style="color: var(--accent);"></i>
                    <span>Loading conversation...</span>
                </div>
            </div>
        `;
        
        // Restore document context from history metadata
        const convMeta = searchHistory.find(c => c.id === id);
        const convDocId = convMeta?.document_id || null;
        currentDocumentId = convDocId;

        if (convDocId) {
            const doc = libraryDocuments.find(d => d.id === convDocId);
            if (doc) {
                const name = doc.name || doc.filename || doc.title || 'Attached Resource';
                if (fileInfoPill) {
                    fileInfoPill.innerHTML = `
                        <div class="chat-header-pills">
                            <span class="file-name-span"><i class="fas fa-file-alt"></i> ${escapeHTML(name)}</span>
                            <button class="chat-new-thread-btn" id="new-thread-pill-btn"><i class="fas fa-plus"></i> New Chat</button>
                        </div>
                    `;
                    fileInfoPill.classList.remove('hidden');
                    
                    const newThreadBtn = document.getElementById('new-thread-pill-btn');
                    if (newThreadBtn) {
                        newThreadBtn.onclick = (e) => {
                            e.stopPropagation();
                            startNewThreadForResource(convDocId, name);
                        };
                    }
                }
            } else {
                if (fileInfoPill) fileInfoPill.classList.add('hidden');
            }
        } else {
            if (fileInfoPill) fileInfoPill.classList.add('hidden');
        }

        try {
            const res = await fetch(`/conversations/${id}/messages`);
            const messages = await res.json();
            chatMessages.innerHTML = '';
            if (messages.length === 0) {
                addMessage('No messages in this conversation yet.', 'ai');
            } else {
                messages.forEach(msg => addMessage(msg.content, msg.role));
            }
        } catch (err) {
            chatMessages.innerHTML = '';
            addMessage('Error loading conversation.', 'ai');
        }
    }

    function addMessage(text, role, customClass = '') {
        const msg = document.createElement('div');
        let classes = `message ${role === 'user' ? 'user' : 'ai'} animate-in`;
        if (customClass) {
            classes += ` ${customClass}`;
        }
        msg.className = classes;
        // 'ai' is used when displaying live responses; 'assistant' is what comes from the DB.
        // Both should be Markdown-rendered, so we check role !== 'user'.
        const content = role !== 'user' && typeof marked !== 'undefined'
            ? marked.parse(text)
            : text;
        msg.innerHTML = `<div class="msg-bubble">${content}</div>`;
        chatMessages.appendChild(msg);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // --- Chat Send ---
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';
        chatInput.style.height = 'auto';
        addMessage(text, 'user');
        switchView('chat');

        // Typing indicator with animated dots
        const typingEl = document.createElement('div');
        typingEl.className = 'message ai animate-in';
        typingEl.id = 'typing-indicator';
        typingEl.innerHTML = '<div class="msg-bubble"><div class="typing-dots"><span></span><span></span><span></span></div></div>';
        chatMessages.appendChild(typingEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: text,
                    conversation_id: currentConversationId,
                    user_id: currentUser?.id,
                    document_id: currentDocumentId
                })
            });
            const data = await res.json();

            // Remove typing indicator
            document.getElementById('typing-indicator')?.remove();

            if (data.conversation_id && !currentConversationId) {
                currentConversationId = data.conversation_id;
                loadHistory();
            }
            addMessage(data.answer || data.detail || 'No response.', 'ai');
        } catch (err) {
            document.getElementById('typing-indicator')?.remove();
            addMessage('Sorry, I encountered an error. Please try again.', 'ai');
        }
    }

    if (sendBtn) {
        sendBtn.onclick = sendMessage;
    }

    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Auto-grow textarea
        chatInput.addEventListener('input', () => {
            chatInput.style.height = 'auto';
            chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        });

        // --- Voice Dictation (Speech to Text) ---
        const voiceBtn = document.querySelector('.voice-btn');
        let recognition = null;
        let isListening = false;

        if (voiceBtn) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (SpeechRecognition) {
                recognition = new SpeechRecognition();
                recognition.continuous = false;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onstart = () => {
                    isListening = true;
                    voiceBtn.classList.add('recording');
                    const micIcon = voiceBtn.querySelector('i');
                    if (micIcon) {
                        micIcon.className = 'fas fa-microphone-slash';
                    }
                    chatInput.placeholder = "Listening...";
                };

                recognition.onresult = (event) => {
                    const transcript = event.results[0][0].transcript;
                    if (transcript) {
                        if (chatInput.value) {
                            chatInput.value += ' ' + transcript;
                        } else {
                            chatInput.value = transcript;
                        }
                        // Trigger input event to adjust textarea height
                        chatInput.dispatchEvent(new Event('input'));
                    }
                };

                recognition.onerror = (event) => {
                    console.error("Speech recognition error:", event.error);
                    if (event.error === 'not-allowed') {
                        alert("Microphone permission denied. Please allow microphone access in your browser settings.");
                    }
                };

                recognition.onend = () => {
                    isListening = false;
                    voiceBtn.classList.remove('recording');
                    const micIcon = voiceBtn.querySelector('i');
                    if (micIcon) {
                        micIcon.className = 'fas fa-microphone';
                    }
                    const activeAssistant = document.querySelector('.assistant-card.active');
                    if (activeAssistant) {
                        const name = activeAssistant.querySelector('.assistant-name')?.textContent || 'AI';
                        chatInput.placeholder = `Ask ${name} about your files...`;
                    } else {
                        chatInput.placeholder = "Ask about your files...";
                    }
                };

                voiceBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (isListening) {
                        recognition.stop();
                    } else {
                        try {
                            recognition.start();
                        } catch (err) {
                            console.error("Failed to start speech recognition:", err);
                        }
                    }
                });
            } else {
                voiceBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    alert("Speech recognition is not supported in this browser. Please use a modern browser like Google Chrome or Microsoft Edge.");
                });
            }
        }
    }

    const resetSession = () => {
        currentConversationId = null;
        currentDocumentId = null;
        const name = currentUser ? (currentUser.full_name || currentUser.username || 'User') : 'User';
        if (fileInfoPill) fileInfoPill.classList.add('hidden');
        if (chatMessages) chatMessages.innerHTML = `
            <div class="chat-welcome-hero welcome-message">
                <h1>Welcome to <span class="gradient-text-premium">AI Smart File Assistant</span></h1>
                <p style="margin: 0; line-height: 1.6; font-size: 1.05rem; opacity: 0.95;">Hello, <span class="user-highlight">${name}</span>! Your intelligent workspace is ready. Let's transform your files into instant answers.</p>
            </div>
        `;
        switchView('chat');
        renderHistory();
    };

    if (newChatBtn) {
        newChatBtn.onclick = resetSession;
    }
    // --- Profile Dropdown ---
    const profileToggle = document.getElementById('user-profile-toggle');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileToggle && profileDropdown) {
        profileToggle.onclick = (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('hidden');
        };
        document.addEventListener('click', () => profileDropdown.classList.add('hidden'));
    }

    // Dropdown menu items
    const menuProfile = document.getElementById('menu-profile');
    const menuSettings = document.getElementById('menu-settings');

    if (menuSettings) {
        menuSettings.onclick = () => {
            switchView('settings');
            profileDropdown?.classList.add('hidden');
        };
    }

    // --- Edit Profile Modal Wiring ---
    const editProfileModal = document.getElementById('edit-profile-modal');
    const closeProfileModal = document.getElementById('close-profile-modal');
    const cancelProfileBtn = document.getElementById('edit-profile-cancel');
    const saveProfileBtn = document.getElementById('edit-profile-save');
    const editDisplayNameInput = document.getElementById('edit-profile-display-name');
    const editUsernameInput = document.getElementById('edit-profile-username');
    const profileModalStatus = document.getElementById('profile-modal-status');
    let pendingAvatarBase64 = null;

    function openEditProfileModal() {
        if (!currentUser) return;
        
        pendingAvatarBase64 = null;
        
        // Reset status message
        if (profileModalStatus) {
            profileModalStatus.textContent = '';
            profileModalStatus.className = 'status-message hidden';
        }
        
        // Populate current inputs
        if (editDisplayNameInput) editDisplayNameInput.value = currentUser.full_name || '';
        if (editUsernameInput) editUsernameInput.value = currentUser.username || currentUser.name || '';
        
        // Set preview to active profile picture
        const editProfileAvatar = document.getElementById('edit-profile-avatar-large');
        if (editProfileAvatar) {
            const name = currentUser.full_name || currentUser.username || 'User';
            const initials = getInitials(name);
            updateElementAvatar(editProfileAvatar, currentUser.avatar, initials);
        }
        
        // Open modal
        editProfileModal?.classList.remove('hidden');
    }

    function closeEditProfileModal() {
        editProfileModal?.classList.add('hidden');
        document.getElementById('avatar-options-menu')?.classList.add('hidden');
        pendingAvatarBase64 = null;
    }

    if (closeProfileModal) closeProfileModal.onclick = closeEditProfileModal;
    if (cancelProfileBtn) cancelProfileBtn.onclick = closeEditProfileModal;

    if (editProfileModal) {
        editProfileModal.onclick = (e) => {
            if (e.target === editProfileModal) closeEditProfileModal();
        };
    }

    if (menuProfile) {
        menuProfile.onclick = () => {
            openEditProfileModal();
            profileDropdown?.classList.add('hidden');
        };
    }

    const headerAccountTrigger = document.getElementById('header-account-trigger');
    if (headerAccountTrigger) {
        headerAccountTrigger.onclick = () => {
            openEditProfileModal();
        };
    }

    // Toggle dropdown options menu
    const avatarUploadTrigger = document.getElementById('edit-avatar-upload-trigger');
    const avatarOptionsMenu = document.getElementById('avatar-options-menu');

    if (avatarUploadTrigger && avatarOptionsMenu) {
        avatarUploadTrigger.onclick = (e) => {
            e.stopPropagation();
            avatarOptionsMenu.classList.toggle('hidden');
        };
        document.addEventListener('click', () => {
            avatarOptionsMenu.classList.add('hidden');
        });
    }

    // Select from Device integration
    const btnSelectDevice = document.getElementById('btn-select-device');
    const editAvatarFileInput = document.getElementById('edit-avatar-file-input');

    if (btnSelectDevice && editAvatarFileInput) {
        btnSelectDevice.onclick = (e) => {
            e.stopPropagation();
            avatarOptionsMenu?.classList.add('hidden');
            editAvatarFileInput.click();
        };

        editAvatarFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    pendingAvatarBase64 = event.target.result;
                    const editProfileAvatar = document.getElementById('edit-profile-avatar-large');
                    if (editProfileAvatar) {
                        const name = editDisplayNameInput.value.trim() || currentUser.full_name || 'User';
                        const initials = getInitials(name);
                        updateElementAvatar(editProfileAvatar, pendingAvatarBase64, initials);
                    }
                };
                reader.readAsDataURL(file);
            }
            editAvatarFileInput.value = '';
        };
    }

    // Take Picture WebRTC integration
    const btnTakePicture = document.getElementById('btn-take-picture');
    const cameraModalOverlay = document.getElementById('camera-modal-overlay');
    const btnCameraClose = document.getElementById('btn-camera-close');
    const btnCameraCapture = document.getElementById('btn-camera-capture');
    const cameraVideo = document.getElementById('camera-video');
    let cameraStream = null;

    if (btnTakePicture && cameraModalOverlay && cameraVideo) {
        btnTakePicture.onclick = async (e) => {
            e.stopPropagation();
            avatarOptionsMenu?.classList.add('hidden');
            cameraModalOverlay.classList.remove('hidden');

            try {
                cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 320, height: 320, facingMode: "user" },
                    audio: false
                });
                cameraVideo.srcObject = cameraStream;
                cameraVideo.play();
            } catch (err) {
                console.error("Camera access error:", err);
                if (profileModalStatus) {
                    profileModalStatus.textContent = 'Could not access the camera. Make sure permissions are granted.';
                    profileModalStatus.className = 'status-message error';
                    profileModalStatus.classList.remove('hidden');
                }
                cameraModalOverlay.classList.add('hidden');
            }
        };

        const stopCamera = () => {
            if (cameraStream) {
                cameraStream.getTracks().forEach(track => track.stop());
                cameraStream = null;
            }
            cameraVideo.srcObject = null;
            cameraModalOverlay.classList.add('hidden');
        };

        if (btnCameraClose) {
            btnCameraClose.onclick = (e) => {
                e.stopPropagation();
                stopCamera();
            };
        }

        cameraModalOverlay.onclick = (e) => {
            if (e.target === cameraModalOverlay) {
                stopCamera();
            }
        };

        if (btnCameraCapture) {
            btnCameraCapture.onclick = (e) => {
                e.stopPropagation();
                if (!cameraVideo.videoWidth) return;

                const size = Math.min(cameraVideo.videoWidth, cameraVideo.videoHeight);
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');

                // Mirror for a natural preview orientation
                ctx.translate(size, 0);
                ctx.scale(-1, 1);

                // Crop square from the center of the video feed
                const sx = (cameraVideo.videoWidth - size) / 2;
                const sy = (cameraVideo.videoHeight - size) / 2;

                ctx.drawImage(cameraVideo, sx, sy, size, size, 0, 0, size, size);

                const base64 = canvas.toDataURL('image/jpeg', 0.85);
                pendingAvatarBase64 = base64;

                const editProfileAvatar = document.getElementById('edit-profile-avatar-large');
                if (editProfileAvatar) {
                    const name = editDisplayNameInput.value.trim() || currentUser.full_name || 'User';
                    const initials = getInitials(name);
                    updateElementAvatar(editProfileAvatar, pendingAvatarBase64, initials);
                }

                stopCamera();
            };
        }
    }

    if (saveProfileBtn) {
        saveProfileBtn.onclick = async () => {
            const fullName = editDisplayNameInput.value.trim();
            const username = editUsernameInput.value.trim();

            if (!fullName || !username) {
                if (profileModalStatus) {
                    profileModalStatus.textContent = 'Both Display Name and Username are required.';
                    profileModalStatus.className = 'status-message error';
                    profileModalStatus.classList.remove('hidden');
                }
                return;
            }

            const originalBtnText = saveProfileBtn.textContent;
            try {
                saveProfileBtn.disabled = true;
                saveProfileBtn.textContent = 'Saving...';
                
                if (profileModalStatus) {
                    profileModalStatus.className = 'status-message hidden';
                }

                const res = await fetch('/profile/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: currentUser.id,
                        full_name: fullName,
                        username: username,
                        avatar: pendingAvatarBase64 !== null ? pendingAvatarBase64 : currentUser.avatar
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    
                    // Update current user in memory and storage
                    currentUser.full_name = data.user.full_name;
                    currentUser.username = data.user.name;
                    currentUser.name = data.user.name;
                    currentUser.avatar = data.user.avatar;
                    
                    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                    
                    // Synchronize UI
                    refreshProfileUI();
                    
                    if (profileModalStatus) {
                        profileModalStatus.textContent = 'Profile updated successfully!';
                        profileModalStatus.className = 'status-message success';
                        profileModalStatus.classList.remove('hidden');
                    }
                    
                    setTimeout(() => {
                        closeEditProfileModal();
                    }, 1000);
                } else {
                    const err = await res.json();
                    if (profileModalStatus) {
                        profileModalStatus.textContent = err.detail || 'Failed to update profile.';
                        profileModalStatus.className = 'status-message error';
                        profileModalStatus.classList.remove('hidden');
                    }
                }
            } catch (err) {
                console.error('Profile update error:', err);
                if (profileModalStatus) {
                    profileModalStatus.textContent = 'Connection error. Please try again.';
                    profileModalStatus.className = 'status-message error';
                    profileModalStatus.classList.remove('hidden');
                }
            } finally {
                saveProfileBtn.disabled = false;
                saveProfileBtn.textContent = originalBtnText;
            }
        };
    }

    // --- Logout ---
    const logoutBtn = document.getElementById('menu-logout');
    if (logoutBtn) {
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            sessionStorage.removeItem('currentUser');
            window.location.href = '/';
        };
    }

    // --- Settings: Dark Mode Toggle ---
    const themeToggle = document.getElementById('settings-theme-sync');
    if (themeToggle) {
        // Initial state set in initTheme()
        themeToggle.onchange = () => {
            if (themeToggle.checked) {
                // Dark Mode
                document.documentElement.classList.remove('light-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                // Light Mode
                document.documentElement.classList.add('light-mode');
                localStorage.setItem('theme', 'light');
            }
        };
    }

    // --- Settings: Clear History ---
    const clearHistoryBtn = document.getElementById('clear-all-history');
    if (clearHistoryBtn) {
        clearHistoryBtn.onclick = async () => {
            if (!confirm('Clear all conversation history? This cannot be undone.')) return;
            if (!searchHistory.length) return;

            try {
                await Promise.all(
                    searchHistory.map(conv =>
                        fetch(`/conversations/${conv.id}`, { method: 'DELETE' })
                    )
                );
                currentConversationId = null;
                searchHistory = [];
                renderHistory();
                alert('History cleared.');
            } catch (err) {
                alert('Failed to clear history.');
            }
        };
    }

    const togglePills = document.querySelectorAll('.toggle-pill');
    if (togglePills.length > 0) {
        togglePills.forEach(pill => {
            pill.onclick = () => {
                const parent = pill.closest('.website-toggles');
                parent.querySelectorAll('.toggle-pill').forEach(p => p.classList.remove('active'));
                pill.classList.add('active');
            };
        });
    }

    // --- Manual Upload & Button Logic ---
    const dropZone = document.getElementById('file-drop-zone');
    const fileInput = document.getElementById('file-input');
    const btnTriggerFile = document.getElementById('btn-trigger-file');
    const btnAddYoutube = document.getElementById('btn-add-youtube');
    const btnAddWebsite = document.getElementById('btn-add-website');
    const ytInput = document.getElementById('youtube-link');
    const webInput = document.getElementById('website-link');

    if (dropZone && fileInput) {
        dropZone.onclick = () => fileInput.click();
        
        dropZone.ondragover = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent)';
            dropZone.style.background = 'var(--accent-soft)';
        };
        dropZone.ondragleave = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'transparent';
        };
        dropZone.ondrop = (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--border)';
            dropZone.style.background = 'transparent';
            if (e.dataTransfer.files.length) {
                fileInput.files = e.dataTransfer.files;
                handleFilesSelected(fileInput.files);
            }
        };

        fileInput.onchange = () => {
            if (fileInput.files.length) {
                handleFilesSelected(fileInput.files);
            }
        };
    }

    if (btnTriggerFile && fileInput) {
        btnTriggerFile.onclick = () => fileInput.click();
    }

    if (uploadBtnChat && fileInput) {
        uploadBtnChat.onclick = () => fileInput.click();
    }

    async function handleFilesSelected(files) {
        if (!files || files.length === 0) return;
        
        const file = files[0]; // Process one file for now
        const formData = new FormData();
        formData.append('file', file);
        
        const originalText = dropZone.innerHTML;
        dropZone.innerHTML = '<div class="loader" style="text-align:center"><i class="fas fa-spinner fa-spin fa-2x"></i><p style="margin-top:10px">Uploading and processing ' + file.name + '...</p></div>';
        dropZone.style.pointerEvents = 'none';

        try {
            const res = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
            
            if (res.ok) {
                const data = await res.json();
                
                // Update file library in memory
                await loadLibrary();
                
                // Let queryResource load the conversation or initialize the workspace context
                queryResource(data.document_id, data.filename, true);
                
                // Update file counter
                updateFileCounters();
            } else {
                const err = await res.json();
                alert('Upload failed: ' + (err.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Could not connect to the server. Upload failed.');
        } finally {
            // Restore drop zone
            dropZone.innerHTML = originalText;
            dropZone.style.pointerEvents = 'auto';
            fileInput.value = ''; // Reset input
        }
    }

    if (btnAddYoutube && ytInput) {
        btnAddYoutube.onclick = () => {
            const val = ytInput.value.trim();
            if (!val) {
                alert('Please enter a YouTube link.');
                return;
            }

            // Backend processing implementation
            const originalText = btnAddYoutube.innerHTML;
            btnAddYoutube.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnAddYoutube.disabled = true;

            fetch('/youtube', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: val })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Update file library in memory and load the resource workspace
                    loadLibrary().then(() => {
                        queryResource(data.document_id, data.title, true);
                        updateFileCounters();
                    });
                    ytInput.value = '';
                } else {
                    alert('YouTube Error: ' + (data.detail || 'Failed to process video'));
                }
            })
            .catch(err => {
                console.error('YouTube Error:', err);
                alert('Could not connect to the server.');
            })
            .finally(() => {
                btnAddYoutube.innerHTML = originalText;
                btnAddYoutube.disabled = false;
            });
        };
    }

    if (btnAddWebsite && webInput) {
        btnAddWebsite.onclick = () => {
            const val = webInput.value.trim();
            if (!val) {
                alert('Please enter a Website URL.');
                return;
            }

            // Backend processing implementation
            const originalText = btnAddWebsite.innerHTML;
            btnAddWebsite.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btnAddWebsite.disabled = true;

            fetch('/website', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: val })
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    // Update file library in memory and load the resource workspace
                    loadLibrary().then(() => {
                        queryResource(data.document_id, data.title, true);
                        updateFileCounters();
                    });
                    webInput.value = '';
                } else {
                    alert('Website Error: ' + (data.detail || 'Failed to process website'));
                }
            })
            .catch(err => {
                console.error('Website Error:', err);
                alert('Could not connect to the server.');
            })
            .finally(() => {
                btnAddWebsite.innerHTML = originalText;
                btnAddWebsite.disabled = false;
            });
        };
    }

    // --- Redesigned Dashboard Quick Actions Click Handler ---
    document.querySelectorAll('.action-card').forEach(card => {
        card.onclick = () => {
            const targetView = card.dataset.action;
            if (targetView) {
                switchView(targetView);
            }
        };
    });

    // --- Expert Persona Activation Listeners ---
    const PERSONA_INTRODUCTIONS = {
        scholar: {
            name: "Scholar AI",
            msg: "Hello! I am your **Scholar AI** assistant, custom-trained to analyze academic papers, journals, and comprehensive research documents. Ask me to synthesize complex methodologies, summarize key literature findings, or retrieve precise source citations!"
        },
        finance: {
            name: "Finance Analyst",
            msg: "Hello! I am your **Finance Analyst** assistant, custom-optimized to parse balance sheets, quarterly statements, financial audits, and market trends. Ask me to isolate key metrics, explain income changes, or audit numeric summaries!"
        },
        legal: {
            name: "Legal Expert",
            msg: "Hello! I am your **Legal Expert** assistant, trained to scrutinize legal agreements, service terms, liability frameworks, and compliance regulations. Ask me to spot risk clauses, simplify technical legalese, or isolate obligations!"
        },
        tech: {
            name: "Data Interpreter",
            msg: "Hello! I am your **Data Interpreter** assistant, custom-equipped to navigate developer manuals, API schemas, software documentations, and structured JSON assets. Ask me to explain code schemas, parse configurations, or guide you through integration steps!"
        }
    };

    document.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-activate-assistant');
        if (btn) {
            const persona = btn.dataset.persona;
            const intro = PERSONA_INTRODUCTIONS[persona];
            if (intro) {
                // Switch view to chat
                switchView('chat');
                
                // Clear active conversation to start fresh
                currentConversationId = null;
                currentDocumentId = null;
                if (fileInfoPill) fileInfoPill.classList.add('hidden');
                
                // Insert a personalized AI starter message
                if (chatMessages) {
                    chatMessages.innerHTML = `
                        <div class="message ai animate-in">
                            <div class="msg-bubble">
                                ${marked.parse(intro.msg)}
                            </div>
                        </div>
                    `;
                }
                
                // Prime the chat input placeholder
                if (chatInput) {
                    chatInput.placeholder = `Ask ${intro.name} about your files...`;
                    chatInput.focus();
                }
            }
        }
    });

    // --- Pricing Modal Overlay Wiring ---
    const pricingModal = document.getElementById('pricing-modal');
    const btnClosePricing = document.getElementById('btn-close-pricing');
    const togglePersonal = document.getElementById('toggle-personal');
    const toggleBusiness = document.getElementById('toggle-business');
    const pricingGridPersonal = document.getElementById('pricing-grid-personal');
    const pricingGridBusiness = document.getElementById('pricing-grid-business');

    // Show pricing modal when premium button is clicked
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn-premium')) {
            pricingModal?.classList.remove('hidden');
            refreshPricingModalUI();
        }
    });

    // Close pricing modal
    const closePricingModal = () => {
        pricingModal?.classList.add('hidden');
    };

    if (btnClosePricing) btnClosePricing.onclick = closePricingModal;
    if (pricingModal) {
        pricingModal.onclick = (e) => {
            if (e.target === pricingModal) closePricingModal();
        };
    }

    // Toggle between Personal & Business
    if (togglePersonal && toggleBusiness) {
        togglePersonal.onclick = () => {
            togglePersonal.classList.add('active');
            toggleBusiness.classList.remove('active');
            pricingGridPersonal?.classList.remove('hidden');
            pricingGridBusiness?.classList.add('hidden');
        };

        toggleBusiness.onclick = () => {
            toggleBusiness.classList.add('active');
            togglePersonal.classList.remove('active');
            pricingGridBusiness?.classList.remove('hidden');
            pricingGridPersonal?.classList.add('hidden');
        };
    }

    // Plan Selection Actions
    document.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('.select-plan-btn');
        if (selectBtn) {
            const plan = selectBtn.dataset.plan;
            if (plan && currentUser) {
                // Update current user state
                currentUser.plan = plan;
                sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                
                // Refresh UI
                refreshProfileUI();
                refreshPricingModalUI();
                closePricingModal();

                // Gorgeous custom styled premium banner alert
                showPlanChangeNotification(plan);
            }
        }
    });

    // Contact sales button handler
    const btnContactBusiness = document.getElementById('btn-contact-business');
    if (btnContactBusiness) {
        btnContactBusiness.onclick = () => {
            alert('Thank you for your interest! A Smart File Enterprise account manager will contact you at ' + (currentUser ? currentUser.email : 'your email') + ' within 24 hours.');
            closePricingModal();
        };
    }

    function refreshPricingModalUI() {
        if (!currentUser) return;
        const userPlan = currentUser.plan || 'Free';
        const modal = document.getElementById('pricing-modal');
        if (!modal) return;

        // Update Personal Grid (4-column layout)
        const personalGrid = document.getElementById('pricing-grid-personal');
        if (personalGrid) {
            const cards = personalGrid.querySelectorAll('.pricing-card');
            const personalPlans = ['Free', 'Go', 'Plus', 'Pro'];
            cards.forEach((card, idx) => {
                const plan = personalPlans[idx];
                const btn = card.querySelector('.pricing-btn');
                if (btn) {
                    if (userPlan === plan) {
                        btn.className = 'pricing-btn current';
                        btn.disabled = true;
                        btn.textContent = 'Your current plan';
                        btn.removeAttribute('data-plan');
                    } else {
                        let btnClass = 'pricing-btn action-btn select-plan-btn';
                        let btnText = `Upgrade to ${plan}`;
                        if (plan === 'Free') {
                            btnText = 'Downgrade to Free';
                        } else if (plan === 'Plus') {
                            btnClass = 'pricing-btn claim-offer-btn select-plan-btn';
                            btnText = 'Claim free offer';
                        }
                        btn.className = btnClass;
                        btn.disabled = false;
                        btn.textContent = btnText;
                        btn.setAttribute('data-plan', plan);
                    }
                }
            });
        }

        // Update Business Grid (3-column layout)
        const businessGrid = document.getElementById('pricing-grid-business');
        if (businessGrid) {
            const cards = businessGrid.querySelectorAll('.pricing-card');
            const businessPlans = ['Free', 'Business', 'Codex'];
            cards.forEach((card, idx) => {
                const plan = businessPlans[idx];
                const btn = card.querySelector('.pricing-btn');
                if (btn) {
                    if (userPlan === plan) {
                        btn.className = 'pricing-btn current';
                        btn.disabled = true;
                        btn.textContent = 'Your current plan';
                        btn.removeAttribute('data-plan');
                    } else {
                        let btnClass = 'pricing-btn action-btn select-plan-btn';
                        let btnText = 'Upgrade';
                        if (plan === 'Free') {
                            btnText = 'Downgrade to Free';
                        } else if (plan === 'Business') {
                            btnClass = 'pricing-btn claim-offer-btn select-plan-btn';
                            btnText = 'Upgrade';
                        } else if (plan === 'Codex') {
                            btnText = 'Upgrade';
                        }
                        btn.className = btnClass;
                        btn.disabled = false;
                        btn.textContent = btnText;
                        btn.setAttribute('data-plan', plan);
                    }
                }
            });
        }
    }

    function showPlanChangeNotification(plan) {
        // Remove existing notification if any
        const existing = document.getElementById('premium-plan-notification');
        if (existing) existing.remove();

        const notif = document.createElement('div');
        notif.id = 'premium-plan-notification';
        
        let accentColor = '#6366f1';
        let planTitle = 'Plus Tier';
        if (plan === 'Go') {
            accentColor = '#3b82f6';
            planTitle = 'Go Tier';
        } else if (plan === 'Pro') {
            accentColor = '#fbbf24';
            planTitle = 'Pro Tier';
        } else if (plan === 'Business') {
            accentColor = '#a855f7';
            planTitle = 'Business Tier';
        } else if (plan === 'Codex') {
            accentColor = '#ec4899';
            planTitle = 'Codex Tier';
        } else if (plan === 'Free') {
            accentColor = '#8888aa';
            planTitle = 'Free Tier';
        }

        notif.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: #111118;
            border: 1px solid ${accentColor};
            border-radius: 12px;
            padding: 1rem 1.5rem;
            color: #fff;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5), 0 0 20px ${accentColor}33;
            z-index: 5000;
            display: flex;
            align-items: center;
            gap: 12px;
            transform: translateY(100px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: inherit;
        `;

        notif.innerHTML = `
            <div style="background: ${accentColor}20; color: ${accentColor}; width: 36px; height: 36px; border-radius: 50%; display: flex; justify-content: center; align-items: center;">
                <i class="fas fa-crown"></i>
            </div>
            <div>
                <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #fff;">Plan Updated Successfully</h4>
                <p style="margin: 2px 0 0 0; font-size: 0.75rem; color: rgba(255,255,255,0.6);">You are now on the <strong>${planTitle}</strong>.</p>
            </div>
        `;

        document.body.appendChild(notif);
        
        // Trigger slide up & fade in
        setTimeout(() => {
            notif.style.transform = 'translateY(0)';
            notif.style.opacity = '1';
        }, 50);

        // Slide down & fade out after 4 seconds
        setTimeout(() => {
            notif.style.transform = 'translateY(100px)';
            notif.style.opacity = '0';
            setTimeout(() => notif.remove(), 400);
        }, 4000);
    }
});
