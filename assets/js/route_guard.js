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
        "sponsorship.html",
        "book_stall.html",
        "login.html",
        "register.html",
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
        "sponsorship.html",
        "book_stall.html",
        "login.html",
        "register.html",
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
    let userProfile = null;
    try {
        const { data: { session } } = await client.auth.getSession();
        user = session ? session.user : null;
        
        if (user) {
            if (window.authAPI) {
                userProfile = await window.authAPI.getUserProfile(user.id);
            } else {
                const { data } = await client.from('user_profiles').select('*').eq('id', user.id).single();
                userProfile = data;
            }
        }
    } catch (err) {
        console.error("Failed to retrieve user session / profile for navbar:", err);
    }

    // Dynamic navbar state sync for authenticated sessions
    if (user) {
        const name = userProfile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Member';
        const avatar = userProfile?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
        
        const updateNavbar = () => {
            const loginLinks = document.querySelectorAll('a[href="login.html"], a[href*="login.html"]');
            loginLinks.forEach(link => {
                link.href = 'dashboard.html';
                link.innerHTML = `
                    <span class="custom-nav-profile" style="display: inline-flex; align-items: center; gap: 8px; vertical-align: middle;">
                        <img src="${avatar}" style="width: 24px; height: 24px; border-radius: 50% !important; object-fit: cover; border: 1.5px solid #000000; background: #ffffff; flex-shrink: 0;" alt="Avatar">
                        <span class="custom-nav-name" style="font-weight: 600; font-family: inherit; font-size: inherit; text-transform: uppercase; max-width: 110px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${name}</span>
                    </span>
                `;
                
                const li = link.closest('li');
                if (li && li.parentNode) {
                    const existingLogout = li.parentNode.querySelector('.dynamic-logout-item');
                    if (!existingLogout) {
                        const logoutLi = document.createElement('li');
                        logoutLi.className = li.className + ' dynamic-logout-item';
                        
                        const logoutLink = document.createElement('a');
                        logoutLink.href = '#';
                        logoutLink.className = link.className;
                        logoutLink.style.cssText = link.style.cssText;
                        logoutLink.innerHTML = 'Logout';
                        logoutLink.addEventListener('click', async (e) => {
                            e.preventDefault();
                            if (window.authAPI) {
                                await window.authAPI.logout();
                            } else {
                                try {
                                    await client.auth.signOut();
                                } catch (err) {
                                    console.error("SignOut fallback failed:", err);
                                }
                                window.location.href = 'index.html';
                            }
                        });
                        
                        logoutLi.appendChild(logoutLink);
                        li.parentNode.insertBefore(logoutLi, li.nextSibling);
                    }
                }
            });
        };
        updateNavbar();
    }
    
    if (!isPublic) {
        // Protected route execution
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        
        // If accessing admin page, verify admin role status
        if (page === 'admin.html') {
            if (window.authAPI) {
                const profile = await window.authAPI.getUserProfile(user.id);
                if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
                    window.location.href = 'index.html';
                    return;
                }
                if (profile.account_status === 'suspended') {
                    alert("Your account is suspended. Please contact support.");
                    await window.authAPI.logout();
                    return;
                }
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
            
            // Bypass gate and show main content directly
            if (gate) gate.style.display = 'none';
            if (mainContent) mainContent.style.display = 'block';
            
            hideLoader();
        } else {
            // Other public pages (about.html, login.html etc.)
            hideLoader();
        }
    }
});
