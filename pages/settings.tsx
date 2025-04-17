import React, { useState, useEffect } from 'react';
import Head from 'next/head'; // Added for Next.js page
import { QuickTokenConfig } from '../admin-dashboard/src/pages/SetupWizard'; // Assuming type definition is still valid there
import { useTheme } from '../admin-dashboard/src/contexts/ThemeContext'; // Adjusted path
import { useWhitelist, WhitelistEntry } from '../admin-dashboard/src/contexts/WhitelistContext'; // Import WhitelistEntry
import AdminBadge from '../admin-dashboard/src/components/AdminBadge'; // Adjusted path
import ConfigExport from '../admin-dashboard/src/components/ConfigExport'; // Adjusted path
import { assembleExportableConfig, createConfigDownload, revokeConfigUrl } from '../admin-dashboard/src/utils/configExport'; // Added revokeConfigUrl
import { useWallet } from '../admin-dashboard/src/hooks/useWallet'; // Needed for exporter address
import { useRouter } from 'next/router'; // Added for redirection
import { ethers } from 'ethers'; // Needed for address validation
import HelpIcon from '../admin-dashboard/src/components/HelpIcon'; // Needed for WhitelistTab
import { NETWORKS, NetworkInfo } from '../admin-dashboard/src/shared/constants/networks';

// Helper function to apply branding styles during preview
const applyPreviewStyles = (config: QuickTokenConfig | null) => { // Allow null
  if (!config) return;
  // Set dashboard title
  document.documentElement.style.setProperty('--dashboard-title', `'${config.branding.title || 'QuickToken Dashboard'}'`);
};

// Default config structure (needed for initialization)
const initialConfig: QuickTokenConfig = {
  platformFeeAddress: '',
  platformFeePercentage: 0,
  infuraId: '',
  wallets: {
    metamask: true,
    coinbase: true,
  },
  networks: {
    configuredNetworks: Object.values(NETWORKS) // Populate from constants initially
      .filter(n => n.chainId !== 1337 && n.chainId !== 31337) // Filter out local dev nets if desired
      .map(n => ({
        name: n.name,
        chainId: String(n.chainId), // Ensure chainId is string if needed by type
        rpcUrl: n.rpcUrl || '', // Use defaults from NETWORKS
        explorerUrl: n.explorerUrl || '',
        isEnabled: [1, 137, 80001].includes(n.chainId), // Example: Default enable Mainnet, Polygon, Mumbai
        shortName: n.shortName || '',
        currencySymbol: typeof n.currency === 'string' ? n.currency : n.currency?.symbol || '',
        testnet: n.testnet || false,
      })),
    mainnet: false,
    goerli: false,
    sepolia: false,
    polygon: false,
    mumbai: false,
    arbitrum: false,
    optimism: false
  },
  branding: {
    title: 'QuickToken Dashboard'
  },
  theme: 'light', // Default theme
  // Removed adminAddresses and ownerAddress - they are part of WhitelistContext/Config
  // adminAddresses: [], 
  // ownerAddress: '',   
  // Assuming security settings might exist based on type, adding defaults
  security: { 
    whitelistEnabled: true, // Example default, adjust if needed
  } 
};

// --- Component Sections (Tabs) ---

// Moved BrandingThemeTab outside SettingsPage to prevent re-renders causing focus loss
interface BrandingThemeTabProps {
  currentConfig: QuickTokenConfig;
  theme: string;
  setTheme: (theme: 'light' | 'dark') => void;
  updateConfig: (updates: Partial<QuickTokenConfig>) => void;
  handleTitleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const BrandingThemeTab: React.FC<BrandingThemeTabProps> = ({ 
  currentConfig, 
  theme, 
  setTheme, 
  updateConfig, 
  handleTitleChange 
}) => {
  return (
    <div className="p-6">
       {/* Dashboard Title Input Section */}
       <div className="mb-8"> {/* Added margin bottom */}
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Dashboard Branding
        </h3>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Dashboard Title
        </label>
        <input
          type="text"
          className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-blue-500 focus:border-blue-500"
          placeholder="QuickToken Dashboard"
          value={currentConfig.branding.title} // Access directly now
          onChange={handleTitleChange}
        />
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          This title will appear in the dashboard header and browser tab
        </p>
      </div>
      
      {/* Theme Selection Section */}
      <div className="space-y-6 mb-6">
        <div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Choose Theme
          </h3>
          <div className="mt-4 space-y-4">
            <div className="flex items-center space-x-4">
              {/* Light Theme Option */}
              <div 
                onClick={() => {
                    setTheme('light'); 
                    updateConfig({ theme: 'light' }); // Update local config state
                }}
                className={`cursor-pointer bg-white border-2 ${theme === 'light' ? 'border-blue-500' : 'border-gray-200'} rounded-lg p-4 w-40 flex flex-col items-center transition-all`}
              >
                <div className="w-full h-24 bg-gray-50 rounded-md mb-2 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>
                <div className="font-medium text-gray-900">Light</div>
              </div>
              
              {/* Dark Theme Option */}
              <div 
                onClick={() => {
                  setTheme('dark'); 
                  updateConfig({ theme: 'dark' }); // Update local config state
                }}
                className={`cursor-pointer bg-gray-800 border-2 ${theme === 'dark' ? 'border-blue-500' : 'border-gray-800'} rounded-lg p-4 w-40 flex flex-col items-center transition-all`}
              >
                <div className="w-full h-24 bg-gray-900 rounded-md mb-2 flex items-center justify-center">
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  </div>
                </div>
                <div className="font-medium text-white">Dark</div>
              </div>
            </div>
            
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              Choose the theme that best suits your preferences. Changes require exporting the config and redeploying.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Moved WhitelistTab outside SettingsPage
interface WhitelistTabProps {
  whitelist: WhitelistEntry[]; 
  addToWhitelist: (address: string, label: string, permissions: string[]) => void;
  removeOwner: (address: string) => boolean;
  isOwnerCheck: boolean; // Pass the owner check result as a prop
}

const WhitelistTab: React.FC<WhitelistTabProps> = ({ 
  whitelist, 
  addToWhitelist, 
  removeOwner, 
  isOwnerCheck 
}) => {
    const [newAddress, setNewAddress] = useState('');
    const [newLabel, setNewLabel] = useState('');
    // ADDED: State for selected role
    const [selectedRole, setSelectedRole] = useState<'admin' | 'owner'>('admin'); 

    // Form validation
    const isAddressValid = React.useMemo(() => {
      return newAddress ? ethers.isAddress(newAddress) : true;
    }, [newAddress]);

    // Handle adding new addresses (Simplified to add Owner/Admin)
    const handleAddAddress = () => {
      if (!ethers.isAddress(newAddress)) {
        console.error('Invalid Ethereum address format');
        return;
      }

      try {
        // MODIFIED: Determine permissions based on selectedRole
        const permissions = selectedRole === 'owner' 
          ? ['owner', 'admin'] 
          : ['admin'];
        
        addToWhitelist(
          newAddress, 
          newLabel || (selectedRole === 'owner' ? 'Owner' : 'Admin'), // Default label based on role
          permissions
        );
        
        console.log(`Address ${newAddress} added to whitelist as ${selectedRole}.`);
        
        // Reset form
        setNewAddress('');
        setNewLabel('');
        setSelectedRole('admin'); // Reset role selection
      } catch (error: any) {
        console.error('Failed to add address:', error);
      }
    };

    // Handle removing addresses (using removeOwner)
    const handleRemoveAddress = (address: string) => {
      try {
        // Attempt to remove using the removeOwner function from context
        const success = removeOwner(address); 
        if (success) {
            console.log(`Address ${address} removed from whitelist.`);
        } 
        // Notification for failure (e.g., last owner) is handled within removeOwner context function
      } catch (error: any) {
        console.error('Failed to remove address:', error);
      }
    };

    // Helper function to get badge label based on permissions
    // Ensure WhitelistEntry type is available or define locally if needed
    const getBadgeForEntry = (entry: { permissions?: string[] }) => {
      if (entry.permissions?.includes('owner')) return 'Owner';
      if (entry.permissions?.includes('admin')) return 'Admin';
      // Add other roles if they exist in WhitelistEntry type
      return 'Viewer'; // Default or lowest permission
    };
    
    // This tab is already conditionally rendered based on isOwner from the parent scope
    // So, no need for the !isOwner check here

    return (
      <div className="p-6">
         <h3 className="text-lg font-semibold mb-4 dark:text-white">
            Whitelist Management (Owner Only)
            <HelpIcon 
              content={
                <div>
                  <p>Add or remove wallet addresses that should have administrative (Owner) access to all dashboard settings and functions.</p>
                  <p className="mt-2">Changes take effect immediately but require an export/redeploy to be finalized for all users visiting the deployed dashboard.</p>
                  <p className="mt-2 text-xs italic">The original owner address cannot be removed.</p>
                </div>
              }
              width="320px"
              position="right"
            />
          </h3>
          
          {/* Add New Admin/Owner Section */}
          <div className="mb-6 border dark:border-gray-700 rounded-lg p-4">
            <h4 className="text-md font-semibold mb-3 dark:text-white">Add New Admin/Owner</h4>
            <div className="flex flex-col space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Ethereum Address
                </label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="0x..."
                  className={`mt-1 block w-full px-3 py-2 border text-sm ${!isAddressValid ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                />
                {!isAddressValid && (
                  <p className="mt-1 text-xs text-red-500">Invalid Ethereum address format</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                  Label (Optional)
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="E.g., Co-founder, Lead Dev"
                  className="mt-1 block w-full px-3 py-2 border text-sm border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
               {/* MODIFIED: Added Role Selection */}
              <div className="mb-3">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Role
                  </label>
                  <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                          <input 
                              type="radio" 
                              name="role" 
                              value="admin"
                              checked={selectedRole === 'admin'}
                              onChange={() => setSelectedRole('admin')}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Admin</span>
                      </label>
                      <label className="flex items-center">
                          <input 
                              type="radio" 
                              name="role" 
                              value="owner"
                              checked={selectedRole === 'owner'}
                              onChange={() => setSelectedRole('owner')}
                              className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Owner</span>
                      </label>
                  </div>
              </div>

              <button
                onClick={handleAddAddress}
                disabled={!isAddressValid || !newAddress}
                className={`px-4 py-2 rounded-md text-white text-sm ${(!isAddressValid || !newAddress) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                {/* MODIFIED: Generic Button Text */}  
                Add Address
              </button>
            </div>
          </div>

          {/* Current Whitelist Section */}
          <div>
            <h4 className="text-md font-semibold mb-3 dark:text-white">Current Admins/Owners</h4>
            {whitelist.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 italic">No addresses have been whitelisted yet.</p>
            ) : (
              <ul className="space-y-2 max-h-60 overflow-y-auto border dark:border-gray-700 rounded-lg p-3">
                {whitelist.map((item) => (
                  <li key={item.address} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    <div className="flex items-center">
                      <div className="mr-2">
                        <AdminBadge label={getBadgeForEntry(item)} />
                      </div>
                      <div>
                        <p className="text-sm font-medium dark:text-white">{item.label}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 break-all">{item.address}</p>
                      </div>
                      
                    </div>
                    {/* Allow removing if owner, and not the first entry (original owner) */}
                    {isOwnerCheck && item.address.toLowerCase() !== whitelist[0]?.address.toLowerCase() && (
                      <button
                        onClick={() => handleRemoveAddress(item.address)}
                        className="text-red-500 hover:text-red-700 ml-2 p-1 text-xs font-medium"
                        title="Remove Address"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
      </div>
    );
};

// Moved ExportConfigTab outside SettingsPage
const ExportConfigTab: React.FC = () => {
  return (
    <div className="p-6">
      <div className="space-y-6 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Export Updated Configuration
          </h3>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-5 mb-6">
            <h4 className="font-bold text-lg text-yellow-800 dark:text-yellow-300 flex items-center mb-3">
              Critical Deployment Step
            </h4>
            <p className="mt-2 text-yellow-700 dark:text-yellow-400">
              To apply any changes made in these settings, you **must** export the updated configuration and redeploy your application.
            </p>
            <ol className="list-decimal pl-5 mt-4 space-y-3 text-yellow-700 dark:text-yellow-400">
              <li className="font-medium">
                <strong>Make your desired changes</strong> in the relevant settings tabs.
              </li>
               <li className="font-medium">
                <strong>Click "Export Updated Config"</strong> below (or the main save button if refactored).
                <p className="font-normal text-sm mt-1">This downloads the updated `dashboard-config.json`.</p>
              </li>
              <li className="font-medium">
                <strong>Replace the existing file</strong> in your project repository at:
                <code className="block mt-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-800/50 rounded-md text-sm font-mono w-full">
                  /public/dashboard-config.json
                </code>
              </li>
              <li className="font-medium">
                <strong>Commit and deploy your changes</strong> to your hosting provider.
              </li>
              <li className="font-medium">
                <strong>Verify</strong> the changes are live on your deployed dashboard.
              </li>
            </ol>
            <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <p className="flex items-center text-yellow-800 dark:text-yellow-300 font-medium">
                <span className="font-bold mr-2">⚠️ Important Note</span>
              </p>
              <p className="mt-2 text-yellow-700 dark:text-yellow-400">
                Changes saved via the button below are **not** automatically applied to the live dashboard. The export and redeploy steps are mandatory for changes to take effect for all users.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Renamed component to SettingsPage and changed structure for Next.js page
const SettingsPage: React.FC = () => { // Removed props
  // State for loading and potential errors during config fetch
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  // Updated Tab structure
  const [activeTab, setActiveTab] = useState<'platform' | 'networks' | 'brandingTheme' | 'whitelist' | 'exportConfig'>('platform');
  // MODIFIED: State now holds only the CORE config settings managed by this page
  const [currentConfig, setCurrentConfig] = useState<QuickTokenConfig | null>(initialConfig); 
  const [originalConfig, setOriginalConfig] = useState<QuickTokenConfig | null>(initialConfig); 
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  // Access control & whitelist hooks - useWhitelist provides functions to update too
  const { 
    isWhitelisted, 
    isOwner, 
    addOwner, // Function to add owner
    removeOwner, // Function to remove owner
    whitelist, // Array of WhitelistEntry { address, label, permissions, addedAt }
    allOwners, // Array of owner addresses strings
    isWhitelistLoading, // Added loading state check
    addToWhitelist // Added addToWhitelist function
  } = useWhitelist(); 
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  const { theme, setTheme } = useTheme(); // Moved theme context hook here
  const router = useRouter(); // Initialize router
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null); // State to track authorization check
  // Get wallet state, including connection status flags
  const { 
    address: walletAddress, 
    isConnected, 
    isConnecting, 
    provider // Also get provider to potentially check if initialized
  } = useWallet(); 

  // Step 4: Implement Configuration Loading
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        // 1. Try fetching static config first
        const response = await fetch('/dashboard-config.json');
        if (response.ok) {
          const fullLoadedConfig = await response.json(); // Load the full structure
          // Basic validation
          if (fullLoadedConfig && typeof fullLoadedConfig === 'object' && fullLoadedConfig.core) {
             // MODIFIED: Extract ONLY the 'core' object for state management
             const coreConfig = { ...initialConfig, ...fullLoadedConfig.core }; 
             setCurrentConfig(coreConfig);
             setOriginalConfig(coreConfig); 
             setIsLoading(false);
             console.log("Settings CORE configuration loaded from static config");
             return; // Exit if loaded successfully
          } else {
            console.warn("Static config loaded but missing 'core' object or invalid structure.");
          }
        }
        // If fetch failed or response not ok (e.g., 404), proceed to localStorage
        console.log("Static config not found or invalid, checking localStorage...");

        // 2. Fallback to localStorage
        const storedConfigRaw = localStorage.getItem('quicktoken_config');
        if (storedConfigRaw && storedConfigRaw !== "undefined" && storedConfigRaw !== "null") {
          try {
            // MODIFIED: Parse the stored object directly as it should be the core config
            const loadedCoreConfig = JSON.parse(storedConfigRaw);
            // Basic validation (check if it's an object)
            if (loadedCoreConfig && typeof loadedCoreConfig === 'object') {
              // Use the loaded core config, merging with initialConfig for defaults
              const coreConfig = { ...initialConfig, ...loadedCoreConfig };
              setCurrentConfig(coreConfig);
              setOriginalConfig(coreConfig);
              setIsLoading(false);
              console.log("Settings CORE configuration loaded from localStorage");
              return; // Exit if loaded successfully
            } else {
              console.warn("localStorage config loaded but it's not a valid object.");
            }
          } catch (parseError) {
            console.error('Failed to parse localStorage config:', parseError);
            // Proceed to error state
          }
        }
        
        // 3. If both fail, use initialConfig (which is already core-only)
        console.log('No valid config found in static file or localStorage. Using initial default core config.');
        setCurrentConfig(initialConfig); // Use the default core config
        setOriginalConfig(initialConfig);
        // Optionally set an error/warning, or just proceed with defaults
        // setLoadError('Could not load dashboard configuration. Using defaults.'); 
        
      } catch (error) {
        console.error('Error loading configuration:', error);
        setLoadError('An error occurred while loading the configuration.');
        setCurrentConfig(null); // Indicate error state
        setOriginalConfig(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []); // Empty dependency array ensures this runs only once on mount

  // Step 6: Implement Access Control Check (Revised - Simplified Logic)
  useEffect(() => {
    // 1. Wait until loading hooks and connection attempts are finished.
    if (isLoading || isWhitelistLoading || isConnecting) {
      setIsAuthorized(null); // Still resolving state
      return;
    }

    // 2. Loading is done. Now check the actual wallet connection status.
    if (isConnected && walletAddress) {
      // Wallet appears connected, check authorization.
      const normalizedAddress = walletAddress.toLowerCase();
      const authorized = whitelist.some(entry => 
        entry.address.toLowerCase() === normalizedAddress && 
        (entry.permissions.includes('owner') || entry.permissions.includes('admin'))
      );

      setIsAuthorized(authorized);

      if (!authorized) {
        console.log("Settings Access: Wallet connected but NOT authorized. Redirecting.");
        router.push('/');
      } else {
        console.log("Settings Access: Wallet connected and authorized. Allowing access.");
        // Stay on page
      }
    } else {
      // Wallet is definitively disconnected (isConnected is false OR walletAddress is null/undefined).
      console.log(`Settings Access: Wallet disconnected (isConnected: ${isConnected}, walletAddress: ${walletAddress}). Redirecting.`);
      setIsAuthorized(false);
      router.push('/');
    }

  }, [isLoading, isWhitelistLoading, isConnecting, isConnected, walletAddress, whitelist, router]); // Dependencies updated

  // Apply branding changes to CSS variables in real-time for preview
  useEffect(() => {
    if (activeTab === 'brandingTheme' && currentConfig) {
      applyPreviewStyles(currentConfig);
    }
  }, [activeTab, currentConfig?.branding]); // Depend on currentConfig.branding

  // Update current config and mark as changed
  const updateConfig = (updates: Partial<QuickTokenConfig>) => {
    // Ensure currentConfig is not null before updating
    if (!currentConfig) return; 
    
    const updatedConfig = { 
      ...currentConfig, 
      ...updates,
      // Ensure nested objects are merged correctly
      wallets: { ...currentConfig.wallets, ...updates.wallets },
      networks: { ...currentConfig.networks, ...updates.networks },
      branding: { ...currentConfig.branding, ...updates.branding },
    };
    setCurrentConfig(updatedConfig);
    setHasChanges(true);
  };

  // Save changes (Now triggers export, saves to localStorage, and navigates)
  const saveChanges = () => {
    if (!currentConfig) {
      console.error('Configuration not loaded, cannot export.');
      return;
    }
    if (!walletAddress) {
        console.error('Wallet not connected. Cannot determine exporter address.');
        return;
    }

    try {
      // 1. Trigger the download using the utility
      const { url, filename } = createConfigDownload(currentConfig, walletAddress);

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      revokeConfigUrl(url);
      
      // 2. ADDED: Save the current core config to localStorage
      localStorage.setItem('quicktoken_config', JSON.stringify(currentConfig));
      // Ensure setup is marked as complete in localStorage
      localStorage.setItem('quicktoken_setup_complete', 'true');
      console.log('Settings saved to localStorage.');

      // 3. Update component state
      setOriginalConfig(currentConfig); 
      setHasChanges(false);
      console.log('Configuration downloaded successfully.');
      
      // 4. ADDED: Navigate back to the dashboard
      router.push('/'); 

      // REMOVED: setActiveTab('exportConfig'); // No longer needed as we navigate away

    } catch (error) {
       console.error("Error exporting or saving configuration:", error);
       // Optionally show an error notification to the user
    }
  };

  // Discard changes
  const discardChanges = () => {
    // Restore from the originally loaded config
    setCurrentConfig(originalConfig); 
    setHasChanges(false);
    console.log('Settings changes discarded.');
  };

  // Handle platform fee address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isWhitelisted) { // Keep admin check
      updateConfig({
        platformFeeAddress: e.target.value
      });
    }
  };
  
  // Handle platform fee percentage change
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isWhitelisted) { // Keep admin check
      updateConfig({
        platformFeePercentage: parseInt(e.target.value) || 0 // Ensure it's a number
      });
    }
  };

  // Toggle wallet provider
  const toggleWallet = (wallet: keyof QuickTokenConfig['wallets']) => {
    if (!currentConfig) return;
    updateConfig({
      wallets: {
        ...currentConfig.wallets,
        [wallet]: !currentConfig.wallets[wallet]
      }
    });
  };
  
  // ADDED: Function to toggle network enabled status within the configuredNetworks array
  const toggleNetworkInArray = (chainId: string) => {
    if (!currentConfig || !currentConfig.networks.configuredNetworks) return;

    const updatedNetworks = currentConfig.networks.configuredNetworks.map(network => {
      if (network.chainId === chainId) {
        return { ...network, isEnabled: !network.isEnabled };
      }
      return network;
    });

    updateConfig({
      networks: {
        ...currentConfig.networks,
        configuredNetworks: updatedNetworks
      }
    });
  };

  // Handle dashboard title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({
      branding: {
        ...currentConfig?.branding, // Use optional chaining
        title: e.target.value
      }
    });
  };

  // --- Main Return Structure ---

  // Handle loading and error states before rendering main content
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <p className="text-gray-500 dark:text-gray-400">Loading settings...</p>
        {/* Optionally add a spinner here */}
      </div>
    );
  }

  if (loadError || !currentConfig) {
     return (
       <div className="mx-auto mt-8 max-w-2xl p-4">
          <div className="p-6 bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 rounded-lg shadow">
             <h2 className="text-lg font-bold mb-2">Error Loading Settings</h2>
             <p>{loadError || 'Configuration data could not be loaded. Please ensure setup was completed or try resetting.'}</p>
             {/* Optionally add a reset button here if applicable */}
          </div>
       </div>
     );
  }
  
  // If loading is complete and config exists, render the main component
  return (
    <> {/* Added Fragment */}
      <Head>
        <title>Dashboard Settings - QuickToken</title>
        <meta name="description" content="Manage QuickToken dashboard settings" />
      </Head>
      
      <div className="mx-auto mt-4 max-w-4xl p-4"> {/* Added padding */}
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Settings</h1>
          {/* Show admin badge based on context */}
          {isWhitelisted && <AdminBadge className="ml-2" />} 
        </div>
        
        {/* Debug info - Optional: Keep for development? */}
        {/* <div className="mb-4 p-3 bg-gray-700 text-white rounded text-xs">
          <div>isWhitelisted: {String(isWhitelisted)}</div>
          <div>isOwner: {String(isOwner)}</div>
        </div> */}

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6 border-b dark:border-gray-700">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white">
              Configure Dashboard
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Modify settings and export the updated configuration for redeployment.
            </p>
          </div>
          
          {/* Tabs */}
          <div className="border-b dark:border-gray-700">
            <nav className="flex -mb-px overflow-x-auto"> {/* Added overflow-x-auto */}
              {/* Platform Tab */}
              <button
                onClick={() => setActiveTab('platform')}
                className={`${
                  activeTab === 'platform'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } px-6 py-4 text-center border-b-2 font-medium text-sm whitespace-nowrap`} // Added whitespace-nowrap
              >
                Platform
              </button>
              {/* Networks Tab (formerly Wallet Options) */}
              <button
                onClick={() => setActiveTab('networks')}
                className={`${
                  activeTab === 'networks'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } px-6 py-4 text-center border-b-2 font-medium text-sm whitespace-nowrap`}
              >
                Networks
              </button>
              {/* Branding & Theme Tab (formerly Title and Theme) */}
              <button
                onClick={() => setActiveTab('brandingTheme')}
                className={`${
                  activeTab === 'brandingTheme'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } px-6 py-4 text-center border-b-2 font-medium text-sm whitespace-nowrap`}
              >
                Branding & Theme
              </button>
               {/* Whitelist Tab (Owner Only) */}
               {isOwner && (
                 <button
                   onClick={() => setActiveTab('whitelist')}
                   className={`${
                     activeTab === 'whitelist'
                       ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                       : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                   } px-6 py-4 text-center border-b-2 font-medium text-sm whitespace-nowrap`}
                 >
                   Whitelist
                 </button>
               )}
              {/* Export Configuration Tab */}
              <button
                onClick={() => setActiveTab('exportConfig')}
                className={`${
                  activeTab === 'exportConfig'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                } px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center relative whitespace-nowrap`} // Added whitespace-nowrap
              >
                Export Configuration
              </button>
            </nav>
          </div>
          
          {/* Platform Settings */}
          {activeTab === 'platform' && (
            <div className="p-6">
              <div className="space-y-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform Fee Address
                    {!isWhitelisted && <span className="ml-2 text-yellow-500 text-xs">(Admin only)</span>}
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      className={`w-full p-2 border ${
                        isWhitelisted 
                          ? 'border-gray-300 dark:border-gray-600 dark:bg-gray-700' 
                          : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'
                      } dark:text-white rounded focus:ring-blue-500 focus:border-blue-500 ${
                        !isWhitelisted ? 'cursor-not-allowed' : ''
                      }`}
                      placeholder="0x..."
                      value={currentConfig.platformFeeAddress} // Use state directly
                      onChange={handleAddressChange}
                      disabled={!isWhitelisted}
                    />
                    {!isWhitelisted && (
                      <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  {!isWhitelisted && (
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Only whitelisted admins can modify the platform fee address.
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Platform Fee Percentage
                    {!isWhitelisted && <span className="ml-2 text-yellow-500 text-xs">(Admin only)</span>}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100" // Consider adding validation for range
                    className={`w-full p-2 border ${
                      isWhitelisted 
                        ? 'border-gray-300 dark:border-gray-600 dark:bg-gray-700' 
                        : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'
                    } dark:text-white rounded focus:ring-blue-500 focus:border-blue-500 ${
                      !isWhitelisted ? 'cursor-not-allowed' : ''
                    }`}
                    value={currentConfig.platformFeePercentage} // Use state directly
                    onChange={handleFeeChange}
                    disabled={!isWhitelisted}
                  />
                  {/* Add note about valid range? */}
                   <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Enter a value between 0 and 100.
                    </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Networks Tab (formerly Wallet Options) */}
          {activeTab === 'networks' && (
            <div className="p-6">
               {/* Re-add Wallet Provider Section */}
               <div className="mb-8 pb-6 border-b dark:border-gray-700"> 
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                   Supported Wallet Providers
                 </h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                   Enable or disable wallet connection options. Changes require export and redeploy.
                 </p>
                 <div className="space-y-2">
                   <div className="flex items-center">
                     <input
                       type="checkbox"
                       id="metamask"
                       className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                       checked={currentConfig.wallets.metamask} // Use state directly
                       onChange={() => toggleWallet('metamask')}
                     />
                     <label htmlFor="metamask" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                       MetaMask
                     </label>
                   </div>
                   <div className="flex items-center">
                     <input
                       type="checkbox"
                       id="coinbase"
                       className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                       checked={currentConfig.wallets.coinbase} // Use state directly
                       onChange={() => toggleWallet('coinbase')}
                     />
                     <label htmlFor="coinbase" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                       Coinbase Wallet
                     </label>
                   </div>
                 </div>
               </div>

               {/* Supported Networks Section */}
               <div>
                 <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                   Supported Networks
                 </h3>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                   Enable or disable networks available in the dashboard. Changes require export and redeploy.
                 </p>
                 
                 <div className="space-y-3">
                   {/* MODIFIED: Iterate over currentConfig.networks.configuredNetworks */}
                   {currentConfig?.networks?.configuredNetworks?.map((network) => {
                       // Ensure network and chainId exist before rendering
                       if (!network || typeof network.chainId === 'undefined') return null; 
                       
                       const isEnabled = network.isEnabled; // Get state directly
                       
                       return (
                         <div key={network.chainId} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                           <div>
                             <p className="text-sm font-medium dark:text-white">{network.name}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400">Chain ID: {network.chainId}</p>
                           </div>
                           <div className="flex items-center">
                             <label htmlFor={`network-toggle-${network.chainId}`} className="mr-2 text-sm text-gray-600 dark:text-gray-400">
                               {isEnabled ? 'Enabled' : 'Disabled'}
                             </label>
                             <input
                               type="checkbox"
                               id={`network-toggle-${network.chainId}`}
                               className="toggle-checkbox h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                               checked={isEnabled}
                               // MODIFIED: Use new toggle function
                               onChange={() => toggleNetworkInArray(network.chainId)} 
                             />
                           </div>
                         </div>
                       );
                   })}
                 </div>
               </div>
               
            </div>
          )}
          
          {/* Branding & Theme Tab */}
          {activeTab === 'brandingTheme' && currentConfig && (
             <BrandingThemeTab 
                currentConfig={currentConfig}
                theme={theme}
                setTheme={setTheme}
                updateConfig={updateConfig}
                handleTitleChange={handleTitleChange}
             />
          )}
          
          {/* Whitelist Tab (Conditionally Rendered) */}
          {isOwner && activeTab === 'whitelist' && (
             <WhitelistTab 
                whitelist={whitelist}
                addToWhitelist={addToWhitelist}
                removeOwner={removeOwner}
                isOwnerCheck={isOwner} // Pass isOwner check result
             /> 
          )}

          {/* Export Config Tab */}
          {activeTab === 'exportConfig' && (
              <ExportConfigTab /> 
          )}
          
          {/* Action Buttons */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-end"> {/* Changed justify-between to justify-end */}
            <div className="space-x-2">
              {hasChanges && (
                <>
                  <button
                    onClick={discardChanges}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    Discard Changes
                  </button>
                  {/* This button's primary action is export */}
                  <button 
                    onClick={saveChanges} // This now triggers the export
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Save & Export Config 
                  </button>
                </>
              )}
              {!hasChanges && (
                 <button 
                    onClick={saveChanges} // Allow exporting even if no detected changes
                    className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                    title="Export the current configuration as dashboard-config.json"
                  >
                    Export Current Config
                  </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Removed Whitelist management section - owner only */}
        {/* {isOwner && (
          <div className="mt-8 p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Admin Access Control
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Manage which wallet addresses have administrative access to this dashboard. Changes require exporting the config and redeploying.
            </p>
            <button
              onClick={() => setIsWhitelistModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Manage Admin Access
            </button>
          </div>
        )} */}
        
        {/* Removed Whitelist modal invocation */}
        {/* {currentConfig && !isWhitelistLoading && ( 
           <WhitelistManagementModal
              isOpen={isWhitelistModalOpen}
              onClose={() => setIsWhitelistModalOpen(false)}
            />
        )} */}
      </div>
    </>
  );
};

export default SettingsPage; // Export as default page component
