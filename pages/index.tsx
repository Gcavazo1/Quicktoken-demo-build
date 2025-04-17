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

      // --- Add check for force_setup flag --- 
      if (typeof window !== 'undefined') {
        const forceSetup = localStorage.getItem('quicktoken_force_setup');
        if (forceSetup === 'true') {
          // console.log("[Home Page] quicktoken_force_setup flag is true, forcing SetupWizard.");
          setSetupComplete(false);
          setConfig(null); // Ensure no stale config is used
          setLoading(false);
          return; // Skip further checks
        }
      }
      // --- End check for force_setup flag ---

      try {
        // console.log("[Home Page] Checking for /dashboard-config.json...");
        const response = await fetch('/dashboard-config.json');
        if (response.ok) {
          // Parse the full JSON response first
          const fullConfig = await response.json();
          
          // Extract the 'core' part which matches QuickTokenConfig
          const coreConfig = fullConfig.core;

          if (coreConfig) { // Ensure core object exists
            setConfig(coreConfig);
            setSetupComplete(true);
            // Optionally save the core config to localStorage
            localStorage.setItem('quicktoken_setup_complete', 'true');
            localStorage.setItem('quicktoken_config', JSON.stringify(coreConfig));
          } else {
             // console.error('Fetched dashboard-config.json is missing the \'core\' object.');
             setSetupComplete(false); // Fallback to wizard if structure is wrong
          }
        } else {
          // Config file not found or fetch failed, proceed to check localStorage
          // console.log("[Home Page] /dashboard-config.json not found or fetch failed. Checking localStorage...");
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
                  // console.error('Failed to parse saved configuration from localStorage');
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
        // console.error('[Home Page] Failed during config checks:', error);
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
                  // console.error('Failed to parse saved configuration from localStorage after fetch error');
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
        // Only set loading false here if the force setup flag wasn't hit
        if (localStorage.getItem('quicktoken_force_setup') !== 'true') {
          setLoading(false); 
        }
        // console.log("[Home Page] Config check finished.");
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