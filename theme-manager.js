/**
 * Lead Machine Pro - Universal Theme Manager
 */

function initTheme() {
    const savedTheme = localStorage.getItem('lm_theme') || 'dark';
    applyTheme(savedTheme);

    const themeToggles = document.querySelectorAll('.theme-toggle-btn');
    themeToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const currentTheme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            applyTheme(newTheme);
        });
    });
}

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        localStorage.setItem('lm_theme', 'light');
    } else {
        document.body.classList.remove('light-theme');
        localStorage.setItem('lm_theme', 'dark');
    }

    // Update icons if using Lucide
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

// Auto-init on script load
document.addEventListener('DOMContentLoaded', initTheme);
