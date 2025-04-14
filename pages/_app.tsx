import '../styles/globals.css';
import type { AppProps } from 'next/app';
import AppProviders from '../admin-dashboard/src/contexts/AppProviders';
import { useEffect } from 'react';

// Script to apply dark theme immediately before React renders
const DarkModeScript = () => {
  useEffect(() => {
    // This runs client-side only
  }, []);

  // This script will be injected into the HTML and run immediately before React hydration
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              // Try to get theme from configuration object
              var configString = localStorage.getItem('quicktoken_config');
              var theme = null;
              
              if (configString) {
                var config = JSON.parse(configString);
                if (config && config.theme) {
                  theme = config.theme;
                }
              }
              
              // If not found in config, try direct theme storage
              if (!theme) {
                theme = localStorage.getItem('quicktoken_theme');
              }
              
              // Apply dark mode if needed
              if (theme === 'dark') {
                document.documentElement.classList.add('dark');
                document.documentElement.setAttribute('data-theme', 'dark');
                document.body.style.backgroundColor = '#121212';
                document.body.style.color = '#e0e0e0';
              }
            } catch (e) {
              console.error("Error in dark mode script:", e);
            }
          })();
        `,
      }}
    />
  );
};

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <AppProviders>
      <DarkModeScript />
      <Component {...pageProps} />
    </AppProviders>
  );
}

export default MyApp; 