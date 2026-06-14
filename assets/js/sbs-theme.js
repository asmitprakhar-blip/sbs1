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
