// Frame-busting check: mitigate clickjacking attacks
if (window.top && window.top !== window.self) {
  window.top.location.href = window.self.location.href;
}

// Pre-render theme initialization: prevents Flash of Unstyled Theme (FOUC)
(function () {
  try {
    const savedTheme = localStorage.getItem('theme') || 'system';
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (savedTheme === 'system' && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  } catch (e) {
    // Graceful fallback if localStorage is disabled
  }
})();
