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
        library: document.getElementById('dashboard-view'),
        assistants: document.getElementById('dashboard-view')
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

    const VIEW_TITLES = {
        dashboard: 'Dashboard',
        chat: 'Chat',
        profile: 'Profile',
        settings: 'Settings'
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

    // --- Auth Logic Helpers ---
    function showAuthMessage(msg, type = 'error') {
        const statusEl = document.getElementById('auth-status-message');
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
            loginCard?.classList.add('hidden');
            registerCard?.classList.remove('hidden');
        };
    }

    if (goToLogin) {
        goToLogin.onclick = (e) => {
            e.preventDefault();
            document.getElementById('auth-status-message')?.classList.add('hidden');
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

            try {
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Creating account...';
                }
                showAuthMessage('Saving your account...', 'success');

                console.log('Attempting registration for:', payload.username);
                const res = await fetch('/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (res.ok) {
                    showAuthMessage('Account created! You can now sign in.', 'success');
                    setTimeout(() => {
                        registerCard?.classList.add('hidden');
                        loginCard?.classList.remove('hidden');
                        registerForm.reset();
                    }, 1500);
                } else {
                    const err = await res.json();
                    console.error('Registration failed:', err);
                    showAuthMessage(err.detail || 'Registration failed. Try a different username/email.');
                }
            } catch (err) {
                console.error('Connection error:', err);
                showAuthMessage('Could not connect to server during registration.');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = originalBtnText;
                }
            }
        };
    }

    // --- App Init After Login ---
    function onLoginSuccess() {
        authView?.classList.add('hidden');
        appMain?.classList.remove('hidden');

        const name = currentUser.full_name || currentUser.username || 'User';
        const initial = name.charAt(0).toUpperCase();

        if (userInitialsHeader) userInitialsHeader.textContent = initial;

        const userDisp = document.getElementById('user-display-name');
        if (userDisp) userDisp.textContent = name;

        const userInitials = document.getElementById('user-initials');
        if (userInitials) userInitials.textContent = initial;

        // Populate Profile view
        const profileAvatar = document.getElementById('profile-avatar-large');
        if (profileAvatar) profileAvatar.textContent = initial;

        const fieldFullName = document.getElementById('field-full-name');
        if (fieldFullName) fieldFullName.textContent = currentUser.full_name || '—';

        const fieldUsername = document.getElementById('field-username');
        if (fieldUsername) fieldUsername.textContent = '@' + (currentUser.name || currentUser.username || '—');

        const fieldEmail = document.getElementById('field-email');
        if (fieldEmail) fieldEmail.textContent = currentUser.email || '—';

        // Set light mode as default for the dashboard experience
        document.documentElement.classList.add('light-mode');
        localStorage.setItem('theme', 'light');

        switchView('dashboard');
        loadHistory();
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

    // --- Suggested Queries ---
    queryCards.forEach(card => {
        card.onclick = () => {
            const query = card.dataset.query;
            if (chatInput) {
                chatInput.value = query;
                sendMessage();
            }
        };
    });

    // --- View Switching ---
    function switchView(viewId) {
        Object.keys(views).forEach(key => {
            if (views[key]) {
                if (key === viewId) {
                    views[key].classList.remove('hidden');
                } else {
                    views[key].classList.add('hidden');
                }
            }
        });
        if (viewTitle) viewTitle.textContent = VIEW_TITLES[viewId] || 'Dashboard';
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
        if (searchInput && searchInput.value.trim() !== '') {
            const term = searchInput.value.trim().toLowerCase();
            filteredHistory = searchHistory.filter(item => 
                (item.title || 'Untitled').toLowerCase().includes(term)
            );
        }

        if (!filteredHistory || filteredHistory.length === 0) {
            hList.innerHTML = '<div class="history-empty"><i class="fas fa-clock"></i><p>No conversations found</p></div>';
            return;
        }
        hList.innerHTML = filteredHistory.map(item => `
            <div class="history-item ${currentConversationId === item.id ? 'active' : ''}" data-id="${item.id}">
                <i class="fas fa-message"></i>
                <span>${item.title || 'Untitled'}</span>
            </div>
        `).join('');

        hList.querySelectorAll('.history-item').forEach(item => {
            item.onclick = () => loadConversation(item.dataset.id);
        });
    }

    document.addEventListener('input', (e) => {
        if (e.target && e.target.id === 'history-search-input') {
            renderHistory();
        }
    });

    async function loadConversation(id) {
        currentConversationId = id;
        renderHistory();
        switchView('chat');
        chatMessages.innerHTML = '<div id="dashboard-view" class="view-container dashboard-view"> <div class="welcome-hero"> <h1>Hello, <span id="welcome-username">there</span></h1> <p class="intro-text">Welcome to <strong>AI Smart-File</strong>, your professional AI‑powered document assistant. Seamlessly upload, analyse, and query any file with intelligent, context‑aware responses. Get started by uploading a document or picking a recent conversation.</p> </div> </div>';
        
        // Restore document context from history metadata
        const convMeta = searchHistory.find(c => c.id === id);
        const convDocId = convMeta?.document_id || null;
        currentDocumentId = convDocId;

        if (fileInfoPill) {
            fileInfoPill.classList.add('hidden');
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

    function addMessage(text, role) {
        const msg = document.createElement('div');
        msg.className = `message ${role === 'user' ? 'user' : 'ai'} animate-in`;
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
    }

    // --- New Analysis ---
    const resetSession = () => {
        currentConversationId = null;
        currentDocumentId = null;
        if (fileInfoPill) fileInfoPill.classList.add('hidden');
        if (chatMessages) chatMessages.innerHTML = [
            '<div class="message ai animate-in">',
            '<div class="msg-bubble">New session started. Ask me anything about your documents!</div>',
            '</div>'
        ].join('');
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

    const headerAccountTrigger = document.getElementById('header-account-trigger');
    if (headerAccountTrigger) {
        headerAccountTrigger.onclick = () => switchView('profile');
    }

    // Dropdown menu items
    const menuProfile = document.getElementById('menu-profile');
    const menuSettings = document.getElementById('menu-settings');

    if (menuProfile) {
        menuProfile.onclick = () => {
            switchView('profile');
            profileDropdown?.classList.add('hidden');
        };
    }

    if (menuSettings) {
        menuSettings.onclick = () => {
            switchView('settings');
            profileDropdown?.classList.add('hidden');
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

    // --- Upload View Logic ---
    const uploadTabs = document.querySelectorAll('.upload-tab');
    if (uploadTabs.length > 0) {
        uploadTabs.forEach(tab => {
            tab.onclick = () => {
                const targetId = tab.dataset.target;
                
                // Update tabs
                uploadTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Update content
                const uploadContents = document.querySelectorAll('.upload-main-card .tab-content');
                uploadContents.forEach(c => c.classList.remove('active'));
                document.getElementById(targetId)?.classList.add('active');
            };
        });
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

    // --- Voice Recording Logic ---
    const btnRecord = document.getElementById('btn-record');
    const btnStopRecord = document.getElementById('btn-stop-record');
    const voiceStatus = document.getElementById('voice-status');
    const voiceTimer = document.getElementById('voice-timer');
    
    let mediaRecorder;
    let audioChunks = [];
    let recordTimerInterval;
    let secondsRecorded = 0;

    function formatTime(seconds) {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    if (btnRecord && btnStopRecord) {
        btnRecord.onclick = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                mediaRecorder = new MediaRecorder(stream);
                audioChunks = [];

                mediaRecorder.ondataavailable = e => {
                    if (e.data.size > 0) audioChunks.push(e.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                    // Here you would upload the audioBlob to the backend
                    voiceStatus.textContent = 'Recording saved!';
                    console.log('Voice note recorded, size:', audioBlob.size);
                    
                    // Reset UI after 3 seconds
                    setTimeout(() => {
                        voiceStatus.textContent = 'Ready to record';
                        voiceTimer.textContent = '00:00';
                    }, 3000);
                };

                mediaRecorder.start();
                
                btnRecord.classList.add('hidden');
                btnStopRecord.classList.remove('hidden');
                voiceStatus.textContent = 'Recording...';
                voiceStatus.style.color = 'var(--red)';
                
                secondsRecorded = 0;
                voiceTimer.textContent = '00:00';
                recordTimerInterval = setInterval(() => {
                    secondsRecorded++;
                    voiceTimer.textContent = formatTime(secondsRecorded);
                }, 1000);
                
            } catch (err) {
                console.error('Error accessing microphone:', err);
                alert('Could not access microphone. Please check permissions.');
            }
        };

        btnStopRecord.onclick = () => {
            if (mediaRecorder && mediaRecorder.state !== 'inactive') {
                mediaRecorder.stop();
                mediaRecorder.stream.getTracks().forEach(track => track.stop());
            }
            clearInterval(recordTimerInterval);
            
            btnStopRecord.classList.add('hidden');
            btnRecord.classList.remove('hidden');
            voiceStatus.style.color = 'var(--text-secondary)';
            voiceStatus.textContent = 'Saving...';
        };
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
                
                // Update conversation context
                currentDocumentId = data.document_id;
                currentConversationId = null; // Start a new conversation for this doc
                
                // Switch to chat view
                switchView('chat');
                
                // Start chat session with confirmation
                chatMessages.innerHTML = '';
                addMessage(`**Document uploaded successfully!**\n\nI have analyzed **${data.filename}**. What would you like to know about it?`, 'ai');
                
                if (fileInfoPill) {
                    fileInfoPill.textContent = data.filename;
                    fileInfoPill.classList.remove('hidden');
                }
                
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
            alert(`Processing YouTube link: ${val}\n(Backend processing not yet implemented)`);
            ytInput.value = '';
        };
    }

    if (btnAddWebsite && webInput) {
        btnAddWebsite.onclick = () => {
            const val = webInput.value.trim();
            if (!val) {
                alert('Please enter a Website URL.');
                return;
            }
            alert(`Processing Website link: ${val}\n(Backend processing not yet implemented)`);
            webInput.value = '';
        };
    }
});
