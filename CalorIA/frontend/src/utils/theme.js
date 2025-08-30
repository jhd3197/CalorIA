/**
 * Theme utility functions for managing dark mode
 */

/**
 * Get the current theme based on user preferences and system settings
 * @param {string} userTheme - User's theme preference ('light', 'dark', 'auto')
 * @returns {string} - The resolved theme ('light' or 'dark')
 */
export const getCurrentTheme = (userTheme) => {
  if (userTheme === 'auto') {
    // Check system preference
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return userTheme || 'light';
};

/**
 * Apply theme to the document
 * @param {string} theme - The theme to apply ('light' or 'dark')
 */
export const applyTheme = (theme) => {
  const root = document.documentElement;

  // Ensure we remove any existing theme classes first
  root.classList.remove('dark', 'light');

  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    // For light theme, we don't add 'light' class since Tailwind uses absence of 'dark' class
    // But we ensure 'dark' is removed
    root.classList.remove('dark');
  }

  // Store the current theme
  localStorage.setItem('current-theme', theme);

  // Force a repaint to ensure styles are applied immediately
  root.style.display = 'none';
  // Trigger reflow by accessing offsetHeight
  const _ = root.offsetHeight;
  root.style.display = '';
};

/**
 * Initialize theme on app load
 * @param {string} userTheme - User's theme preference
 */
export const initializeTheme = (userTheme) => {
  const theme = getCurrentTheme(userTheme);
  applyTheme(theme);
  return theme;
};

/**
 * Listen for system theme changes when user preference is 'auto'
 * @param {string} userTheme - User's theme preference
 * @param {function} onThemeChange - Callback when theme changes
 * @returns {function} - Cleanup function
 */
export const watchSystemTheme = (userTheme, onThemeChange) => {
  if (userTheme !== 'auto') return () => {};

  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const handleChange = (e) => {
    const newTheme = e.matches ? 'dark' : 'light';
    applyTheme(newTheme);
    onThemeChange(newTheme);
  };

  mediaQuery.addEventListener('change', handleChange);

  return () => {
    mediaQuery.removeEventListener('change', handleChange);
  };
};