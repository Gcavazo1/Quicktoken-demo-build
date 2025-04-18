import React, { useState, useEffect, useRef, useCallback } from 'react';
import ConfigExport from '../ConfigExport';
import HelpIcon from '../HelpIcon';
import { useWhitelist } from '../../contexts/WhitelistContext';
import { useWallet } from '../../hooks/useWallet';
import { truncateAddress } from '../../utils/format';
import { QuickTokenConfig } from '../../pages/SetupWizard';
import { EIP6963ProviderInfo, EIP6963ProviderDetail } from '../../services/WalletConnector';
import { Loader2 } from 'lucide-react';
import { useWeb3Modal } from '@web3modal/wagmi/react';

interface ConfigExportStepProps {
  onProceed: () => void;
  onBack: () => void;
  initialConfig: QuickTokenConfig;
}

// Known RDNS values for specific button rendering
const METAMASK_RDNS = 'io.metamask';
const COINBASE_RDNS = 'com.coinbase.wallet';

const ConfigExportStep: React.FC<ConfigExportStepProps> = ({ 
  onProceed,
  onBack,
  initialConfig
}) => {
  const { 
    address,
    chainId,
    walletInfo,
    isConnecting,
    error: connectionError,
    connectWallet,
    disconnectWallet,
    isNetworkSwitching
  } = useWallet();

  const [discoveredProviders, setDiscoveredProviders] = useState<Map<string, EIP6963ProviderDetail>>(new Map());
  
  const { 
    allOwners, 
    setIsInSetupMode, 
    isWhitelistLoading, 
    isOwner, 
    reloadWhitelist,
    isPermissionCheckComplete
  } = useWhitelist();
  
  const isMountedRef = useRef<boolean>(true);
  const [isVerifying, setIsVerifying] = useState(true);
  const [hasExported, setHasExported] = useState(false);

  const { open } = useWeb3Modal();

  useEffect(() => {
    isMountedRef.current = true;
    setIsInSetupMode(true);

    const updateDiscoveredProviders = () => {
      if (isMountedRef.current) {
        const { WalletConnector } = require('../../services/WalletConnector');
        setDiscoveredProviders(new Map(WalletConnector.getInstance().getDiscoveredProviders()));
      }
    };
    updateDiscoveredProviders();
    window.addEventListener('walletProvidersUpdated', updateDiscoveredProviders);

    console.log("[ConfigExportStep] Mounting, calling reloadWhitelist...");
    reloadWhitelist().then(() => {
      console.log("[ConfigExportStep] reloadWhitelist finished.");
      if (isMountedRef.current) {
        setIsVerifying(false);
      }
    });
    
    return () => {
      setIsInSetupMode(false);
      isMountedRef.current = false;
      window.removeEventListener('walletProvidersUpdated', updateDiscoveredProviders);
    };
  }, [setIsInSetupMode, reloadWhitelist]);
  
  const handleConnect = async () => {
    open();
  };
  
  const handleDisconnect = () => {
    disconnectWallet();
  };
  
  // Prepare specific provider details for buttons
  const metamaskProvider = discoveredProviders.get(METAMASK_RDNS);
  const coinbaseProvider = discoveredProviders.get(COINBASE_RDNS);
  
  // Determine overall loading state for UI feedback
  const isLoading = isConnecting || isWhitelistLoading || isVerifying || isNetworkSwitching;
  
  return (
    <div className="p-6 bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold text-white mb-4">Step 7: Verify & Export</h2>
      <p className="mb-6 text-gray-300 text-center max-w-lg mx-auto">
         This critical final step ensures your dashboard is properly configured and available to all users.
         You must connect your designated owner wallet to verify ownership and then export your configuration.
      </p>
      
      {/* Owner Verification Section */}
      <div className="mb-8 p-4 border-2 border-blue-700 rounded-lg bg-blue-900/30 min-h-[200px] flex flex-col justify-center">
         <h3 className="font-bold text-lg mb-3 text-blue-300 flex items-center">
           Step 1: Verify Ownership
           <HelpIcon 
             position="right"
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
        
        {/* Loading Indicator */} 
        {isLoading && (
          <div className="text-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400 mx-auto mb-2" />
            <p className="text-blue-300">Loading wallet or verifying permissions...</p>
          </div>
        )}

        {/* Content when not loading */} 
        {!isLoading && (
          <div className="mb-4 p-3 bg-gray-800 rounded">
            {address ? (
              // --- Display Connected Wallet Info --- 
              <div className="text-sm">
                <div className="flex items-center mb-2">
                  <img src={walletInfo?.icon} alt={walletInfo?.name} className="w-5 h-5 mr-2 rounded-full" />
                  <span className="font-medium text-white mr-2">Connected: {walletInfo?.name}</span>
                  <span className="font-mono text-gray-300">{truncateAddress(address)}</span>
                  <button 
                    onClick={handleDisconnect} 
                    className="ml-auto text-xs text-red-400 hover:text-red-300"
                  >
                    Disconnect
                  </button>
                </div>
                
                {/* Verification Status */} 
                <div className={`p-2 rounded ${isOwner ? 'bg-green-900 border border-green-700' : 'bg-yellow-900 border border-yellow-700'}`}> 
                  <p className={`text-center font-semibold ${isOwner ? 'text-green-300' : 'text-yellow-300'}`}> 
                    {isOwner ? 'Verified Owner Account' : 'Connected wallet is NOT a designated owner'} 
                  </p> 
                </div>
                 
                {/* Warning if not owner */} 
                 {!isOwner && ( 
                   <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 text-yellow-300 rounded-md text-sm"> 
                     <strong>Warning:</strong> The connected wallet is not listed as an owner in the whitelist. 
                     Please connect with one of the owner wallets you defined in the whitelist setup. 
                   </div> 
                 )} 
              </div>
            ) : (
              // --- Display Connection Buttons --- 
              <div>
                <p className="text-sm text-blue-400 mb-3">
                   Please connect your owner wallet to verify dashboard ownership.
                 </p>
                 <div className="flex flex-wrap gap-3">
                    {/* Metamask Button */} 
                    {metamaskProvider && (
                     <button
                      key={METAMASK_RDNS}
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-wait transition-colors"
                     >
                       <img src="/images/metamask-logo.png" alt="MetaMask" className="w-6 h-6 mr-2" /> 
                       Connect {metamaskProvider.info.name}
                     </button>
                    )}
                    
                    {/* Coinbase Button */} 
                    {coinbaseProvider && (
                     <button
                      key={COINBASE_RDNS}
                      onClick={handleConnect}
                      disabled={isConnecting}
                      className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-wait transition-colors"
                     >
                       <img src="/images/coinbase-logo.png" alt="Coinbase Wallet" className="w-6 h-6 mr-2" /> 
                       Connect {coinbaseProvider.info.name}
                     </button>
                    )}

                    {/* If no specific providers, show a generic connect button */}
                    {!metamaskProvider && !coinbaseProvider && discoveredProviders.size > 0 && (
                      <button
                        onClick={handleConnect}
                        disabled={isConnecting}
                        className="flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded disabled:opacity-50 disabled:cursor-wait transition-colors"
                      >
                        Connect Wallet
                      </button>
                    )}

                    {/* Info if no providers found at all */}
                    {discoveredProviders.size === 0 && !isConnecting && (
                      <p className="text-xs text-gray-500">Searching for wallet providers... Ensure a wallet extension is active or try refreshing.</p>
                    )}
                    
                    {/* Generic loading indicator */}
                    {isConnecting && (
                       <p className="text-xs text-gray-400 flex items-center">
                         <svg className="animate-spin mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                           <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                           <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                         </svg>
                         Connecting...
                       </p>
                    )}
                 </div>
              </div>
            )}
            {connectionError && (
              <p className="mt-3 text-sm text-red-400">Error: {connectionError}</p>
            )}
          </div>
        )}
      </div>
      
      {/* Configuration Export Section */}
      <div className="mb-8 p-4 border-2 border-blue-700 rounded-lg bg-blue-900/30">
         <h3 className="font-bold text-lg mb-3 text-blue-300 flex items-center">
           Step 2: Export Configuration
           <HelpIcon 
             position="right"
             content={
               <div>
                 <p><strong>Why is this step critical?</strong></p>
                 <p className="mt-1">Without completing this step, every user who visits your deployed dashboard will see the setup wizard instead of your configured dashboard.</p>
                 <p className="mt-2">This file signals to the application that configuration has already been completed and should be loaded automatically.</p>
               </div>
             }
             width="320px"
           />
         </h3>
          
         <ol className="list-decimal pl-5 space-y-3 text-blue-300">
           <li>
             <div className="font-medium">Download the configuration file</div>
             <div className="text-sm text-blue-400 mt-1">
               Click the "Export Configuration" button below, then download the generated file.
             </div>
           </li>
           <li>
             <div className="font-medium">Add this file to your project repository</div>
             <div className="text-sm text-blue-400 mt-1">
               Place the file at: <code className="px-1.5 py-0.5 bg-blue-800 rounded text-sm">/public/dashboard-config.json</code>
             </div>
           </li>
           <li>
             <div className="font-medium">Commit and deploy your repository</div>
             <div className="text-sm text-blue-400 mt-1">
               Push your changes to your repository and deploy to your hosting provider (e.g., Vercel, Netlify).
             </div>
           </li>
           <li>
             <div className="font-medium">Verification</div>
             <div className="text-sm text-blue-400 mt-1">
               Load your deployed dashboard URL in a new browser/incognito window to confirm the setup wizard doesn't appear and your configuration is applied.
             </div>
           </li>
         </ol>
         <div className="mt-6 p-3 bg-yellow-900/20 border border-yellow-800 text-yellow-300 rounded-md">
           <strong>Important Note:</strong> Without this step, each user visiting your deployed dashboard will see the setup wizard rather than your configured dashboard.
         </div>
         
         {/* Actual Export Component - Pass the core config AND the callback */}
         <div className="mt-6">
           <ConfigExport 
             showTitle={false} 
             configForExport={initialConfig} 
             onExportSuccess={() => setHasExported(true)}
             isSetupMode={true}
             accountForExport={address}
           /> 
         </div>
      </div>
      
      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8">
        <button 
          onClick={onBack}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
        >
          Back
        </button>
        <button 
          onClick={onProceed}
          disabled={isLoading || !isOwner || !hasExported}
          className={`px-6 py-2 text-white font-medium rounded transition-colors ${ 
            (isLoading || !isOwner || !hasExported)
              ? 'bg-gray-500 cursor-not-allowed' 
              : 'bg-blue-600 hover:bg-blue-700' 
          }`} 
          title={
            isLoading ? "Verifying..." : 
            !isOwner ? "Connect and verify owner wallet to continue" : 
            !hasExported ? "Export configuration file first" : 
            "Proceed to final instructions"
          }
        >
          Next: Final Instructions
        </button>
      </div>
    </div>
  );
};

export default ConfigExportStep; 