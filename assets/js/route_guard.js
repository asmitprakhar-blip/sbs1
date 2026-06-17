// Startup Business Summit 2026 - Route Guard and Page Access Controller
// Protects internal routes and toggles homepage gate based on Supabase Auth session

(function() {
    // 1. Synchronously execute in <head> to avoid Flash of Unauthenticated Content (FOUC)
    const path = window.location.pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const page = segments[segments.length - 1] || "";
    
    const publicPages = [
        "",
        "index.html",
        "about.html",
        "speakers.html",
        "login.html",
        "register-account.html",
        "forgot-password.html",
        "reset-password.html",
        "verify-email.html"
    ];
    
    const isPublic = publicPages.includes(page);
    
    if (!isPublic) {
        document.documentElement.classList.add('gated-hidden-root');
        const style = document.createElement('style');
        style.id = 'gated-security-style';
        style.innerHTML = '.gated-hidden-root body { display: none !important; }';
        document.head.appendChild(style);
    }
})();

// Helper to check and resolve user session
document.addEventListener('DOMContentLoaded', async () => {
    const path = window.location.pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const page = segments[segments.length - 1] || "";
    
    const publicPages = [
        "",
        "index.html",
        "about.html",
        "speakers.html",
        "login.html",
        "register-account.html",
        "forgot-password.html",
        "reset-password.html",
        "verify-email.html"
    ];
    
    const isPublic = publicPages.includes(page);
    const client = window.supabaseClient;
    
    // Default loader transition helper
    const hideLoader = () => {
        const loader = document.getElementById('homepage-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => loader.remove(), 300);
        }
    };

    // Countdown Timer logic for premium Launch Gate
    function startCountdown() {
        const targetDate = new Date("July 19, 2026 00:00:00").getTime();
        
        const updateTimer = () => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            
            const daysEl = document.getElementById("days");
            const hoursEl = document.getElementById("hours");
            const minutesEl = document.getElementById("minutes");
            const secondsEl = document.getElementById("seconds");
            
            if (distance < 0) {
                clearInterval(interval);
                if (daysEl) daysEl.innerText = "00";
                if (hoursEl) hoursEl.innerText = "00";
                if (minutesEl) minutesEl.innerText = "00";
                if (secondsEl) secondsEl.innerText = "00";
                return;
            }
            
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            
            if (daysEl) daysEl.innerText = String(days).padStart(2, '0');
            if (hoursEl) hoursEl.innerText = String(hours).padStart(2, '0');
            if (minutesEl) minutesEl.innerText = String(minutes).padStart(2, '0');
            if (secondsEl) secondsEl.innerText = String(seconds).padStart(2, '0');
        };
        
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
    }
    
    if (!client) {
        console.error("Supabase Client is not initialized.");
        hideLoader();
        if (!isPublic) {
            window.location.href = 'index.html';
        }
        return;
    }
    
    let user = null;
    try {
        const { data: { session } } = await client.auth.getSession();
        user = session ? session.user : null;
    } catch (err) {
        console.error("Failed to retrieve user session:", err);
    }
    
    if (!isPublic) {
        // Protected route execution
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // Verify user profile status
        if (window.authAPI) {
            const profile = await window.authAPI.getUserProfile(user.id);
            if (!profile) {
                window.location.href = 'index.html';
                return;
            }
            if (profile.account_status === 'suspended') {
                alert("Your account is suspended. Please contact support.");
                await window.authAPI.logout();
                return;
            }
        }
        
        // Remove protection styles to render page content
        document.documentElement.classList.remove('gated-hidden-root');
        const style = document.getElementById('gated-security-style');
        if (style) style.remove();
        hideLoader();
    } else {
        // Public route execution
        if (page === "" || page === "index.html") {
            const gate = document.getElementById('homepage-gate');
            const mainContent = document.getElementById('main-website-content');
            
            if (user) {
                let hasProfile = true;
                if (window.authAPI) {
                    const profile = await window.authAPI.getUserProfile(user.id);
                    if (!profile) {
                        hasProfile = false;
                    }
                }
                
                if (hasProfile) {
                    // Authorized: Show website contents
                    if (gate) gate.style.display = 'none';
                    if (mainContent) mainContent.style.display = 'block';
                } else {
                    // Sign out and reload if profile is missing
                    if (window.supabaseClient) {
                        await window.supabaseClient.auth.signOut();
                    }
                    window.location.reload();
                    return;
                }
            } else {
                // Not authenticated: Enforce launch gate layout only
                if (gate) gate.style.display = 'block';
                if (mainContent) mainContent.style.display = 'none';
                startCountdown();
            }
            hideLoader();
        } else {
            // Other public pages (about.html, speakers.html, login.html etc.)
            hideLoader();
        }
    }
});
