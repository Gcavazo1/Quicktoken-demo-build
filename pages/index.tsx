import { useState, useEffect } from 'react';
import type { NextPage } from 'next';
import Head from 'next/head';
import SetupWizard, { QuickTokenConfig } from '../admin-dashboard/src/pages/SetupWizard';
import Dashboard from '../admin-dashboard/src/pages/Dashboard';

const Home: NextPage = () => {
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const [config, setConfig] = useState<QuickTokenConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Check if setup is already complete on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isComplete = localStorage.getItem('quicktoken_setup_complete') === 'true';
      if (isComplete) {
        const savedConfig = localStorage.getItem('quicktoken_config');
        if (savedConfig) {
          try {
            setConfig(JSON.parse(savedConfig));
          } catch (e) {
            console.error('Failed to parse saved configuration');
          }
        }
        setSetupComplete(isComplete);
      }
      setLoading(false);
    }
  }, []);
  
  const handleSetupComplete = (config: QuickTokenConfig) => {
    setConfig(config);
    setSetupComplete(true);
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