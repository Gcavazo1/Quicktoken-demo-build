import React, { useState, useEffect } from 'react';
import { QuickTokenConfig } from './SetupWizard';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNotification } from '../contexts/NotificationContext';
import { useTheme } from '../contexts/ThemeContext';
import { useWhitelist } from '../contexts/WhitelistContext';
import AdminBadge from '../components/AdminBadge';
import WhitelistManagementModal from '../components/WhitelistManagementModal';
import ConfigExport from '../components/ConfigExport';
import ConfigImport from '../components/ConfigImport';

// Helper function to apply branding styles during preview
const applyPreviewStyles = (config: QuickTokenConfig) => {
  // Set dashboard title
  document.documentElement.style.setProperty('--dashboard-title', `'${config.branding.title || 'QuickToken Dashboard'}'`);
};

interface SettingsProps {
  config: QuickTokenConfig;
  onConfigUpdate: (config: QuickTokenConfig) => void;
  onReset: () => void;
  configSource?: 'local' | 'static' | 'none';
}

const Settings: React.FC<SettingsProps> = ({ 
  config, 
  onConfigUpdate, 
  onReset,
  configSource = 'local'
}) => {
  const [activeTab, setActiveTab] = useState<'platform' | 'wallet' | 'title' | 'theme' | 'config'>('platform');
  const [currentConfig, setCurrentConfig] = useState<QuickTokenConfig>(config);
  const [hasChanges, setHasChanges] = useState<boolean>(false);
  const [showResetDialog, setShowResetDialog] = useState<boolean>(false);
  const { showNotification } = useNotification();
  const { isWhitelisted, isOwner } = useWhitelist();
  const [isWhitelistModalOpen, setIsWhitelistModalOpen] = useState(false);
  
  // Reset form when config prop changes
  useEffect(() => {
    setCurrentConfig(config);
    setHasChanges(false);
  }, [config]);

  // Apply branding changes to CSS variables in real-time for preview
  useEffect(() => {
    if (activeTab === 'title') {
      applyPreviewStyles(currentConfig);
    }
  }, [activeTab, currentConfig.branding]);

  // Update current config and mark as changed
  const updateConfig = (updates: Partial<QuickTokenConfig>) => {
    const updatedConfig = { ...currentConfig, ...updates };
    setCurrentConfig(updatedConfig);
    setHasChanges(true);
  };

  // Save changes
  const saveChanges = () => {
    onConfigUpdate(currentConfig);
    setHasChanges(false);
    showNotification('Settings saved successfully', 'success');
  };

  // Discard changes
  const discardChanges = () => {
    setCurrentConfig(config);
    setHasChanges(false);
    showNotification('Changes discarded', 'info');
  };

  // Handle platform fee address change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow changes if the user is whitelisted
    if (isWhitelisted) {
      updateConfig({
        platformFeeAddress: e.target.value
      });
    }
  };
  
  // Handle platform fee percentage change
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow changes if the user is whitelisted
    if (isWhitelisted) {
      updateConfig({
        platformFeePercentage: parseInt(e.target.value)
      });
    }
  };

  // Toggle wallet provider
  const toggleWallet = (wallet: keyof QuickTokenConfig['wallets']) => {
    updateConfig({
      wallets: {
        ...currentConfig.wallets,
        [wallet]: !currentConfig.wallets[wallet]
      }
    });
  };
  
  // Handle Infura ID change
  const handleInfuraIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({
      infuraId: e.target.value
    });
  };

  // Toggle network
  const toggleNetwork = (network: keyof QuickTokenConfig['networks']) => {
    updateConfig({
      networks: {
        ...currentConfig.networks,
        [network]: !currentConfig.networks[network]
      }
    });
  };

  // Handle dashboard title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({
      branding: {
        ...currentConfig.branding,
        title: e.target.value
      }
    });
  };

  // Show reset confirmation dialog
  const confirmReset = () => {
    setShowResetDialog(true);
  };

  // Handle reset confirmation
  const handleResetConfirm = () => {
    setShowResetDialog(false);
    onReset();
    showNotification('Settings reset. Returning to setup wizard...', 'info');
  };

  // Handle reset cancellation
  const handleResetCancel = () => {
    setShowResetDialog(false);
  };

  // Dashboard Title Tab Content
  const DashboardTitleTab = () => (
    <div className="p-6">
      <div className="space-y-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Dashboard Title
          </label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-blue-500 focus:border-blue-500"
            placeholder="QuickToken Dashboard"
            value={currentConfig.branding.title}
            onChange={handleTitleChange}
          />
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            This title will appear in the dashboard header and browser tab
          </p>
        </div>
      </div>
    </div>
  );

  // Theme Tab Content
  const ThemeTab = () => {
    const { theme, setTheme } = useTheme();
    
    return (
      <div className="p-6">
        <div className="space-y-6 mb-6">
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Choose Theme
            </h3>
            <div className="mt-4 space-y-4">
              <div className="flex items-center space-x-4">
                {/* Light Theme Option */}
                <div 
                  onClick={() => setTheme('light')}
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
                  onClick={() => setTheme('dark')}
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
                Choose the theme that best suits your preferences. The theme will be applied to the entire dashboard.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Config Tab Content
  const ConfigTab = () => (
    <div className="p-6">
      <div className="space-y-6 mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
            Export Configuration
          </h3>
          
          <div className="bg-yellow-50 dark:bg-yellow-900/30 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg p-5 mb-6">
            <h4 className="font-bold text-lg text-yellow-800 dark:text-yellow-300 flex items-center mb-3">
              Critical Deployment Step
            </h4>
            <p className="mt-2 text-yellow-700 dark:text-yellow-400">
              This export step is <strong>required</strong> for your dashboard to function properly for all users. Without completing this step, 
              every user who visits your dashboard will see the setup wizard instead of your configured dashboard.
            </p>
            <ol className="list-decimal pl-5 mt-4 space-y-3 text-yellow-700 dark:text-yellow-400">
              <li className="font-medium">
                <strong>Download the configuration file</strong> using the export button below
                <p className="font-normal text-sm mt-1">This contains all your settings but no sensitive data</p>
              </li>
              <li className="font-medium">
                <strong>Add this file to your project repository</strong> at:
                <code className="block mt-1 px-3 py-2 bg-yellow-100 dark:bg-yellow-800/50 rounded-md text-sm font-mono w-full">
                  /public/dashboard-config.json
                </code>
              </li>
              <li className="font-medium">
                <strong>Deploy your changes</strong> to your hosting provider
                <p className="font-normal text-sm mt-1">Commit and push the changes, then deploy to make them live</p>
              </li>
              <li className="font-medium">
                <strong>Verify</strong> by opening in a new browser window
                <p className="font-normal text-sm mt-1">Confirm the setup wizard doesn't appear and your configuration is applied</p>
              </li>
            </ol>
            <div className="mt-6 p-4 bg-yellow-100 dark:bg-yellow-800/30 border border-yellow-300 dark:border-yellow-700 rounded-lg">
              <p className="flex items-center text-yellow-800 dark:text-yellow-300 font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                Important Note
              </p>
              <p className="mt-2 text-yellow-700 dark:text-yellow-400">
                Without this file in place, everyone visiting your dashboard will see the setup wizard instead of your 
                configured dashboard, requiring them to set up their own configuration.
              </p>
            </div>
          </div>
          
          <ConfigExport showTitle={false} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="mx-auto mt-4 max-w-4xl">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Settings</h1>
        {isWhitelisted && <AdminBadge className="ml-2" />}
      </div>
      
      {/* Debug info - remove in production */}
      <div className="mb-4 p-3 bg-gray-700 text-white rounded text-xs">
        <div>isWhitelisted: {String(isWhitelisted)}</div>
        <div>isOwner: {String(isOwner)}</div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-4 py-5 sm:px-6 border-b dark:border-gray-700">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white">
            Dashboard Settings
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Configure your QuickToken dashboard preferences
          </p>
        </div>
        
        {/* Tabs */}
        <div className="border-b dark:border-gray-700">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('platform')}
              className={`${
                activeTab === 'platform'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } px-6 py-4 text-center border-b-2 font-medium text-sm`}
            >
              Platform
            </button>
            <button
              onClick={() => setActiveTab('wallet')}
              className={`${
                activeTab === 'wallet'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } px-6 py-4 text-center border-b-2 font-medium text-sm`}
            >
              Wallet Options
            </button>
            <button
              onClick={() => setActiveTab('title')}
              className={`${
                activeTab === 'title'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } px-6 py-4 text-center border-b-2 font-medium text-sm`}
            >
              Dashboard Title
            </button>
            <button
              onClick={() => setActiveTab('theme')}
              className={`${
                activeTab === 'theme'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } px-6 py-4 text-center border-b-2 font-medium text-sm`}
            >
              Theme
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`${
                activeTab === 'config'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
              } px-6 py-4 text-center border-b-2 font-medium text-sm flex items-center relative`}
            >
              Export Configuration
              {isWhitelisted && configSource === 'local' && (
                <span className="absolute top-2 right-2 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                </span>
              )}
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
                    value={currentConfig.platformFeeAddress}
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
                  max="100"
                  className={`w-full p-2 border ${
                    isWhitelisted 
                      ? 'border-gray-300 dark:border-gray-600 dark:bg-gray-700' 
                      : 'border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800'
                  } dark:text-white rounded focus:ring-blue-500 focus:border-blue-500 ${
                    !isWhitelisted ? 'cursor-not-allowed' : ''
                  }`}
                  value={currentConfig.platformFeePercentage}
                  onChange={handleFeeChange}
                  disabled={!isWhitelisted}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Infura Project ID (Optional)
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Your Infura project ID"
                  value={currentConfig.infuraId || ''}
                  onChange={handleInfuraIdChange}
                />
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Providing an Infura ID can improve connection reliability
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Wallet Options */}
        {activeTab === 'wallet' && (
          <div className="p-6">
            <div className="space-y-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Supported Wallet Providers
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="metamask"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={currentConfig.wallets.metamask}
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
                    checked={currentConfig.wallets.coinbase}
                    onChange={() => toggleWallet('coinbase')}
                  />
                  <label htmlFor="coinbase" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    Coinbase Wallet
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="walletconnect"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    checked={currentConfig.wallets.walletconnect}
                    onChange={() => toggleWallet('walletconnect')}
                  />
                  <label htmlFor="walletconnect" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                    WalletConnect
                  </label>
                </div>
              </div>
              
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Supported Networks
                </span>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="mainnet"
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={currentConfig.networks.mainnet}
                      onChange={() => toggleNetwork('mainnet')}
                    />
                    <label htmlFor="mainnet" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Ethereum Mainnet
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Dashboard Title Tab */}
        {activeTab === 'title' && <DashboardTitleTab />}
        
        {/* Theme Tab */}
        {activeTab === 'theme' && <ThemeTab />}
        
        {/* Config Tab */}
        {activeTab === 'config' && <ConfigTab />}
        
        {/* Action Buttons */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700 flex justify-between">
          <div>
            {(isWhitelisted || isOwner) && (
              <button
                onClick={confirmReset}
                className="px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded-md hover:bg-red-200 dark:hover:bg-red-800 transition-colors"
              >
                Reset All Settings
              </button>
            )}
          </div>
          <div className="space-x-2">
            {hasChanges && (
              <>
                <button
                  onClick={discardChanges}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Discard Changes
                </button>
                <button
                  onClick={saveChanges}
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save Changes
                </button>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetDialog}
        title="Reset Setup Wizard"
        message="Are you sure you want to reset all settings? This will take you back to the setup wizard and all your current settings will be lost."
        confirmText="Yes, Reset"
        cancelText="Cancel"
        onConfirm={handleResetConfirm}
        onCancel={handleResetCancel}
        variant="danger"
      />
      
      {/* Whitelist management section - owner only */}
      {isOwner && (
        <div className="mt-8 p-6 bg-white dark:bg-gray-800 shadow rounded-lg">
          <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Admin Access Control
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Manage which wallet addresses have administrative access to this dashboard.
          </p>
          <button
            onClick={() => setIsWhitelistModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Manage Admin Access
          </button>
        </div>
      )}
      
      {/* Whitelist modal */}
      <WhitelistManagementModal
        isOpen={isWhitelistModalOpen}
        onClose={() => setIsWhitelistModalOpen(false)}
      />
    </div>
  );
};

export default Settings; 