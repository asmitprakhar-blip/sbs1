(function() {
    function initMobileMenu() {
        var toggles = document.querySelectorAll(".elementor-menu-toggle");
        toggles.forEach(function(toggle) {
            // Remove existing event listeners by replacing with a clone
            var newToggle = toggle.cloneNode(true);
            if (toggle.parentNode) {
                toggle.parentNode.replaceChild(newToggle, toggle);
            }
            
            newToggle.addEventListener("click", function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                var isActive = this.classList.contains("elementor-active");
                var dropdown = this.nextElementSibling;
                
                if (isActive) {
                    this.classList.remove("elementor-active");
                    this.setAttribute("aria-expanded", "false");
                    if (dropdown && dropdown.classList.contains("elementor-nav-menu--dropdown")) {
                        dropdown.classList.remove("elementor-active");
                        dropdown.setAttribute("aria-hidden", "true");
                        dropdown.style.setProperty("display", "none", "important");
                    }
                } else {
                    this.classList.add("elementor-active");
                    this.setAttribute("aria-expanded", "true");
                    if (dropdown && dropdown.classList.contains("elementor-nav-menu--dropdown")) {
                        dropdown.classList.add("elementor-active");
                        dropdown.setAttribute("aria-hidden", "false");
                        dropdown.style.setProperty("display", "block", "important");
                    }
                }
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initMobileMenu);
    } else {
        initMobileMenu();
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
