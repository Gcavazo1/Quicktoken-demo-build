import React, { createContext, useContext, useState, useEffect } from 'react';

// Define the theme options
export type ThemeType = 'light' | 'dark';

// Define the context shape
interface ThemeContextType {
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  toggleTheme: () => void;
}

// Create the context with default values
const ThemeContext = createContext<ThemeContextType>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

// Hook for easy context use
export const useTheme = () => useContext(ThemeContext);

// Check if code is running in browser environment
const isClient = typeof window !== 'undefined';

// Function to apply theme styles directly
const applyThemeToDOM = (theme: ThemeType) => {
  if (!isClient) return;
  
  const root = document.documentElement;
  
  // Save to localStorage
  localStorage.setItem('quicktoken_theme', theme);
  
  // Apply dark class to html element for Tailwind's dark mode
  if (theme === 'dark') {
    root.classList.add('dark');
    // Force the body to have dark background immediately
    document.body.style.backgroundColor = '#121212';
    document.body.style.color = '#e0e0e0';
  } else {
    root.classList.remove('dark');
    // Reset body styles
    document.body.style.backgroundColor = '';
    document.body.style.color = '';
  }
  
  // Set data attribute for CSS selectors
  root.setAttribute('data-theme', theme);
  
  // Apply CSS variables based on theme
  if (theme === 'dark') {
    // Dark theme variables
    root.style.setProperty('--bg-primary', '#121212');
    root.style.setProperty('--bg-secondary', '#1e1e1e');
    root.style.setProperty('--bg-tertiary', '#2e2e2e');
    root.style.setProperty('--text-primary', '#e0e0e0');
    root.style.setProperty('--text-secondary', '#a0a0a0');
    root.style.setProperty('--border-color', '#3e3e3e');
    root.style.setProperty('--input-bg', '#2a2a2a');
    root.style.setProperty('--card-bg', '#252525');
    root.style.setProperty('--hover-bg', '#333333');
  } else {
    // Light theme variables
    root.style.setProperty('--bg-primary', '#f9fafb');
    root.style.setProperty('--bg-secondary', '#ffffff');
    root.style.setProperty('--bg-tertiary', '#f3f4f6');
    root.style.setProperty('--text-primary', '#111827');
    root.style.setProperty('--text-secondary', '#6b7280');
    root.style.setProperty('--border-color', '#e5e7eb');
    root.style.setProperty('--input-bg', '#ffffff');
    root.style.setProperty('--card-bg', '#ffffff');
    root.style.setProperty('--hover-bg', '#f3f4f6');
  }
  
  // Common theme elements (accent colors, etc.) remain the same
  root.style.setProperty('--primary-blue', '#3b82f6');
  root.style.setProperty('--primary-hover', '#2563eb');
};

// Theme provider component
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with default 'light' theme - real theme will be set in useEffect
  const [theme, setTheme] = useState<ThemeType>('light');
  
  // Initialize theme on component mount (client-side only)
  useEffect(() => {
    if (!isClient) return;
    
    try {
      // Check if we're in the setup wizard by checking the URL
      const isSetupWizard = window.location.pathname.includes('setup') || 
                           !localStorage.getItem('quicktoken_setup_complete');
      
      // If in setup wizard, always use light theme
      if (isSetupWizard) {
        setTheme('light');
        applyThemeToDOM('light');
        return;
      }
      
      // Try to get theme from config only if not in setup wizard
      const configString = localStorage.getItem('quicktoken_config');
      if (configString) {
        const config = JSON.parse(configString);
        if (config && config.theme && config.theme === 'dark') {
          setTheme('dark');
          applyThemeToDOM('dark');
          return;
        }
      }
      
      // Fall back to direct theme storage only if not in setup wizard
      const savedTheme = localStorage.getItem('quicktoken_theme');
      if (savedTheme === 'dark') {
        setTheme('dark');
        applyThemeToDOM('dark');
        return;
      }
      
      // In all other cases, default to light theme
      setTheme('light');
      applyThemeToDOM('light');
    } catch (err) {
      console.error('Error initializing theme:', err);
      // Ensure light theme is applied even in case of errors
      setTheme('light');
      applyThemeToDOM('light');
    }
  }, []);
  
  // Apply theme changes to the document
  useEffect(() => {
    if (isClient) {
      applyThemeToDOM(theme);
    }
  }, [theme]);
  
  // Toggle between light and dark themes
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider; 