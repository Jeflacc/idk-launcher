document.addEventListener('DOMContentLoaded', () => {
    const IDK_BACKEND = "https://api.somniac.me";
    let idkToken = localStorage.getItem("idk_connect_token") || "";
    let idkUser = null;
    
    try {
        idkUser = JSON.parse(localStorage.getItem("idk_connect_user"));
    } catch(e) {}

    const authOverlay = document.getElementById('auth-overlay');
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const authMsg = document.getElementById('auth-msg');

    // Setup initial view
    if (!idkToken || !idkUser) {
        authOverlay.style.display = 'flex';
    } else {
        authOverlay.style.display = 'none';
        setupDashboard();
    }

    function showAuthMsg(msg, isSuccess = false) {
        authMsg.style.display = 'block';
        authMsg.innerText = msg;
        authMsg.className = isSuccess ? 'auth-msg success' : 'auth-msg error';
    }

    // Auth Tabs
    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.style.display = 'flex';
        formRegister.style.display = 'none';
        authMsg.style.display = 'none';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.style.display = 'flex';
        formLogin.style.display = 'none';
        authMsg.style.display = 'none';
    });

    // Login Action
    const btnLogin = document.getElementById('btn-login');
    btnLogin.addEventListener('click', async () => {
        const username = document.getElementById('l-user').value.trim();
        const password = document.getElementById('l-pass').value;
        
        if(!username || !password) {
            showAuthMsg("Username and password required.");
            return;
        }
        
        btnLogin.innerText = "Connecting...";
        btnLogin.disabled = true;
        
        try {
            const res = await fetch(`${IDK_BACKEND}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if(res.ok) {
                if(data.requires2fa) {
                    showAuthMsg("2FA required. Please login using the IDK Launcher on Desktop.");
                } else {
                    idkToken = data.token;
                    idkUser = data.user;
                    localStorage.setItem("idk_connect_token", idkToken);
                    localStorage.setItem("idk_connect_user", JSON.stringify(idkUser));
                    
                    // Simulated loading transition
                    document.querySelector('.auth-box').style.display = 'none';
                    const loadingUi = document.getElementById('auth-loading');
                    const loadingText = document.getElementById('auth-loading-text');
                    loadingUi.style.display = 'flex';
                    loadingText.innerText = "Authenticating...";
                    
                    setTimeout(() => {
                        loadingText.innerText = "Fetching Profile Data...";
                    }, 800);
                    
                    setTimeout(() => {
                        loadingUi.style.display = 'none';
                        document.querySelector('.auth-box').style.display = 'block'; // Reset for future logout
                        authOverlay.style.display = 'none';
                        setupDashboard();
                    }, 1800);
                }
            } else {
                showAuthMsg(data.error || "Login failed.");
            }
        } catch(e) {
            showAuthMsg("Network error connecting to IDK Backend.");
        }
        btnLogin.innerText = "Login";
        btnLogin.disabled = false;
    });

    // Register Action
    const btnReg = document.getElementById('btn-register');
    let regOtpRequested = false;
    btnReg.addEventListener('click', async () => {
        const username = document.getElementById('r-user').value.trim();
        const email = document.getElementById('r-email').value.trim();
        const password = document.getElementById('r-pass').value;
        const otp = document.getElementById('r-otp').value.trim();
        
        if(!username || !email || !password) {
            showAuthMsg("All fields are required.");
            return;
        }
        
        if(!regOtpRequested) {
            btnReg.innerText = "Requesting...";
            btnReg.disabled = true;
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/request-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email })
                });
                const data = await res.json();
                if(res.ok) {
                    regOtpRequested = true;
                    document.getElementById('r-otp').style.display = 'block';
                    btnReg.innerText = "Verify & Register";
                    showAuthMsg("OTP sent to your email!", true);
                } else {
                    showAuthMsg(data.error || "Failed to request OTP.");
                }
            } catch(e) {
                showAuthMsg("Network error.");
            }
            btnReg.disabled = false;
            return;
        }
        
        if(regOtpRequested && !otp) {
            showAuthMsg("Please enter the OTP.");
            return;
        }
        
        btnReg.innerText = "Verifying...";
        btnReg.disabled = true;
        
        try {
            const res = await fetch(`${IDK_BACKEND}/api/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email, password, otp })
            });
            const data = await res.json();
            
            if(res.ok) {
                showAuthMsg("Registration successful! You can now login.", true);
                setTimeout(() => tabLogin.click(), 2000);
            } else {
                showAuthMsg(data.error || "Registration failed.");
            }
        } catch(e) {
            showAuthMsg("Network error.");
        }
        btnReg.innerText = "Verify & Register";
        btnReg.disabled = false;
    });
    
    // OAuth Button Listeners (Redirect to Backend)
    const discordBtn = document.querySelector('.discord-btn');
    const googleBtn = document.querySelector('.google-btn');
    
    if (discordBtn) {
        discordBtn.addEventListener('click', () => {
            showAuthMsg("Connecting to Discord...");
            window.location.href = `${IDK_BACKEND}/api/auth/discord`;
        });
    }
    
    if (googleBtn) {
        googleBtn.addEventListener('click', () => {
            showAuthMsg("Connecting to Google...");
            window.location.href = `${IDK_BACKEND}/api/auth/google`;
        });
    }

    // Process OAuth JWT Token from URL (Redirected back from Backend)
    const urlParams = new URLSearchParams(window.location.search);
    const tokenFromUrl = urlParams.get('token');
    const errorFromUrl = urlParams.get('error');
    const oauthError = urlParams.get('oauth_error');
    const oauthPending = urlParams.get('oauth_pending');
    const sessionToken = urlParams.get('session');

    if (oauthError === 'email_exists') {
        window.history.replaceState({}, document.title, window.location.pathname);
        showAuthMsg("Email is already registered. Please login and link your account in Settings.");
        authOverlay.style.display = 'flex';
    } else if (oauthPending === 'true' && sessionToken) {
        window.history.replaceState({}, document.title, window.location.pathname);
        authOverlay.style.display = 'flex';
        document.querySelector('.auth-box').style.display = 'none';
        document.getElementById('oauth-setup-overlay').style.display = 'flex';
        
        const btnSetup = document.getElementById('btn-oauth-setup');
        const setupMsg = document.getElementById('oauth-setup-msg');
        btnSetup.onclick = async () => {
            const desiredUsername = document.getElementById('oauth-setup-username').value.trim();
            if(!desiredUsername) {
                setupMsg.innerText = "Username is required.";
                setupMsg.className = 'auth-msg error';
                setupMsg.style.display = 'block';
                return;
            }
            btnSetup.innerText = "Completing...";
            btnSetup.disabled = true;
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/oauth-complete`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ session: sessionToken, username: desiredUsername })
                });
                const data = await res.json();
                if(res.ok) {
                    window.location.href = window.location.pathname + "?token=" + data.token;
                } else {
                    setupMsg.innerText = data.error || "Failed to set username.";
                    setupMsg.className = 'auth-msg error';
                    setupMsg.style.display = 'block';
                }
            } catch(e) {
                setupMsg.innerText = "Network error.";
                setupMsg.className = 'auth-msg error';
                setupMsg.style.display = 'block';
            }
            btnSetup.innerText = "Complete Signup";
            btnSetup.disabled = false;
        };
    } else if (tokenFromUrl) {
        // Clear the URL to avoid leaking the token if the user copies the link
        window.history.replaceState({}, document.title, window.location.pathname);
        
        idkToken = tokenFromUrl;
        localStorage.setItem("idk_connect_token", idkToken);
        
        // We don't have the user object yet, so we need to fetch it
        fetch(`${IDK_BACKEND}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${idkToken}` }
        }).then(res => res.json()).then(data => {
            if (data.user) {
                idkUser = data.user;
                localStorage.setItem("idk_connect_user", JSON.stringify(idkUser));
                
                authOverlay.style.display = 'none';
                setupDashboard();
            } else {
                throw new Error("Invalid session");
            }
        }).catch(err => {
            idkToken = "";
            localStorage.removeItem("idk_connect_token");
            showAuthMsg("OAuth session expired or invalid. Please login again.");
            authOverlay.style.display = 'flex';
        });
    } else if (errorFromUrl) {
        window.history.replaceState({}, document.title, window.location.pathname);
        showAuthMsg(`Login failed: ${errorFromUrl}`);
        authOverlay.style.display = 'flex';
    }

    // --- Avatar Rendering Logic ---
    function setMinecraftAvatar(imgElement, uObj) {
        // Find correct username and auth mode
        const mcUsername = uObj.linkedMinecraftAccount ? uObj.linkedMinecraftAccount.username : uObj.username;
        const authMode = uObj.linkedMinecraftAccount ? uObj.linkedMinecraftAccount.authMode : 'offline';
        
        // Setup initial fallback and source
        let fallbackStage = 0;
        const img = new Image();
        img.crossOrigin = "Anonymous";
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            
            const scale = img.naturalWidth / 64;
            ctx.imageSmoothingEnabled = false;
            
            // Draw face
            ctx.drawImage(img, 8 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 64, 64);
            // Draw accessory
            ctx.drawImage(img, 40 * scale, 8 * scale, 8 * scale, 8 * scale, 0, 0, 64, 64);
            
            imgElement.src = canvas.toDataURL('image/png');
        };
        
        img.onerror = () => {
            fallbackStage++;
            if (fallbackStage === 1) {
                img.src = `https://minotar.net/skin/${mcUsername}`;
            } else {
                imgElement.src = `https://minotar.net/helm/MHF_Steve/120.png`;
            }
        };
        
        if (authMode === 'offline') {
            img.src = `https://minotar.net/skin/${mcUsername}`;
        } else {
            // Bypass Ely.by CORS restrictions using our backend proxy
            img.src = `${IDK_BACKEND}/api/skins/elyby/${mcUsername}`;
        }
    }

    // --- Dashboard Logic ---
    function setupDashboard() {
        // Set user badge in sidebar
        document.getElementById('nav-username').innerText = idkUser.username;
        const navAvatar = document.getElementById('nav-avatar');
        setMinecraftAvatar(navAvatar, idkUser);
        
        // Handle Routing
        const currentUrl = new URL(window.location);
        const targetUser = currentUrl.searchParams.get('u');
        const targetChat = currentUrl.searchParams.get('c');
        const targetTab = currentUrl.searchParams.get('tab');
        
        if (targetUser) {
            loadUserProfile(targetUser);
        } else if (targetChat) {
            switchView('view-friends');
            loadFriends().then(friends => {
                if (friends) {
                    const fObj = friends.find(f => f.username.toLowerCase() === targetChat.toLowerCase());
                    if (fObj) openChat(fObj);
                }
            });
        } else if (targetTab) {
            if (targetTab === 'search') {
                switchView('view-search');
            } else if (targetTab === 'friends') {
                switchView('view-friends');
                loadFriends();
            } else if (targetTab === 'settings') {
                switchView('view-settings');
                setupSettingsView();
            } else {
                switchView('view-my-profile');
                loadMyProfile();
            }
        } else {
            // Load My Profile initially
            switchView('view-my-profile');
            loadMyProfile();
        }
    }

    document.getElementById('btn-logout').addEventListener('click', () => {
        idkToken = "";
        idkUser = null;
        localStorage.removeItem("idk_connect_token");
        localStorage.removeItem("idk_connect_user");
        authOverlay.style.display = 'flex';
        
        // reset forms
        document.getElementById('l-user').value = '';
        document.getElementById('l-pass').value = '';
        authMsg.style.display = 'none';
        tabLogin.click();
    });

    // Navigation
    const navMyProfile = document.getElementById('nav-my-profile');
    const navSearch = document.getElementById('nav-search');
    
    const viewMyProfile = document.getElementById('view-my-profile');
    const viewSearch = document.getElementById('view-search');
    const viewUserProfile = document.getElementById('view-user-profile');

    function switchView(viewId) {
        document.querySelectorAll('.view-container').forEach(v => v.classList.remove('active'));
        document.getElementById(viewId).classList.add('active');
        
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        const navItem = document.getElementById('nav-' + viewId.replace('view-', ''));
        if (navItem) navItem.classList.add('active');
        
        if (viewId !== 'view-user-profile') {
            const currentUrl = new URL(window.location);
            let changed = false;
            if (currentUrl.searchParams.has('u')) {
                currentUrl.searchParams.delete('u');
                changed = true;
            }
            if (viewId !== 'view-friends' && currentUrl.searchParams.has('c')) {
                currentUrl.searchParams.delete('c');
                changed = true;
            }
            
            const tabName = viewId.replace('view-', '');
            if (currentUrl.searchParams.get('tab') !== tabName) {
                currentUrl.searchParams.set('tab', tabName);
                changed = true;
            }

            if (changed) {
                window.history.pushState(null, '', currentUrl.toString());
            }
        }
    }

    navMyProfile.addEventListener('click', () => {
        switchView('view-my-profile');
        loadMyProfile();
    });

    navSearch.addEventListener('click', () => {
        switchView('view-search');
    });

    const navSettings = document.getElementById('nav-settings');
    if (navSettings) {
        navSettings.addEventListener('click', () => {
            switchView('view-settings');
            setupSettingsView();
        });
    }

    document.getElementById('btn-back-search').addEventListener('click', () => {
        switchView('view-search');
    });

    async function loadMyProfile() {
        document.getElementById('my-profile-name').innerText = idkUser.username;
        const profAvatar = document.getElementById('my-profile-avatar');
        setMinecraftAvatar(profAvatar, idkUser);
        
        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/${idkUser.username}/profile`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const data = await res.json();
            if (res.ok && data.profile) {
                document.getElementById('my-profile-bio').innerText = data.profile.bio || "No bio available.";
                const st = document.getElementById('my-profile-status');
                st.className = data.profile.status === 'online' ? 'hero-status-badge online' : 'hero-status-badge';
            }
        } catch(e) { }
    }

    // Search Logic
    const btnSearch = document.getElementById('btn-do-search');
    const inputSearch = document.getElementById('search-input');
    const resultsContainer = document.getElementById('search-results');
    const searchMsg = document.getElementById('search-msg');

    btnSearch.addEventListener('click', async () => {
        const q = inputSearch.value.trim();
        if (!q) return;

        btnSearch.disabled = true;
        searchMsg.innerText = "Searching...";
        resultsContainer.innerHTML = "";

        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/search?q=${encodeURIComponent(q)}`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const data = await res.json();
            
            if (res.ok && data.users && data.users.length > 0) {
                searchMsg.innerText = `Found ${data.users.length} user(s).`;
                data.users.forEach(u => {
                    const card = document.createElement('div');
                    card.className = 'user-card';
                    card.innerHTML = `
                        <img id="search-avatar-${u.id}" alt="Avatar">
                        <div style="width:100%; display:flex; flex-direction:column; align-items:center;">
                            <h4>${u.username}</h4>
                        </div>
                        <button class="add-friend-btn secondary-btn">Add Friend</button>
                    `;
                    resultsContainer.appendChild(card);
                    setMinecraftAvatar(document.getElementById(`search-avatar-${u.id}`), u);
                    
                    // Click avatar/name to load profile
                    card.addEventListener('click', () => {
                        loadUserProfile(u.username);
                    });

                    // Click Add Friend
                    const btnAdd = card.querySelector('.add-friend-btn');
                    btnAdd.addEventListener('click', async (e) => {
                        e.stopPropagation();
                        btnAdd.innerText = "...";
                        btnAdd.disabled = true;
                        try {
                            const addRes = await fetch(`${IDK_BACKEND}/api/friends/request`, {
                                method: 'POST',
                                headers: { 
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${idkToken}`
                                },
                                body: JSON.stringify({ username: u.username })
                            });
                            const addData = await addRes.json();
                            if(addRes.ok) {
                                btnAdd.innerText = "Sent";
                                btnAdd.classList.add('success');
                            } else {
                                btnAdd.innerText = "Error";
                                alert(addData.error || "Failed to add friend");
                                btnAdd.disabled = false;
                            }
                        } catch(err) {
                            btnAdd.innerText = "Error";
                            btnAdd.disabled = false;
                        }
                    });
                    resultsContainer.appendChild(card);
                });
            } else {
                searchMsg.innerText = "No users found.";
            }
        } catch(e) {
            searchMsg.innerText = "Search failed due to network error.";
        }
        btnSearch.disabled = false;
    });

    inputSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') btnSearch.click();
    });

    async function loadUserProfile(username) {
        switchView('view-user-profile');
        
        const currentUrl = new URL(window.location);
        if (currentUrl.searchParams.get('u') !== username) {
            currentUrl.searchParams.set('u', username);
            window.history.pushState(null, '', currentUrl.toString());
        }
        
        document.getElementById('user-profile-name').innerText = username;
        const uAvatar = document.getElementById('user-profile-avatar');
        // Fallback before fetch, assume username is minecraft name
        setMinecraftAvatar(uAvatar, {username: username});
        document.getElementById('user-profile-bio').innerText = "Loading...";
        document.getElementById('user-profile-status').className = 'hero-status-badge';

        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/${username}/profile`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const data = await res.json();
            if (res.ok && data.profile) {
                setMinecraftAvatar(uAvatar, data.profile);
                document.getElementById('user-profile-bio').innerText = data.profile.bio || "No bio available.";
                const st = document.getElementById('user-profile-status');
                st.className = data.profile.status === 'online' ? 'hero-status-badge online' : 'hero-status-badge';
            } else {
                document.getElementById('user-profile-bio').innerText = "Could not load profile.";
            }
        } catch(e) {
            document.getElementById('user-profile-bio').innerText = "Network error.";
        }
    }

    // --- Friends & DM Logic ---
    const navFriends = document.getElementById('nav-friends');
    const viewFriends = document.getElementById('view-friends');
    const friendRequestsList = document.getElementById('friend-requests-list');
    const friendsList = document.getElementById('friends-list');
    const chatPlaceholder = document.getElementById('chat-placeholder');
    const chatActive = document.getElementById('chat-active');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const btnSendMsg = document.getElementById('btn-send-msg');
    
    let currentChatFriendId = null;
    let currentChatUsername = null;
    let chatPollingInterval = null;

    if (navFriends) {
        navFriends.addEventListener('click', () => {
            switchView('view-friends');
            loadFriends();
        });
    }

    async function loadFriends() {
        if (!idkToken) return;
        
        try {
            // Load Requests
            const reqRes = await fetch(`${IDK_BACKEND}/api/friends/requests`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const reqData = await reqRes.json();
            friendRequestsList.innerHTML = "";
            if (reqData.requests && reqData.requests.length > 0) {
                reqData.requests.forEach(req => {
                    friendRequestsList.innerHTML += `
                        <div class="friend-item" id="freq-${req.requestId}">
                            <img id="freq-avatar-${req.requestId}">
                            <div class="friend-item-info">
                                <h4>${req.username}</h4>
                                <span>Wants to be friends</span>
                            </div>
                            <div class="friend-item-actions">
                                <button class="secondary-btn btn-accept" data-id="${req.requestId}">✓</button>
                                <button class="secondary-btn btn-decline" data-id="${req.requestId}" style="background:var(--bg-lighter)">✗</button>
                            </div>
                        </div>
                    `;
                });
                reqData.requests.forEach(req => {
                    setMinecraftAvatar(document.getElementById(`freq-avatar-${req.requestId}`), req);
                });
            } else {
                friendRequestsList.innerHTML = "<p style='color:var(--text-muted);font-size:14px;'>No pending requests.</p>";
            }

            // Load Friends
            const fRes = await fetch(`${IDK_BACKEND}/api/friends`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const fData = await fRes.json();
            friendsList.innerHTML = "";
            if (fData.friends && fData.friends.length > 0) {
                fData.friends.forEach(f => {
                    const el = document.createElement('div');
                    el.className = 'friend-item';
                    el.innerHTML = `
                        <img id="friend-avatar-${f.id}">
                        <div class="friend-item-info">
                            <h4>${f.username}</h4>
                            <span style="color: ${f.status === 'online' ? '#4ade80' : 'var(--text-muted)'}">${f.status === 'online' ? 'Online' : 'Offline'}</span>
                        </div>
                    `;
                    el.addEventListener('click', () => openChat(f));
                    friendsList.appendChild(el);
                    setMinecraftAvatar(document.getElementById(`friend-avatar-${f.id}`), f);
                });
            } else {
                friendsList.innerHTML = "<p style='color:var(--text-muted);font-size:14px;'>No friends yet. Search and add some!</p>";
            }
            return fData.friends;
        } catch (e) {
            console.error("Failed to load friends", e);
            return null;
        }
    }

    window.handleRequest = async function(requestId, action) {
        try {
            await fetch(`${IDK_BACKEND}/api/friends/requests/handle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idkToken}` },
                body: JSON.stringify({ requestId, action })
            });
            loadFriends();
        } catch (e) {}
    }

    function openChat(friendObj) {
        currentChatFriendId = friendObj.id;
        currentChatUsername = friendObj.username;
        
        const currentUrl = new URL(window.location);
        if (currentUrl.searchParams.get('c') !== friendObj.username) {
            currentUrl.searchParams.set('c', friendObj.username);
            window.history.pushState(null, '', currentUrl.toString());
        }
        
        chatPlaceholder.style.display = 'none';
        chatActive.style.display = 'flex';
        document.getElementById('chat-name').innerText = currentChatUsername;
        
        const cStatus = document.getElementById('chat-status');
        if (cStatus) {
            cStatus.innerText = friendObj.status === 'online' ? 'Online' : 'Offline';
            cStatus.className = friendObj.status === 'online' ? 'status-text online' : 'status-text';
        }
        const cAvatar = document.getElementById('chat-avatar');
        setMinecraftAvatar(cAvatar, friendObj);
        
        loadMessages();
        
        if (chatPollingInterval) clearInterval(chatPollingInterval);
        chatPollingInterval = setInterval(() => {
            if (currentChatFriendId) loadMessages(false);
        }, 3000);
    }

    async function loadMessages(scroll = true) {
        if (!currentChatFriendId) return;
        try {
            const res = await fetch(`${IDK_BACKEND}/api/messages/${currentChatFriendId}`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const data = await res.json();
            
            if (data.messages) {
                chatMessages.innerHTML = "";
                data.messages.forEach(msg => {
                    const isMe = msg.senderId === idkUser.id;
                    const date = new Date(msg.timestamp);
                    const timeStr = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    chatMessages.innerHTML += `
                        <div class="chat-msg ${isMe ? 'me' : 'them'}">
                            <div class="chat-bubble">${msg.text}</div>
                            <span class="chat-time">${timeStr}</span>
                        </div>
                    `;
                });
                
                if (scroll) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
            }
        } catch (e) {}
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text || !currentChatFriendId) return;
        
        chatInput.value = '';
        try {
            await fetch(`${IDK_BACKEND}/api/messages/${currentChatFriendId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idkToken}` },
                body: JSON.stringify({ text: text })
            });
            loadMessages(true);
        } catch(e) {}
    }

    if (btnSendMsg) {
        btnSendMsg.addEventListener('click', sendMessage);
    }
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // --- Settings View Logic ---
    async function setupSettingsView() {
        const bioInput = document.getElementById('settings-bio');
        const saveBtn = document.getElementById('btn-save-settings');
        const msgDiv = document.getElementById('settings-msg');
        msgDiv.innerText = '';
        
        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/${idkUser.username}/profile`, {
                headers: { 'Authorization': `Bearer ${idkToken}` }
            });
            const data = await res.json();
            if (res.ok && data.profile) {
                bioInput.value = data.profile.bio || '';
                
                // Update OAuth Buttons
                const discordBtn = document.getElementById('btn-sync-discord');
                const googleBtn = document.getElementById('btn-sync-google');
                const mcBtn = document.getElementById('btn-sync-mc');
                
                if (data.profile.oauthProvider === 'discord') {
                    discordBtn.innerText = 'Synced';
                    discordBtn.style.opacity = '0.5';
                    discordBtn.style.cursor = 'default';
                    discordBtn.onclick = (e) => e.preventDefault();
                } else {
                    discordBtn.onclick = () => {
                        window.location.href = `${IDK_BACKEND}/api/auth/discord?link_token=${idkToken}`;
                    };
                }
                
                if (data.profile.oauthProvider === 'google') {
                    googleBtn.innerText = 'Synced';
                    googleBtn.style.opacity = '0.5';
                    googleBtn.style.cursor = 'default';
                    googleBtn.onclick = (e) => e.preventDefault();
                } else {
                    googleBtn.onclick = () => {
                        window.location.href = `${IDK_BACKEND}/api/auth/google?link_token=${idkToken}`;
                    };
                }
                
                if (data.profile.linkedMinecraftAccount) {
                    mcBtn.innerText = 'Synced (' + data.profile.linkedMinecraftAccount.authMode + ')';
                    mcBtn.style.opacity = '1';
                    document.getElementById('mc-account-name').innerText = data.profile.linkedMinecraftAccount.username;
                }
            }
        } catch(e) {}
        
        // Save Bio
        saveBtn.onclick = async () => {
            saveBtn.disabled = true;
            saveBtn.innerText = 'Saving...';
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idkToken}` },
                    body: JSON.stringify({ bio: bioInput.value })
                });
                if (res.ok) {
                    msgDiv.innerText = 'Profile updated successfully!';
                    msgDiv.style.color = '#4ade80';
                } else {
                    const err = await res.json();
                    msgDiv.innerText = err.error || 'Failed to update profile.';
                    msgDiv.style.color = '#ff4a4a';
                }
            } catch(e) {
                msgDiv.innerText = 'Network error.';
                msgDiv.style.color = '#ff4a4a';
            }
            saveBtn.disabled = false;
            saveBtn.innerText = 'Save Changes';
            setTimeout(() => { msgDiv.innerText = ''; }, 3000);
        };
        
        // --- Change Username ---
        document.getElementById('settings-username').value = idkUser.username;
        const btnChangeUser = document.getElementById('btn-change-username');
        const userMsg = document.getElementById('settings-username-msg');
        btnChangeUser.onclick = async () => {
            const newUsername = document.getElementById('settings-username').value.trim();
            if (!newUsername) return;
            btnChangeUser.disabled = true;
            btnChangeUser.innerText = 'Updating...';
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/settings/username`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idkToken}` },
                    body: JSON.stringify({ newUsername })
                });
                const data = await res.json();
                if (res.ok) {
                    idkToken = data.token;
                    idkUser = data.user;
                    localStorage.setItem("idk_connect_token", idkToken);
                    localStorage.setItem("idk_connect_user", JSON.stringify(idkUser));
                    document.getElementById('nav-username').innerText = idkUser.username;
                    setMinecraftAvatar(document.getElementById('nav-avatar'), idkUser);
                    userMsg.innerText = 'Username updated!';
                    userMsg.style.color = '#4ade80';
                } else {
                    userMsg.innerText = data.error || 'Failed to update username.';
                    userMsg.style.color = '#ff4a4a';
                }
            } catch(e) {
                userMsg.innerText = 'Network error.';
                userMsg.style.color = '#ff4a4a';
            }
            btnChangeUser.disabled = false;
            btnChangeUser.innerText = 'Update';
            setTimeout(() => { userMsg.innerText = ''; }, 3000);
        };

        // --- Change Password ---
        const btnChangePass = document.getElementById('btn-change-password');
        const passMsg = document.getElementById('settings-password-msg');
        btnChangePass.onclick = async () => {
            const oldPassword = document.getElementById('settings-old-pass').value;
            const newPassword = document.getElementById('settings-new-pass').value;
            if (!newPassword) return;
            
            btnChangePass.disabled = true;
            btnChangePass.innerText = 'Updating...';
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/settings/password`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idkToken}` },
                    body: JSON.stringify({ oldPassword, newPassword })
                });
                if (res.ok) {
                    passMsg.innerText = 'Password updated successfully!';
                    passMsg.style.color = '#4ade80';
                    document.getElementById('settings-old-pass').value = '';
                    document.getElementById('settings-new-pass').value = '';
                } else {
                    const data = await res.json();
                    passMsg.innerText = data.error || 'Failed to update password.';
                    passMsg.style.color = '#ff4a4a';
                }
            } catch(e) {
                passMsg.innerText = 'Network error.';
                passMsg.style.color = '#ff4a4a';
            }
            btnChangePass.disabled = false;
            btnChangePass.innerText = 'Update Password';
            setTimeout(() => { passMsg.innerText = ''; }, 3000);
        };

        // --- Delete Account ---
        document.getElementById('btn-delete-account').onclick = async () => {
            const confirmed = confirm("Are you sure you want to permanently delete your account? This action cannot be undone.");
            if (!confirmed) return;
            
            try {
                const res = await fetch(`${IDK_BACKEND}/api/auth/settings/account`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${idkToken}` }
                });
                if (res.ok) {
                    // Log out
                    localStorage.removeItem("idk_connect_token");
                    localStorage.removeItem("idk_connect_user");
                    window.location.href = "connect.html";
                } else {
                    const data = await res.json();
                    alert(data.error || "Failed to delete account");
                }
            } catch(e) {
                alert("Network error.");
            }
        };

        // Check for sync success
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.get('sync_success')) {
            msgDiv.innerText = `Successfully linked your ${currentParams.get('sync_success')} account!`;
            msgDiv.style.color = '#4ade80';
            setTimeout(() => { msgDiv.innerText = ''; }, 5000);
            
            const currentUrl = new URL(window.location);
            currentUrl.searchParams.delete('sync_success');
            window.history.replaceState({}, document.title, currentUrl.toString());
        }

        // Connect Buttons are set inside the fetch above so they don't overwrite if synced
    }

});
