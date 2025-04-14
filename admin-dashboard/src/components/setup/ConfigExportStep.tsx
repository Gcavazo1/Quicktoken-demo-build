import React, { useState, useEffect, useRef } from 'react';
import ConfigExport from '../ConfigExport';
import HelpIcon from '../HelpIcon';
import WalletConnector, { EIP6963ProviderDetail, EIP6963ProviderInfo } from '../../services/WalletConnector';
import { useWhitelist } from '../../contexts/WhitelistContext';
import { truncateAddress } from '../../utils/format';
import { QuickTokenConfig } from '../../pages/SetupWizard'; // Import config type

interface ConfigExportStepProps {
  onComplete: (verifiedOwner: string) => void;
  onBack: () => void;
  initialConfig: QuickTokenConfig; // Add prop type
}

// Define known RDNS values for convenience
const METAMASK_RDNS = 'io.metamask';
const COINBASE_RDNS = 'com.coinbase.wallet';
// Add others if needed, e.g., for WalletConnect if it announces via EIP-6963

/**
 * Setup wizard step for exporting configuration with owner verification (EIP-6963 enabled)
 * 
 * This step ensures:
 * 1. The user connects their wallet (using EIP-6963) to verify ownership
 * 2. The configuration is exported before completing setup
 * 3. All users will see the configured dashboard instead of setup wizard
 */
const ConfigExportStep: React.FC<ConfigExportStepProps> = ({ 
  onComplete,
  onBack,
  initialConfig // Destructure the prop
}) => {
  // Wallet connection state
  const [account, setAccount] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  // Store info of the connected wallet
  const [connectedWalletInfo, setConnectedWalletInfo] = useState<EIP6963ProviderInfo | null>(null);
  const [networkId, setNetworkId] = useState<number | null>(null);
  const [isNetworkSwitching, setIsNetworkSwitching] = useState<boolean>(false);
  
  // Store discovered providers for UI rendering
  const [discoveredProviders, setDiscoveredProviders] = useState<Map<string, EIP6963ProviderDetail>>(new Map());

  // Export state
  const [hasExported, setHasExported] = useState<boolean>(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null); // Keep for potential future use
  
  // Get whitelist context to check if connected wallet is an owner
  const { whitelist, allOwners, setIsInSetupMode } = useWhitelist();
  
  // Reference for check interval
  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  
  // Helper function to check if an address is in the whitelist as owner
  const isAddressOwner = (checkAddress: string): boolean => {
    if (!checkAddress) return false;
    // Convert owner addresses from context to lowercase for reliable comparison
    const lowerCaseOwners = allOwners?.map(addr => addr.toLowerCase()) || [];
    if (lowerCaseOwners.length === 0) return false;
    const normalizedAddress = checkAddress.toLowerCase();
    return lowerCaseOwners.includes(normalizedAddress);
  };
  
  // Check if current connected wallet is in whitelist as owner
  const isVerifiedOwner = account ? isAddressOwner(account) : false;
  
  // Effect to discover providers, check connection, and set setup mode
  useEffect(() => {
    isMountedRef.current = true;
    setIsInSetupMode(true);

    // --- EIP-6963 Discovery Update ---
    const updateDiscoveredProviders = () => {
      if (isMountedRef.current) {
        // Get a new map instance to trigger state update
        setDiscoveredProviders(new Map(WalletConnector.getDiscoveredProviders()));
      }
    };
    // Initial update
    updateDiscoveredProviders();
    // Listen for updates from WalletConnector
    window.addEventListener('walletProvidersUpdated', updateDiscoveredProviders);
    // --- End EIP-6963 --- 

    // Check for existing wallet connection
    checkExistingConnection();
    
    // Periodic check (can potentially be removed if event listeners are reliable)
    // checkIntervalRef.current = setInterval(checkExistingConnection, 5000); 
    
    // Listen for disconnect events triggered internally by WalletConnector
    const handleWalletDisconnect = () => {
      if (isMountedRef.current) {
         console.log('[ConfigExportStep] Received walletDisconnected event.');
         setAccount(null);
         setConnectedWalletInfo(null);
         setNetworkId(null);
      }
    };
    window.addEventListener('walletDisconnected', handleWalletDisconnect);

    // Cleanup
    return () => {
      setIsInSetupMode(false);
      isMountedRef.current = false;
      // if (checkIntervalRef.current) clearInterval(checkIntervalRef.current);
      window.removeEventListener('walletProvidersUpdated', updateDiscoveredProviders);
      window.removeEventListener('walletDisconnected', handleWalletDisconnect);
    };
  }, []); // Run only on mount
  
  // Track when export happens (no changes needed here)
  useEffect(() => {
    const handleExportComplete = () => {
      setHasExported(true);
    };
    window.addEventListener('quicktoken_export_complete', handleExportComplete);
    return () => {
      window.removeEventListener('quicktoken_export_complete', handleExportComplete);
    };
  }, []);
  
  // Check connection state (called on mount and potentially periodically)
  const checkExistingConnection = async () => {
    const logPrefix = "[ConfigExportStep.checkExistingConnection]";
    try {
      console.log(`${logPrefix} Running check...`);
      const isChanging = WalletConnector.isNetworkSwitching();
      if (isChanging && isMountedRef.current) {
         console.log(`${logPrefix} Network switching detected, delaying check.`);
         setIsNetworkSwitching(true);
         setTimeout(() => { if (isMountedRef.current) setIsNetworkSwitching(false); }, 5000);
         return;
      }
      if (isMountedRef.current) setIsNetworkSwitching(false);

      const result = await WalletConnector.getConnectionState();
      console.log(`${logPrefix} WalletConnector.getConnectionState returned:`, result);

      if (isMountedRef.current) {
        const { provider, account: connectedAccount, chainId, walletInfo } = result;
        
        if (connectedAccount) {
          // Only update state if the account or wallet info has actually changed
          if (connectedAccount !== account || walletInfo?.uuid !== connectedWalletInfo?.uuid) {
            console.log(`${logPrefix} Setting account state to: ${connectedAccount}, Wallet: ${walletInfo?.name}`);
            setAccount(connectedAccount); 
            setConnectedWalletInfo(walletInfo || null);
            setNetworkId(chainId);
          } else if (chainId !== networkId) {
             // Handle chain ID changes even if account is the same
             console.log(`${logPrefix} Updating chainId to: ${chainId}`);
             setNetworkId(chainId);
          }
        } else if (account !== null) {
          // If we previously had an account but now don't, clear state
          console.log(`${logPrefix} Wallet disconnected according to state check, clearing state.`);
          setAccount(null);
          setConnectedWalletInfo(null);
          setNetworkId(null);
        }
      }
    } catch (error) {
      console.error(`${logPrefix} Error checking connection state:`, error);
      // Maybe clear state on error?
      // setAccount(null); setConnectedWalletInfo(null); setNetworkId(null);
    }
  };
  
  // Connect wallet using EIP-6963 RDNS
  const handleConnect = async (rdns: string | null) => {
    if (!rdns) {
       setConnectionError("Could not identify the wallet provider.");
       return;
    }
    const logPrefix = `[ConfigExportStep.handleConnect RDNS: ${rdns}]`;
    setIsConnecting(true);
    setConnectionError(null);
    console.log(`${logPrefix} Attempting connect...`);
    
    // Clear local state *before* attempting connection
    console.log(`${logPrefix} Clearing local state...`);
    setAccount(null);
    setConnectedWalletInfo(null);
    setNetworkId(null);
    
    try {
       // WalletConnector.disconnect() is called within WalletConnector.connect() now
       console.log(`${logPrefix} Calling WalletConnector.connect('${rdns}')...`);
      const result = await WalletConnector.connect(rdns);
       console.log(`${logPrefix} WalletConnector.connect returned:`, result);

      if (!isMountedRef.current) return; // Exit if component unmounted during async call

      const { provider, account: connectedAccount, chainId, error, walletInfo } = result;
      
      if (error) {
        console.error(`${logPrefix} Connection error received:`, error);
        setConnectionError(error);
      } else if (provider && connectedAccount) {
        console.log(`${logPrefix} Connect successful. Setting state - Account: ${connectedAccount}, Wallet: ${walletInfo?.name}`);
        setAccount(connectedAccount);
        setConnectedWalletInfo(walletInfo || null);
        setNetworkId(chainId);
        setIsNetworkSwitching(false); // Reset network switch flag on successful connect
      } else {
        // Should not happen if error is null, but handle defensively
         console.error(`${logPrefix} Connection failed without explicit error.`);
        setConnectionError('Failed to connect wallet. Unknown error.');
      }
    } catch (error: any) {
      // Catch errors thrown *by* the connect call itself (less likely now)
      console.error(`${logPrefix} Unexpected error during handleConnect:`, error);
      if (isMountedRef.current) {
        setConnectionError(error.message || 'An unexpected error occurred during connection.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsConnecting(false);
      }
    }
  };
  
  // Disconnect wallet
  const handleDisconnect = () => {
    console.log('[ConfigExportStep] handleDisconnect called.');
    WalletConnector.disconnect();
    // State update should now be handled by the 'walletDisconnected' event listener
    // setAccount(null);
    // setConnectedWalletInfo(null);
    // setNetworkId(null);
  };
  
  // Complete setup (no changes needed here)
  const handleFinishSetup = () => {
    if (isVerifiedOwner && hasExported && account) {
      onComplete(account);
    }
  };
  
  // Check if user can proceed (no changes needed here)
  const canProceed = isVerifiedOwner && hasExported;
  
  console.log("[ConfigExportStep rendering] Current account state:", account, "WalletInfo:", connectedWalletInfo?.name); 
  
  // Prepare wallet buttons based on discovered providers
  const metamaskProvider = discoveredProviders.get(METAMASK_RDNS);
  const coinbaseProvider = discoveredProviders.get(COINBASE_RDNS);
  // Add others here if needed

  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4 text-center">Verify Ownership & Export Configuration</h2>
      <p className="mb-6 text-gray-600 text-center max-w-lg mx-auto">
        This critical final step ensures your dashboard is properly configured and available to all users.
        You must connect your wallet to verify ownership and export your configuration.
      </p>
      
      {/* Wallet Connection Section - Updated */}
      <div className="mb-8 p-4 border-2 border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700">
        <h3 className="font-bold text-lg mb-3 text-blue-800 dark:text-blue-300">
          Step 1: Verify Ownership
          <HelpIcon 
            content={
              <div>
                <p><strong>Why verify ownership?</strong></p>
                <p className="mt-1">This step ensures that you're actually the owner of the dashboard before exporting the configuration.</p>
                <p className="mt-2">Only addresses listed as owners in the whitelist can complete this verification step.</p>
              </div>
            } 
            width="320px"
          />
        </h3>
        
        {account && connectedWalletInfo ? (
          // --- Display Connected Wallet Info --- 
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <div>
                <div className="font-medium flex items-center">
                   {connectedWalletInfo.icon && ( 
                     <img src={connectedWalletInfo.icon} alt={`${connectedWalletInfo.name} icon`} className="w-5 h-5 mr-2 rounded-full" /> 
                   )}
                   Connected: {connectedWalletInfo.name} 
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-mono pl-7">
                  {truncateAddress(account)}
                </div>
                
                {/* Verification Status */}
                {isVerifiedOwner ? (
                  <div className="mt-2 px-2 py-1 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 rounded text-sm inline-block ml-7">
                    ✓ Verified Owner
                  </div>
                ) : (
                  <div className="mt-2 px-2 py-1 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 rounded text-sm inline-block ml-7">
                    ✗ Not an Owner Address
                  </div>
                )}
              </div>
              <button
                onClick={handleDisconnect}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 self-start"
              >
                Disconnect
              </button>
            </div>
            
            {/* Warning if not owner */}
            {!isVerifiedOwner && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-md">
                <strong>Warning:</strong> The connected wallet is not listed as an owner in the whitelist. 
                Please connect with one of the owner wallets you defined in the whitelist setup.
              </div>
            )}
          </div>
        ) : (
          // --- Display Connection Buttons --- 
          <div>
            <p className="mb-4 text-blue-700 dark:text-blue-400">
              Please connect your wallet to verify you are the owner of this dashboard.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
               {/* Metamask Button - Use RDNS */}
              {metamaskProvider && (
                <button
                  key={metamaskProvider.info.rdns}
                  onClick={() => handleConnect(metamaskProvider.info.rdns)}
                  disabled={isConnecting}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img 
                      src={'/images/metamask-logo.png'} 
                      alt={metamaskProvider.info.name}
                      className="w-6 h-6 mr-2" 
                    />
                    <span className="font-medium">Connect your Metamask wallet</span>
                  </div>
                </button>
              )}
              
               {/* Coinbase Button - Use RDNS */}
              {coinbaseProvider && (
                 <button
                  key={coinbaseProvider.info.rdns}
                  onClick={() => handleConnect(coinbaseProvider.info.rdns)}
                  disabled={isConnecting}
                  className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-3 text-left transition-colors"
                >
                  <div className="flex items-center mb-2">
                    <img 
                      src={'/images/coinbase-logo.png'} 
                      alt={coinbaseProvider.info.name}
                      className="w-6 h-6 mr-2" 
                    />
                    <span className="font-medium">Connect your Coinbase wallet</span>
                  </div>
                </button>
              )}

              {/* Display other discovered providers dynamically (optional) */}
              {/* 
              {Array.from(discoveredProviders.values())
                 .filter(p => p.info.rdns !== METAMASK_RDNS && p.info.rdns !== COINBASE_RDNS)
                 .map((p) => (
                   <button key={p.info.rdns} onClick={() => handleConnect(p.info.rdns)} ... >...</button>
                 ))}
              */}

              {/* Fallback / Info if no providers found? */} 
              {discoveredProviders.size === 0 && !isConnecting && (
                 <p className="text-gray-500 dark:text-gray-400 md:col-span-3 text-center">
                   Searching for wallets... If none appear, please ensure your browser wallet extension is installed and active.
                 </p>
              )}
              
            </div>
            
            {/* Connecting/Error indicators (no changes) */}
            {isConnecting && (
              <div className="mt-4 flex items-center text-blue-600 dark:text-blue-400">
                {/* Spinner SVG */}
                Connecting wallet...
              </div>
            )}
            {connectionError && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-md">
                {connectionError}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Network Info Section (Updated to use connectedWalletInfo) */} 
      {account && connectedWalletInfo && (isNetworkSwitching ? (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-md animate-pulse">
          <div className="font-medium flex items-center">
            <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Network Switching in Progress...
          </div>
          <div className="text-sm mt-1">
            Please wait while your wallet completes the network change.
          </div>
        </div>
      ) : networkId && (
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 rounded-md">
          <div className="font-medium">Network Information:</div>
          <div className="text-sm mt-1">
            Connected to: {networkId === 1 ? 'Ethereum Mainnet' : 
                          networkId === 11155111 ? 'Sepolia Testnet' : 
                          `Chain ID ${networkId}`}
          </div>
          <div className="text-sm mt-1">
            <strong>Note:</strong> If you switch networks in your wallet, you may need to reconnect.
          </div>
        </div>
      ))}
      
      {/* Export Configuration Section */}
      <div className="mb-8 p-4 border-2 border-blue-300 rounded-lg bg-blue-50 dark:bg-blue-900/30 dark:border-blue-700">
        <h3 className="font-bold text-lg mb-3 text-blue-800 dark:text-blue-300">
          Step 2: Export Configuration
          <HelpIcon 
            content={
              <div>
                <p><strong>Why is this step critical?</strong></p>
                <p className="mt-1">Without completing this step, every user who visits your dashboard will see the setup wizard instead of your configured dashboard.</p>
                <p className="mt-2">This file signals to the application that configuration has already been completed and should be loaded automatically.</p>
              </div>
            } 
            width="320px"
          />
        </h3>
        
        <ol className="list-decimal pl-5 space-y-3 text-blue-700 dark:text-blue-300">
          <li>
            <div className="font-medium">Download the configuration file</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Click the "Export Configuration" button below, then download the generated file.
            </div>
          </li>
          <li>
            <div className="font-medium">Add this file to your project repository</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Place the file at: <code className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-sm">/public/dashboard-config.json</code>
            </div>
          </li>
          <li>
            <div className="font-medium">Commit and deploy your repository</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Push your changes to your repository and deploy to your hosting provider.
            </div>
          </li>
          <li>
            <div className="font-medium">Verification</div>
            <div className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Load your dashboard in a new browser/incognito window to confirm the setup wizard doesn't appear and your configuration is applied.
            </div>
          </li>
        </ol>
        <div className="mt-6 p-3 bg-yellow-100 border border-yellow-200 rounded text-yellow-800 dark:bg-yellow-900 dark:border-yellow-800 dark:text-yellow-200">
          <strong>Important Note:</strong> Without this step, each user visiting your dashboard will see the setup wizard rather than your configured dashboard.
        </div>
      </div>
      
      <div className="mb-8">
        <ConfigExport 
          showTitle={false} 
          className="mb-4" 
          isSetupMode={true} 
          // Pass the config and account needed for export generation
          configForExport={initialConfig} 
          accountForExport={account}
          onExportComplete={() => setHasExported(true)}
        />
        
        {hasExported ? (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-md">
            ✓ Configuration exported successfully
          </div>
        ) : (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 rounded-md">
            ⚠ You must export the configuration before completing setup
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back
        </button>
        <button
          onClick={handleFinishSetup}
          disabled={!canProceed}
          className={`btn ${canProceed ? 'btn-primary' : 'btn-disabled'}`}
        >
          {!account ? 'Connect Wallet to Continue' : 
           !isVerifiedOwner ? 'Connect with Owner Wallet' :
           !hasExported ? 'Export Configuration to Continue' : 
           'Complete Setup'}
        </button>
      </div>
    </div>
  );
};

export default ConfigExportStep; 