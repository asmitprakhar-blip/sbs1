// Startup Business Summit 2026 - Authentication & Auth Guard System
// Dependencies: Supabase JS SDK (CDN) and assets/js/supabase.js (initializes window.supabaseClient)

const ROLE_DASHBOARD_MAP = {
    'attendee': 'attendee-dashboard.html',
    'startup': 'startup-dashboard.html',
    'investor': 'investor-dashboard.html',
    'speaker': 'speaker-dashboard.html',
    'sponsor': 'sponsor-dashboard.html',
    'exhibitor': 'exhibitor-dashboard.html',
    'admin': 'admin.html',
    'super_admin': 'admin.html'
};

// Get current session user
async function getCurrentUser() {
    if (!window.supabaseClient) {
        console.error("Supabase client is not initialized.");
        return null;
    }
    try {
        const { data: { user }, error } = await window.supabaseClient.auth.getUser();
        if (error) {
            if (error.message && error.message.includes("Auth session missing")) return null;
            throw error;
        }
        return user;
    } catch (err) {
        console.error("Error getting current user:", err);
        return null;
    }
}

// Fetch user profile from public.user_profiles
async function getUserProfile(userId) {
    if (!window.supabaseClient) return null;
    try {
        const { data, error } = await window.supabaseClient
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    } catch (err) {
        console.error("Error fetching user profile:", err);
        return null;
    }
}

// Check if user is logged in
async function isLoggedIn() {
    const user = await getCurrentUser();
    return !!user;
}

// Logout user and clear session
async function logout() {
    if (!window.supabaseClient) return;
    try {
        const { error } = await window.supabaseClient.auth.signOut();
        if (error) throw error;
        window.location.href = 'index.html';
    } catch (err) {
        console.error("Error during logout:", err);
        window.location.href = 'index.html';
    }
}

// Redirect unauthorized users to login.html
async function redirectIfUnauthorized(allowedRoles = []) {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    
    const profile = await getUserProfile(user.id);
    if (!profile) {
        // Sign out if profile is missing
        await logout();
        return;
    }
    
    
    // Block suspended accounts
    if (profile.account_status === 'suspended') {
        alert("Your account has been suspended. Please contact support.");
        await logout();
        return;
    }
    
    // Role-based restrictions check
    if (allowedRoles.length > 0 && !allowedRoles.includes(profile.role)) {
        // Redirect to authorized default page
        const dashboard = ROLE_DASHBOARD_MAP[profile.role] || 'attendee-dashboard.html';
        window.location.href = dashboard;
    }
}

// Redirect logged-in users to their role dashboard
async function redirectIfAuthorized() {
    const user = await getCurrentUser();
    if (user) {
        const profile = await getUserProfile(user.id);
        if (profile) {
            
            if (profile.account_status === 'suspended') return;
            
            const dashboard = ROLE_DASHBOARD_MAP[profile.role] || 'attendee-dashboard.html';
            window.location.href = dashboard;
        }
    }
}

// Export functions globally
window.authAPI = {
    getCurrentUser,
    getUserProfile,
    isLoggedIn,
    logout,
    redirectIfUnauthorized,
    redirectIfAuthorized,
    ROLE_DASHBOARD_MAP
};
