document.addEventListener('DOMContentLoaded', () => {
    const IDK_BACKEND = "http://api.somniac.me:6040";
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

    if (tokenFromUrl) {
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

    // --- Dashboard Logic ---
    function setupDashboard() {
        // Set user badge
        document.getElementById('nav-username').innerText = idkUser.username;
        document.getElementById('nav-avatar').src = `https://minotar.net/helm/${idkUser.username}/40.png`;
        
        // Load My Profile initially
        loadMyProfile();
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
    const headerTitle = document.getElementById('header-title');

    function switchView(viewName) {
        viewMyProfile.classList.remove('active');
        viewSearch.classList.remove('active');
        viewUserProfile.classList.remove('active');
        
        navMyProfile.classList.remove('active');
        navSearch.classList.remove('active');

        if (viewName === 'my-profile') {
            viewMyProfile.classList.add('active');
            navMyProfile.classList.add('active');
            headerTitle.innerText = "My Profile";
        } else if (viewName === 'search') {
            viewSearch.classList.add('active');
            navSearch.classList.add('active');
            headerTitle.innerText = "Search Users";
        } else if (viewName === 'user-profile') {
            viewUserProfile.classList.add('active');
            headerTitle.innerText = "Player Profile";
        }
    }

    navMyProfile.addEventListener('click', () => {
        switchView('my-profile');
        loadMyProfile();
    });

    navSearch.addEventListener('click', () => {
        switchView('search');
    });

    document.getElementById('btn-back-search').addEventListener('click', () => {
        switchView('search');
    });

    async function loadMyProfile() {
        document.getElementById('my-profile-name').innerText = idkUser.username;
        document.getElementById('my-profile-avatar').src = `https://minotar.net/helm/${idkUser.username}/120.png`;
        
        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/${idkUser.username}/profile`);
            const data = await res.json();
            if (res.ok && data.profile) {
                document.getElementById('my-profile-bio').innerText = data.profile.bio || "No bio available.";
                const st = document.getElementById('my-profile-status');
                st.innerText = data.profile.status === 'online' ? 'Online' : 'Offline';
                st.className = data.profile.status === 'online' ? 'status-badge online' : 'status-badge';
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
            const res = await fetch(`${IDK_BACKEND}/api/users/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            
            if (res.ok && data.users && data.users.length > 0) {
                searchMsg.innerText = `Found ${data.users.length} user(s).`;
                data.users.forEach(u => {
                    const card = document.createElement('div');
                    card.className = 'user-card';
                    card.innerHTML = `
                        <img src="https://minotar.net/helm/${u.username}/48.png" alt="Avatar">
                        <h4>${u.username}</h4>
                    `;
                    card.addEventListener('click', () => {
                        loadUserProfile(u.username);
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
        switchView('user-profile');
        
        document.getElementById('user-profile-name').innerText = username;
        document.getElementById('user-profile-avatar').src = `https://minotar.net/helm/${username}/120.png`;
        document.getElementById('user-profile-bio').innerText = "Loading...";
        document.getElementById('user-profile-status').innerText = "Loading";
        document.getElementById('user-profile-status').className = 'status-badge';

        try {
            const res = await fetch(`${IDK_BACKEND}/api/users/${username}/profile`);
            const data = await res.json();
            if (res.ok && data.profile) {
                document.getElementById('user-profile-bio').innerText = data.profile.bio || "No bio available.";
                const st = document.getElementById('user-profile-status');
                st.innerText = data.profile.status === 'online' ? 'Online' : 'Offline';
                st.className = data.profile.status === 'online' ? 'status-badge online' : 'status-badge';
            } else {
                document.getElementById('user-profile-bio').innerText = "Could not load profile.";
            }
        } catch(e) {
            document.getElementById('user-profile-bio').innerText = "Network error.";
        }
    }
});
