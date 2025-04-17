import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import SetupWizard, { QuickTokenConfig } from '../admin-dashboard/src/pages/SetupWizard';
import Dashboard from '../admin-dashboard/src/pages/Dashboard';

const Home: NextPage = () => {
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const [config, setConfig] = useState<QuickTokenConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Check for deployed config first, then localStorage as fallback/optimization
  useEffect(() => {
    const checkConfig = async () => {
      setLoading(true); // Ensure loading is true while we fetch/check
      try {
        const response = await fetch('/dashboard-config.json');
        if (response.ok) {
          const loadedConfig: QuickTokenConfig = await response.json();
          setConfig(loadedConfig);
          setSetupComplete(true);
          // Optionally save to localStorage for potential future optimizations
          // or checks elsewhere in the app
          localStorage.setItem('quicktoken_setup_complete', 'true');
          localStorage.setItem('quicktoken_config', JSON.stringify(loadedConfig));
        } else {
          // Config file not found or fetch failed, proceed to check localStorage
          // or show SetupWizard if localStorage is also empty
          if (typeof window !== 'undefined') {
            const isComplete = localStorage.getItem('quicktoken_setup_complete') === 'true';
            if (isComplete) {
              const savedConfig = localStorage.getItem('quicktoken_config');
              if (savedConfig) {
                try {
                  setConfig(JSON.parse(savedConfig));
                  setSetupComplete(true); // Set complete if found in localStorage
                } catch (e) {
                  console.error('Failed to parse saved configuration from localStorage');
                  setSetupComplete(false); // Fallback to wizard if localStorage parsing fails
                }
              } else {
                 setSetupComplete(false); // Fallback to wizard if config missing in localStorage
              }
            } else {
              setSetupComplete(false); // Fallback to wizard if not complete in localStorage
            }
          } else {
             setSetupComplete(false); // Default to wizard if not in browser env (though fetch should handle this)
          }
        }
      } catch (error) {
        console.error('Failed to fetch or parse dashboard-config.json:', error);
         // Assume setup is not complete if fetch fails entirely
         // Check localStorage as a last resort
         if (typeof window !== 'undefined') {
            const isComplete = localStorage.getItem('quicktoken_setup_complete') === 'true';
            if (isComplete) {
              const savedConfig = localStorage.getItem('quicktoken_config');
              if (savedConfig) {
                try {
                  setConfig(JSON.parse(savedConfig));
                  setSetupComplete(true);
                } catch (e) {
                  console.error('Failed to parse saved configuration from localStorage after fetch error');
                  setSetupComplete(false);
                }
              } else {
                 setSetupComplete(false);
              }
            } else {
              setSetupComplete(false);
            }
          } else {
             setSetupComplete(false);
          }
      } finally {
        setLoading(false); // Set loading to false after all checks are done
      }
    };

    checkConfig();
  }, []); // Empty dependency array ensures this runs only once on mount
  
  const handleSetupComplete = (newConfig: QuickTokenConfig) => {
    setConfig(newConfig);
    setSetupComplete(true);
    // Save to localStorage when setup is completed via the wizard
    if (typeof window !== 'undefined') {
      localStorage.setItem('quicktoken_setup_complete', 'true');
      localStorage.setItem('quicktoken_config', JSON.stringify(newConfig));
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  return (
    <div>
      <Head>
        <title>QuickToken Dashboard</title>
        <meta name="description" content="Deploy and manage your ERC-20 tokens" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <main>
        {setupComplete && config ? (
          <Dashboard config={config} />
        ) : (
          <SetupWizard onComplete={handleSetupComplete} />
        )}
      </main>
    </div>
  );
};

export default Home; 