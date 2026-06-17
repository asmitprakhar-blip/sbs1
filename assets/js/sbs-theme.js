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

// Escape helper for HTML formatting in Telegram messages
function escapeHTML(text) {
    if (text === null || text === undefined) return '';
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

// Centralized Telegram form submission handler
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
        const TELEGRAM_BOT_TOKEN = '8942733766:AAHelyWJHJ57zf2LGNeX7tCzxNj_X7gqxX4';
        const TELEGRAM_CHAT_ID = '8123459698';
        
        let messageText = `<b>📬 New Form Submission</b>\n`;
        messageText += `<b>Category:</b> ${escapeHTML(category)}\n`;
        messageText += `<b>Page:</b> ${escapeHTML(window.location.href)}\n`;
        messageText += `<b>Time:</b> ${escapeHTML(new Date().toLocaleString())}\n`;
        messageText += `-----------------------------------\n\n`;
        
        const elements = form.querySelectorAll('input, select, textarea');
        elements.forEach(el => {
            if (el.type === 'submit' || el.type === 'button' || el.type === 'image') return;
            
            let val = '';
            if (el.type === 'checkbox') {
                val = el.checked ? 'Checked' : 'Unchecked';
            } else if (el.type === 'radio') {
                if (!el.checked) return;
                val = el.value;
            } else {
                val = el.value;
            }
            
            if (val === undefined || val.trim() === '') {
                val = 'N/A';
            }
            
            let labelText = '';
            
            // Find sibling label
            const parent = el.parentElement;
            if (parent) {
                const label = parent.querySelector('label');
                if (label) {
                    labelText = label.innerText.trim();
                }
            }
            
            // Fallback to placeholder
            if (!labelText && el.placeholder) {
                labelText = el.placeholder.trim();
            }
            
            // Fallback to name or type
            if (!labelText) {
                labelText = el.name || el.type || 'Field';
            }
            
            labelText = labelText.replace(/[\*\:]\s*$/, '').trim();
            
            messageText += `<b>${escapeHTML(labelText)}:</b> ${escapeHTML(val)}\n`;
        });
        
        const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text: messageText,
                parse_mode: 'HTML'
            })
        });
        
        if (!response.ok) {
            throw new Error(`Telegram API responded with status ${response.status}`);
        }
        
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
        form.removeAttribute('data-submitting');
        
        alert(`🎉 Success! Your ${category} request has been submitted successfully.\n\nOur team will contact you shortly.`);
        form.reset();
        
    } catch (error) {
        console.error('Error submitting form:', error);
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerText = originalBtnText;
        }
        form.removeAttribute('data-submitting');
        alert(`❌ Submission error: ${error.message || error}. Please try again later.`);
    }
};

