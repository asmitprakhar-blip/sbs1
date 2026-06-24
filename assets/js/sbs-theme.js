(function() {
    function setupCustomMobileMenu() {
        // Prevent duplicate injection
        if (document.getElementById('custom-mobile-header')) return;

        // Create custom mobile header
        var header = document.createElement('div');
        header.id = 'custom-mobile-header';
        header.innerHTML = `
            <a href="index.html" class="mobile-logo">
                <img src="assets/images/sbs_logo.png" alt="Startup Business Summit Logo">
            </a>
            <button id="mobile-menu-toggle" aria-label="Toggle Menu">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
        `;
        
        // Create custom mobile menu overlay
        var menu = document.createElement('div');
        menu.id = 'custom-mobile-menu';
        menu.innerHTML = `
            <div class="mobile-menu-header">
                <img src="assets/images/sbs_logo.png" alt="Logo" class="mobile-menu-logo">
                <button id="mobile-menu-close" aria-label="Close Menu">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
            <ul class="mobile-menu-links">
                <li><a href="index.html">Home</a></li>
                <li><a href="about.html">About</a></li>
                <li><a href="register.html">Register</a></li>
                <li><a href="speakers.html">Speakers</a></li>
                <li><a href="sponsorship.html">Sponsorship</a></li>
                <li class="auth-dependent-link"><a href="login.html">Login / Register</a></li>
            </ul>
        `;
        
        // Try inserting it at the correct position (before original header)
        var originalHeader = document.getElementById('top_navbar_box_custom');
        if (originalHeader) {
            originalHeader.parentNode.insertBefore(header, originalHeader);
        } else {
            // Fallback: prepend to body
            document.body.insertBefore(header, document.body.firstChild);
        }
        
        // Append menu overlay to body
        document.body.appendChild(menu);
        
        // Setup toggle event listeners
        var toggleBtn = document.getElementById('mobile-menu-toggle');
        var closeBtn = document.getElementById('mobile-menu-close');
        
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.add('active');
                document.body.style.overflow = 'hidden'; // prevent page scrolling when menu is open
            });
        }
        
        if (closeBtn) {
            closeBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        }

        // Close menu on link click
        var menuLinks = menu.querySelectorAll('.mobile-menu-links a');
        menuLinks.forEach(function(link) {
            link.addEventListener('click', function() {
                menu.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", setupCustomMobileMenu);
    } else {
        setupCustomMobileMenu();
    }
})();

// Category to Supabase table mapping
const CATEGORY_TABLE_MAP = {
    'Early Bird Ticket Registration': 'ticket_registrations',
    'Reserve Early Access': 'ticket_registrations',
    'Exhibitor Registration': 'exhibitor_bookings',
    'Award Nomination': 'award_nominations',
    'Speaker & Stage Pitch Application': 'presenter_applications',
    'Panelist Application': 'presenter_applications',
    'Sponsorship Inquiry': 'sponsorship_inquiries',
    'Designated Partner Registration': 'partnership_registrations',
    'Startup Launch Platform Application': 'launch_platform_applications'
};

// Centralized form submission handler hooking into Supabase
window.handleFormSubmit = async function(event, category) {
    event.preventDefault();
    const form = event.target;
    
    // Check authentication first to enforce signup/signin before submitting forms
    let loggedIn = false;
    if (window.authAPI) {
        loggedIn = await window.authAPI.isLoggedIn();
    }
    if (!loggedIn) {
        window.showAuthModal(
            "Authentication Required",
            "You must create an account or sign in before submitting any forms on the website.",
            "fa-circle-exclamation"
        );
        return;
    }
    
    // Prevent double submission
    if (form.dataset.submitting === 'true') return;
    form.dataset.submitting = 'true';
    
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.innerText : 'Submit';
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerText = 'Submitting...';
    }
    
    try {
        const dbTable = CATEGORY_TABLE_MAP[category];
        if (!dbTable) {
            throw new Error(`Unmapped submission category: ${category}`);
        }

        // 1. Gather form fields matching schema name attributes
        const formData = {};
        const elements = form.querySelectorAll('input, select, textarea');
        
        elements.forEach(el => {
            if (el.type === 'submit' || el.type === 'button' || el.type === 'image') return;
            if (el.name) {
                if (el.type === 'checkbox') {
                    formData[el.name] = el.checked;
                } else if (el.type === 'radio') {
                    if (el.checked) formData[el.name] = el.value;
                } else if (el.type === 'number') {
                    formData[el.name] = parseInt(el.value, 10) || 0;
                } else {
                    formData[el.name] = el.value;
                }
            }
        });

        // Add default columns for public submission
        formData.source = 'website';
        formData.submission_status = 'new';
        formData.is_deleted = false;

        // Custom mapping specifics based on category
        if (category === 'Speaker & Stage Pitch Application') {
            formData.role_type = form.querySelector('[name="role_type"]')?.value || 'speaker';
        } else if (category === 'Panelist Application') {
            formData.role_type = form.querySelector('[name="role_type"]')?.value || 'panelist';
        } else if (category === 'Early Bird Ticket Registration') {
            formData.source_page = 'register_page';
            formData.quantity = 1;
        } else if (category === 'Reserve Early Access') {
            formData.source_page = 'sponsorship_page';
        }

        const email = formData.email;

        // 2. Duplicate email check
        if (email && window.supabaseAPI) {
            const isDuplicate = await window.supabaseAPI.checkDuplicateEmail(dbTable, email);
            if (isDuplicate) {
                alert(`❌ Duplicate Application:\nAn application with email "${email}" has already been submitted.`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
                form.removeAttribute('data-submitting');
                return;
            }
        }

        // 3. Send data to Supabase Database
        if (window.supabaseAPI) {
            const { data, error } = await window.supabaseAPI.submitFormToSupabase(dbTable, formData);
            if (error) throw error;
        } else {
            console.warn("Supabase SDK API wrapper is not initialized. Skipping database write.");
        }

        // Success Alert and Reset Form
        alert("Thank you. Your submission has been received successfully.");
        
        if (category === 'Early Bird Ticket Registration' || category === 'Exhibitor Registration') {
            const wantAccount = confirm("Would you like to create a password to access your personal dashboard portal?");
            if (wantAccount) {
                const queryParams = new URLSearchParams({
                    email: formData.email || '',
                    name: formData.full_name || '',
                    phone: formData.phone || '',
                    org: formData.organization_name || '',
                    role: category === 'Exhibitor Registration' ? 'exhibitor' : 'attendee'
                });
                window.location.href = `register-account.html?${queryParams.toString()}`;
                return;
            }
        }
        
        form.reset();
        
    } catch (error) {
        console.error('Submission error:', error);
        alert(`❌ Submission error: ${error.message || error}. Please try again later.`);
    } finally {
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
        form.removeAttribute('data-submitting');
    }
};

// Dynamic File Uploading wrapper injection
document.addEventListener('DOMContentLoaded', () => {
    const urlInputs = document.querySelectorAll('input[type="url"], input[placeholder*="URL"], input[placeholder*="Link"], input[placeholder*="Deck"]');
    
    urlInputs.forEach(input => {
        // Flexbox wrapper setup
        const wrapper = document.createElement('div');
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.width = '100%';
        wrapper.style.gap = '8px';
        wrapper.style.marginTop = '4px';
        
        // Setup upload trigger button matching theme styles
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.innerText = '📤 Upload File';
        btn.style.padding = '10px 16px';
        btn.style.fontSize = '13px';
        btn.style.fontWeight = '600';
        btn.style.borderRadius = '8px';
        btn.style.border = '1px solid #cbd5e1';
        btn.style.background = '#f8fafc';
        btn.style.color = '#0c1a30';
        btn.style.cursor = 'pointer';
        btn.style.whiteSpace = 'nowrap';
        btn.style.transition = 'all 0.2s';
        
        btn.onmouseover = () => { btn.style.background = '#cbd5e1'; };
        btn.onmouseout = () => { btn.style.background = '#f8fafc'; };
        
        // Rearrange DOM nodes
        input.parentNode.insertBefore(wrapper, input);
        wrapper.appendChild(input);
        wrapper.appendChild(btn);
        
        // Connect Upload click trigger
        btn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = '.pdf,.ppt,.pptx,.png,.jpg,.jpeg,.doc,.docx';
            
            fileInput.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                
                // Block extremely large uploads (e.g. >15MB)
                if (file.size > 15 * 1024 * 1024) {
                    alert('❌ File exceeds limit: Maximum size allowed is 15MB.');
                    return;
                }
                
                btn.innerText = 'Uploading...';
                btn.disabled = true;
                
                // Select appropriate bucket matching properties
                let bucket = 'pitch_decks';
                const inputName = (input.name || '').toLowerCase();
                const placeholderText = (input.placeholder || '').toLowerCase();
                
                if (inputName.includes('logo') || placeholderText.includes('logo')) {
                    bucket = 'company_logos';
                } else if (inputName.includes('profile') || inputName.includes('speaker') || placeholderText.includes('profile')) {
                    bucket = 'speaker_profiles';
                } else if (inputName.includes('award') || inputName.includes('document') || placeholderText.includes('document')) {
                    bucket = 'award_documents';
                }
                
                try {
                    if (!window.supabaseAPI) {
                        throw new Error("Supabase integration libraries not loaded.");
                    }
                    const publicUrl = await window.supabaseAPI.uploadFileToStorage(bucket, file);
                    input.value = publicUrl;
                    btn.innerText = '✅ Uploaded';
                    btn.style.background = '#22c55e';
                    btn.style.color = '#ffffff';
                } catch (err) {
                    alert('❌ Upload failed: ' + (err.message || err));
                    btn.innerText = '📤 Upload File';
                } finally {
                    btn.disabled = false;
                }
            };
            fileInput.click();
        });
    });
});

// Custom Authentication Modal Display and Control System
window.showAuthModal = function(title, desc, iconClass = "fa-lock") {
    const modal = document.getElementById('auth-prompt-modal');
    if (modal) {
        const modalContent = modal.querySelector('.sbs-auth-modal-content');
        const modalTitle = document.getElementById('auth-modal-title');
        const modalDesc = document.getElementById('auth-modal-desc');
        const modalIcon = document.getElementById('auth-modal-icon');
        
        if (modalTitle) modalTitle.innerText = title;
        if (modalDesc) modalDesc.innerText = desc;
        if (modalIcon) modalIcon.className = `fa-solid ${iconClass}`;
        
        modal.style.display = 'flex';
        // Trigger reflow
        void modal.offsetWidth;
        modal.style.opacity = '1';
        if (modalContent) modalContent.style.transform = 'scale(1)';
        document.body.style.overflow = 'hidden';
    }
};

window.hideAuthModal = function() {
    const modal = document.getElementById('auth-prompt-modal');
    if (modal) {
        const modalContent = modal.querySelector('.sbs-auth-modal-content');
        modal.style.opacity = '0';
        if (modalContent) modalContent.style.transform = 'scale(0.9)';
        setTimeout(() => {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 300);
    }
};

// Modal trigger listeners & homepage guest lineups interaction
document.addEventListener('DOMContentLoaded', () => {
    // 1. Close button and backdrop click listeners
    const modal = document.getElementById('auth-prompt-modal');
    const closeBtn = document.getElementById('auth-prompt-modal-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.hideAuthModal();
        });
    }
    
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                window.hideAuthModal();
            }
        });
    }
    
    // 2. Show More Guests button handler on the homepage
    const showMoreBtn = document.getElementById('show-more-guests-btn');
    if (showMoreBtn) {
        showMoreBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            let loggedIn = false;
            if (window.authAPI) {
                loggedIn = await window.authAPI.isLoggedIn();
            }
            if (loggedIn) {
                window.location.href = 'speakers.html';
            } else {
                window.showAuthModal(
                    "Unlock Guest Lineup",
                    "Sign up or sign in to view the complete list of 50+ speakers, VIP guests, and government leaders.",
                    "fa-lock"
                );
            }
        });
    }
    
    // 3. Landing page popup trigger logic for unauthenticated users (shown once per session)
    const path = window.location.pathname.toLowerCase();
    const segments = path.split('/').filter(Boolean);
    const page = segments[segments.length - 1] || "";
    
    if (page === "" || page === "index.html") {
        setTimeout(async () => {
            let loggedIn = false;
            if (window.authAPI) {
                loggedIn = await window.authAPI.isLoggedIn();
            }
            if (!loggedIn) {
                const hasPopupBeenShown = sessionStorage.getItem('sbs_landing_popup_shown');
                if (!hasPopupBeenShown) {
                    window.showAuthModal(
                        "Welcome to SBS 2026",
                        "Join thousands of innovators, startups, exhibitors, and investors at India's largest networking summit. Sign up or log in to get your pass and unlock all features.",
                        "fa-rocket"
                    );
                    sessionStorage.setItem('sbs_landing_popup_shown', 'true');
                }
            }
        }, 1200);
    }

    // 4. Form/Grid/Dashboard Blurring & Lock Overlay Logic for unauthenticated users
    setTimeout(async () => {
        let loggedIn = false;
        if (window.authAPI) {
            loggedIn = await window.authAPI.isLoggedIn();
        }
        
        if (!loggedIn) {
            // Dynamically inject FontAwesome CDN if not already present
            if (!document.querySelector('link[href*="font-awesome"]') && !document.querySelector('link[href*="all.min.css"]')) {
                const faLink = document.createElement('link');
                faLink.rel = 'stylesheet';
                faLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css';
                document.head.appendChild(faLink);
            }
            const pageName = window.location.pathname.split('/').pop().toLowerCase();
            // Skip auth pages entirely just to be safe
            if (['login.html', 'register-account.html', 'forgot-password.html', 'reset-password.html', 'verify-email.html'].includes(pageName)) {
                return;
            }

            // Helper to inject a highly premium dark glassmorphism block overlay card
            const applyLockOverlay = (targetEl, options = {}) => {
                if (!targetEl || targetEl.parentNode.classList.contains('sbs-lock-wrapper')) return;

                const wrapper = document.createElement('div');
                wrapper.className = 'sbs-lock-wrapper ' + (options.wrapperClass || '');
                wrapper.style.cssText = `
                    position: relative;
                    width: 100%;
                    max-height: ${options.maxHeight || '380px'};
                    overflow: hidden;
                    border-radius: ${options.borderRadius || '24px'};
                    margin-bottom: ${options.marginBottom || '30px'};
                    border: 1px solid rgba(226, 232, 240, 0.8);
                    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.02);
                    transition: all 0.3s ease;
                `;

                targetEl.parentNode.insertBefore(wrapper, targetEl);
                wrapper.appendChild(targetEl);

                // Apply blur and disable pointer actions
                targetEl.style.filter = `blur(${options.blurAmt || '12px'})`;
                targetEl.style.pointerEvents = 'none';
                targetEl.style.userSelect = 'none';

                // Create a fade-out gradient overlay at the bottom
                const fadeOut = document.createElement('div');
                fadeOut.style.cssText = `
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: ${options.fadeHeight || '160px'};
                    background: linear-gradient(to bottom, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.95) 70%, #ffffff 100%);
                    pointer-events: none;
                    z-index: 4;
                `;
                wrapper.appendChild(fadeOut);

                // Create center lock card overlay
                const overlay = document.createElement('div');
                overlay.className = 'sbs-lock-overlay';
                overlay.style.cssText = `
                    position: absolute;
                    inset: 0;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(15, 23, 42, 0.03);
                    z-index: 10;
                    backdrop-filter: blur(2px);
                    -webkit-backdrop-filter: blur(2px);
                `;

                overlay.innerHTML = `
                    <div style="background: linear-gradient(145deg, #0b1329 0%, #030712 100%); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 24px; padding: 40px 30px; max-width: ${options.cardMaxWidth || '450px'}; box-shadow: 0 25px 60px -15px rgba(0,0,0,0.85); color: #ffffff; box-sizing: border-box; width: 92%; text-align: center; display: inline-block; transform: scale(1); animation: sbs-fade-in-up 0.5s cubic-bezier(0.16, 1, 0.3, 1);">
                        <div style="width: 64px; height: 64px; border-radius: 50%; background: rgba(127, 0, 255, 0.12); border: 2px solid #7f00ff; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 22px; box-shadow: 0 0 25px rgba(127, 0, 255, 0.35);">
                            <i class="fa-solid fa-lock" style="font-size: 26px; color: #00f2fe;"></i>
                        </div>
                        <h3 style="font-size: 23px; font-weight: 800; margin: 0 0 10px 0; font-family: 'Outfit', sans-serif; color: #ffffff !important; letter-spacing: -0.5px;">${options.title || 'Access Restricted'}</h3>
                        <p style="font-size: 14.5px; color: #94a3b8; line-height: 1.6; margin: 0 0 28px 0; font-family: 'Inter', sans-serif;">${options.description || 'Create an account or login to access all privileges.'}</p>
                        <div style="display: flex; gap: 14px; justify-content: center; width: 100%;">
                            <a href="register-account.html" style="text-decoration: none; flex: 1;">
                                <button type="button" style="width: 100%; padding: 13px 20px; background: linear-gradient(135deg, #7f00ff 0%, #0072ff 100%) !important; color: white !important; font-size: 13.5px; font-weight: 700; border-radius: 30px !important; border: none !important; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 15px rgba(127, 0, 255, 0.3) !important; transition: all 0.3s; line-height: 1.2 !important; display: inline-block;">Register</button>
                            </a>
                            <a href="login.html" style="text-decoration: none; flex: 1;">
                                <button type="button" style="width: 100%; padding: 13px 20px; background: transparent !important; color: white !important; font-size: 13.5px; font-weight: 700; border-radius: 30px !important; border: 2px solid #0072ff !important; cursor: pointer; text-transform: uppercase; letter-spacing: 1px; transition: all 0.3s; line-height: 1.2 !important; display: inline-block;">Login</button>
                            </a>
                        </div>
                    </div>
                `;

                wrapper.appendChild(overlay);
            };

            // Inject simple style for CSS animation if not already injected
            if (!document.getElementById('sbs-lock-animations')) {
                const styleEl = document.createElement('style');
                styleEl.id = 'sbs-lock-animations';
                styleEl.innerHTML = `
                    @keyframes sbs-fade-in-up {
                        from { opacity: 0; transform: translateY(20px) scale(0.96); }
                        to { opacity: 1; transform: translateY(0) scale(1); }
                    }
                `;
                document.head.appendChild(styleEl);
            }

            // 1. Lock the Tab Dashboard container on sponsorship.html (keeps the page neat and short!)
            const dashboardContainer = document.querySelector('.sbs-dashboard-container');
            if (dashboardContainer) {
                applyLockOverlay(dashboardContainer, {
                    maxHeight: '480px',
                    blurAmt: '12px',
                    title: 'Event Participation Gated',
                    description: 'Create an account or login to access tickets, corporate sponsorships, award nominations, presenter requests, and startup launch platform slots.',
                    cardMaxWidth: '500px',
                    wrapperClass: 'dashboard-lock'
                });
            }

            // 2. Lock the Register page card (on register.html)
            const registerCard = document.querySelector('.sbs-register-card');
            if (registerCard) {
                applyLockOverlay(registerCard, {
                    maxHeight: '380px',
                    blurAmt: '12px',
                    title: 'Registration Gated',
                    description: 'Join thousands of innovators and book your general entry or premium VIP passes. Please sign in or register to get started.',
                    wrapperClass: 'form-lock'
                });
            }

            // 3. Lock the Stall Booking form container section (on book_stall.html)
            const bookingFormSection = document.getElementById('booking-form');
            if (bookingFormSection) {
                // Wrap the inner card div to keep background rounded borders clean
                const innerCard = bookingFormSection.querySelector('div');
                if (innerCard) {
                    applyLockOverlay(innerCard, {
                        maxHeight: '360px',
                        blurAmt: '12px',
                        title: 'Stall Booking Gated',
                        description: 'Reserve your booth, showcase innovation, and scale B2B partnerships at Bharat Mandapam. Sign in or register to request exhibition spaces.',
                        wrapperClass: 'form-lock'
                    });
                }
            }

            // 4. Lock the Speakers grid (on speakers.html)
            const speakersGrid = document.getElementById('speakers-grid');
            if (speakersGrid) {
                // Secure by stripping all real names, descriptions, images and badges from the DOM for unauthenticated users
                const speakerCards = speakersGrid.querySelectorAll('.sbs-speaker-card, .speaker-item');
                speakerCards.forEach((card, index) => {
                    if (index >= 4) {
                        card.remove(); // Remove extra cards to shorten the page length completely
                        return;
                    }
                    // Obfuscate the visible preview cards so no data is inspectable/bypassable
                    const nameEl = card.querySelector('h3');
                    if (nameEl) nameEl.innerText = "VIP Guest Speaker";
                    
                    const descEl = card.querySelector('p');
                    if (descEl) descEl.innerText = "Unicorn Founder / Industry Leader";
                    
                    const imgEl = card.querySelector('img');
                    if (imgEl) {
                        imgEl.src = 'https://api.dicebear.com/7.x/initials/svg?seed=VIP&backgroundColor=0c1a30&textColor=00f2fe';
                    }
                    
                    const badgeEl = card.querySelector('span');
                    if (badgeEl) {
                        badgeEl.innerText = "LOCKED";
                        badgeEl.style.background = 'rgba(239, 68, 68, 0.1)';
                        badgeEl.style.color = '#ef4444';
                        badgeEl.style.border = 'none';
                    }
                });

                applyLockOverlay(speakersGrid, {
                    maxHeight: '380px',
                    blurAmt: '12px',
                    title: 'Guest Lineup Locked',
                    description: 'Please create an account or sign in to view the complete lineup of 50+ VIP speakers, unicorn founders, and government leaders.',
                    wrapperClass: 'speakers-lock'
                });

                // Also blur speakers page category filter buttons if present
                const filtersContainer = document.querySelector('.speakers-filter-container, #speakers .filter-btn-group');
                if (filtersContainer) {
                    filtersContainer.style.filter = 'blur(5px)';
                    filtersContainer.style.pointerEvents = 'none';
                    filtersContainer.style.userSelect = 'none';
                }
            }
        }
    }, 500);
});
