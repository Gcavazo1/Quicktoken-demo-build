import React, { useState, useEffect } from 'react';
import HelpIcon from '../components/HelpIcon';
import WhitelistSetupStep from '../components/setup/WhitelistSetupStep';
import ConfigExportStep from '../components/setup/ConfigExportStep';
import Step8Complete from '../components/setup/Step8Complete';
import { WhitelistConfig, WhitelistEntry } from '../contexts/WhitelistContext';
import { useWallet } from '../hooks/useWallet';

// Configuration type definition
export interface QuickTokenConfig {
  platformFeeAddress: string;
  platformFeePercentage: number;
  theme: 'light' | 'dark';
  infuraId?: string;
  branding: {
    title: string;
  };
  wallets: {
    metamask: boolean;
    coinbase: boolean;
  };
  networks: {
    mainnet: boolean;
    goerli: boolean;
    sepolia: boolean;
    polygon: boolean;
    mumbai: boolean;
    arbitrum: boolean;
    optimism: boolean;
    configuredNetworks: Array<{
      name: string;
      chainId: string;
      rpcUrl: string;
      explorerUrl: string;
      isEnabled: boolean;
      shortName?: string;
      currencySymbol?: string;
      testnet?: boolean;
    }>;
  };
  security?: {
    whitelistEnabled: boolean;
    lastWhitelistUpdate?: number;
  };
}

// Default configuration
const defaultConfig: QuickTokenConfig = {
  platformFeeAddress: '',
  platformFeePercentage: 20,
  theme: 'light',
  branding: {
    title: 'QuickToken Dashboard'
  },
  wallets: {
    metamask: true,
    coinbase: true,
  },
  networks: {
    mainnet: true,
    goerli: true,
    sepolia: true,
    polygon: true,
    mumbai: true,
    arbitrum: false,
    optimism: false,
    configuredNetworks: []
  },
  security: {
    whitelistEnabled: true
  }
};

// Initial empty whitelist config
const initialWhitelistConfig: WhitelistConfig = {
  entries: [],
  ownerAddress: '',
  lastModified: 0,
  whitelistEnabled: true
};

interface SetupWizardProps {
  onComplete: (config: QuickTokenConfig) => void;
}

// Welcome screen component with updated step count
const WelcomeScreen: React.FC<{onNext: () => void}> = ({ onNext }) => {
  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4 text-center">Welcome to QuickToken!</h2>
      <p className="mb-6 text-gray-600 text-center max-w-lg mx-auto">
        Let's set up your token deployment dashboard with a few simple steps.
        This will help configure the platform for your specific needs.
      </p>
      
      <div className="step-indicator mb-8">
        <div className="step-item">
          <div className="step-circle active">1</div>
          <span className="step-label">Platform Settings</span>
        </div>
        
        <div className="step-connector active"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">2</div>
          <span className="step-label">Wallet Options</span>
        </div>
        
        <div className="step-connector"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">3</div>
          <span className="step-label">Branding Settings</span>
        </div>
        
        <div className="step-connector"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">4</div>
          <span className="step-label">Network Settings</span>
        </div>
        
        <div className="step-connector"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">5</div>
          <span className="step-label">Admin Access</span>
        </div>
        
        <div className="step-connector"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">6</div>
          <span className="step-label">Whitelist Setup</span>
        </div>
        
        <div className="step-connector"></div>
        
        <div className="step-item">
          <div className="step-circle inactive">7</div>
          <span className="step-label">Verify & Export</span>
        </div>
      </div>
      
      <div className="flex justify-center">
        <button
          onClick={onNext}
          className="btn btn-primary"
        >
          Let's Begin →
        </button>
      </div>
    </div>
  );
};

// Platform settings component
const PlatformSettings: React.FC<{
  config: QuickTokenConfig;
  setConfig: (config: QuickTokenConfig) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ config, setConfig, onNext, onBack }) => {
  const [error, setError] = useState('');
  const [addressTouched, setAddressTouched] = useState(false);
  
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const address = e.target.value;
    setConfig({
      ...config,
      platformFeeAddress: address
    });
    
    // Clear error if address is valid or empty
    if (address === '' || /^0x[a-fA-F0-9]{40}$/.test(address)) {
      setError('');
    } else if (addressTouched) {
      setError('Please enter a valid Ethereum address (0x followed by 40 hex characters)');
    }
    
    if (!addressTouched) {
      setAddressTouched(true);
    }
  };
  
  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      platformFeePercentage: parseInt(e.target.value)
    });
  };
  
  const validateAndContinue = () => {
    // If address is provided, validate it
    if (config.platformFeeAddress && !/^0x[a-fA-F0-9]{40}$/.test(config.platformFeeAddress)) {
      setError('Please enter a valid Ethereum address');
      return;
    }
    
    // If fee percentage is outside reasonable limits
    if (config.platformFeePercentage < 0 || config.platformFeePercentage > 50) {
      setError('Platform fee percentage must be between 0 and 50%');
      return;
    }
    
    onNext();
  };
  
  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4">Platform Settings</h2>
      <p className="mb-6 text-gray-600">
        Configure the platform fee settings for your QuickToken deployment.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-4 mb-6">
        <div className="form-group">
          <label className="form-label">
            Platform Fee Address
          </label>
          <input
            type="text"
            className={`form-input ${error ? 'error' : ''}`}
            placeholder="0x..."
            value={config.platformFeeAddress}
            onChange={handleAddressChange}
          />
          <p className="form-helper">
            This address will receive the platform portion of mint fees
          </p>
        </div>
        
        <div className="form-group">
          <label className="form-label">
            Platform Fee Percentage
            <HelpIcon 
              position="right"
              content={
                <div>
                  <p>Recommended: 10-30%</p>
                </div>
              }
            />
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="50"
              className="w-full mr-4"
              value={config.platformFeePercentage}
              onChange={handleFeeChange}
            />
            <span className="w-12 text-center font-medium">{config.platformFeePercentage}%</span>
          </div>
          <div className="form-helper">
            Percentage of mint fees that go to the platform
          </div>
          <div className="mt-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded p-2">
            <p>Example calculation: If mint fee is 2.5% and platform fee is 20%, the platform receives 0.5% of mint value</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back
        </button>
        <button
          onClick={validateAndContinue}
          className="btn btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Wallet settings component
const WalletSettings: React.FC<{
  config: QuickTokenConfig;
  setConfig: (config: QuickTokenConfig) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ config, setConfig, onNext, onBack }) => {
  const toggleWallet = (wallet: keyof QuickTokenConfig['wallets']) => {
    setConfig({
      ...config,
      wallets: {
        ...config.wallets,
        [wallet]: !config.wallets[wallet]
      }
    });
  };
  
  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4">Wallet Integration</h2>
      <p className="mb-6 text-gray-600">
        Choose which wallet providers to support in your dashboard.
      </p>
      
      <div className="space-y-4 mb-6">
        <div className="wallet-option">
          <input
            type="checkbox"
            id="metamask"
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
            checked={config.wallets.metamask}
            onChange={() => toggleWallet('metamask')}
          />
          <label htmlFor="metamask" className="flex items-center cursor-pointer flex-grow">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/3/36/MetaMask_Fox.svg" 
              alt="MetaMask" 
              className="wallet-icon"
            />
            <span className="wallet-label">MetaMask</span>
          </label>
        </div>
        
        <div className="wallet-option">
          <input
            type="checkbox"
            id="coinbase"
            className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
            checked={config.wallets.coinbase}
            onChange={() => toggleWallet('coinbase')}
          />
          <label htmlFor="coinbase" className="flex items-center cursor-pointer flex-grow">
            <img 
              src="https://images.seeklogo.com/logo-png/44/1/coinbase-coin-logo-png_seeklogo-444569.png" 
              alt="Coinbase Wallet" 
              className="wallet-icon"
            />
            <span className="wallet-label">Coinbase Wallet</span>
          </label>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back
        </button>
        <button
          onClick={onNext}
          className="btn btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Branding settings component
const BrandingSettings: React.FC<{
  config: QuickTokenConfig;
  setConfig: (config: QuickTokenConfig) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ config, setConfig, onNext, onBack }) => {
  const [error, setError] = useState('');
  
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfig({
      ...config,
      branding: {
        ...config.branding,
        title: e.target.value
      }
    });
    
    if (e.target.value.trim() === '') {
      setError('Dashboard title cannot be empty');
    } else {
      setError('');
    }
  };
  
  const handleThemeChange = (theme: 'light' | 'dark') => {
    setConfig({
      ...config,
      theme
    });
  };
  
  const validateAndContinue = () => {
    // Validate title
    if (!config.branding.title || config.branding.title.trim() === '') {
      setError('Dashboard title cannot be empty');
      return;
    }
    
    onNext();
  };
  
  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4">Dashboard Appearance</h2>
      <p className="mb-6 text-gray-600">
        Customize the appearance of your QuickToken dashboard.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="space-y-6 mb-6">
        <div className="form-group">
          <label className="form-label">
            Dashboard Title
            <HelpIcon 
              position="right"
              content={
                <div>
                  <p>This will be displayed in the header of your dashboard</p>
                </div>
              }
            />
          </label>
          <input
            type="text"
            className={`form-input ${error && config.branding.title.trim() === '' ? 'error' : ''}`}
            placeholder="QuickToken Dashboard"
            value={config.branding.title}
            onChange={handleTitleChange}
          />
          <p className="form-helper">
            This will be displayed in the header of your dashboard
          </p>
        </div>
        
        <div className="form-group">
          <label className="form-label mb-2">
            Dashboard Theme
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="button"
              className={`theme-option ${config.theme === 'light' ? 'selected' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              <div className="relative">
                <div className="theme-preview light-theme">
                  <div className="theme-header"></div>
                  <div className="theme-content">
                    <div className="theme-card"></div>
                    <div className="theme-card"></div>
                  </div>
                </div>
                {config.theme === 'light' && (
                  <div className="theme-selected-indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="theme-label">Light Theme</div>
            </button>
            
            <button
              type="button"
              className={`theme-option ${config.theme === 'dark' ? 'selected' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              <div className="relative">
                <div className="theme-preview dark-theme">
                  <div className="theme-header"></div>
                  <div className="theme-content">
                    <div className="theme-card"></div>
                    <div className="theme-card"></div>
                  </div>
                </div>
                {config.theme === 'dark' && (
                  <div className="theme-selected-indicator">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
              </div>
              <div className="theme-label">Dark Theme</div>
            </button>
          </div>
          <p className="form-helper mt-2">
            Choose between light and dark mode for your dashboard
          </p>
        </div>
      </div>
      
      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back
        </button>
        <button
          onClick={validateAndContinue}
          className="btn btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Network settings component
const NetworkSettings: React.FC<{
  config: QuickTokenConfig;
  setConfig: (config: QuickTokenConfig) => void;
  onNext: () => void;
  onBack: () => void;
}> = ({ config, setConfig, onNext, onBack }) => {
  const [networkForm, setNetworkForm] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    explorerUrl: ''
  });
  
  const [errors, setErrors] = useState({
    name: '',
    chainId: '',
    rpcUrl: '',
    explorerUrl: '',
    general: ''
  });

  // Common network chain IDs
  const commonChainIds = [
    '1', '5', '11155111', '56', '97', '137', '80001', '43114', '250',
    '10', '420', '42161', '8453', '84531', '100', '324', '59144', '534352'
  ];

  // Predefined networks
  const predefinedNetworks = [
    // Mainnets
    {
      name: 'Ethereum Mainnet',
      chainId: '1',
      rpcUrl: 'https://mainnet.infura.io/v3/your-infura-key',
      explorerUrl: 'https://etherscan.io'
    },
    {
      name: 'Polygon',
      chainId: '137',
      rpcUrl: 'https://polygon-rpc.com',
      explorerUrl: 'https://polygonscan.com'
    },
    {
      name: 'BSC',
      chainId: '56',
      rpcUrl: 'https://bsc-dataseed.binance.org',
      explorerUrl: 'https://bscscan.com'
    },
    {
      name: 'Base',
      chainId: '8453',
      rpcUrl: 'https://mainnet.base.org',
      explorerUrl: 'https://basescan.org'
    },
    {
      name: 'Optimism',
      chainId: '10',
      rpcUrl: 'https://mainnet.optimism.io',
      explorerUrl: 'https://optimistic.etherscan.io'
    },
    {
      name: 'Arbitrum',
      chainId: '42161',
      rpcUrl: 'https://arb1.arbitrum.io/rpc',
      explorerUrl: 'https://arbiscan.io'
    },
    {
      name: 'Avalanche',
      chainId: '43114',
      rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',
      explorerUrl: 'https://snowtrace.io'
    },
    {
      name: 'Fantom',
      chainId: '250',
      rpcUrl: 'https://rpcapi.fantom.network',
      explorerUrl: 'https://ftmscan.com'
    },
    
    // Testnets
    {
      name: 'Sepolia Testnet',
      chainId: '11155111',
      rpcUrl: 'https://sepolia.infura.io/v3/your-infura-key',
      explorerUrl: 'https://sepolia.etherscan.io'
    },
    {
      name: 'Goerli Testnet',
      chainId: '5',
      rpcUrl: 'https://goerli.infura.io/v3/your-infura-key',
      explorerUrl: 'https://goerli.etherscan.io'
    },
    {
      name: 'Mumbai (Polygon Testnet)',
      chainId: '80001',
      rpcUrl: 'https://rpc-mumbai.maticvigil.com',
      explorerUrl: 'https://mumbai.polygonscan.com'
    },
    {
      name: 'Base Goerli',
      chainId: '84531',
      rpcUrl: 'https://goerli.base.org',
      explorerUrl: 'https://goerli.basescan.org'
    },
    
    // Optional extras
    {
      name: 'Gnosis Chain',
      chainId: '100',
      rpcUrl: 'https://rpc.gnosischain.com',
      explorerUrl: 'https://gnosisscan.io'
    },
    {
      name: 'zkSync Era',
      chainId: '324',
      rpcUrl: 'https://mainnet.era.zksync.io',
      explorerUrl: 'https://explorer.zksync.io'
    },
    {
      name: 'Linea',
      chainId: '59144',
      rpcUrl: 'https://rpc.linea.build',
      explorerUrl: 'https://lineascan.build'
    },
    {
      name: 'Scroll',
      chainId: '534352',
      rpcUrl: 'https://rpc.scroll.io',
      explorerUrl: 'https://scrollscan.com'
    }
  ];

  const validateNetworkName = (value: string) => {
    if (!value || value.trim() === '') {
      return 'Network name is required';
    }
    return '';
  };

  const validateChainId = (value: string) => {
    // Chain ID must be a valid number
    if (!value || value.trim() === '') {
      return 'Chain ID is required';
    }
    
    if (isNaN(Number(value))) {
      return 'Chain ID must be a valid number';
    }
    
    // Check if chain ID already exists in configured networks
    const isDuplicate = config.networks.configuredNetworks.some(
      network => network.chainId === value
    );
    
    if (isDuplicate) {
      return 'This chain ID is already configured';
    }
    
    return '';
  };

  const validateUrl = (value: string, type: 'rpc' | 'explorer') => {
    // Basic URL validation
    if (!value || value.trim() === '') {
      return `${type === 'rpc' ? 'RPC URL' : 'Explorer URL'} is required`;
    }
    
    try {
      const url = new URL(value);
      
      // Check for proper protocol
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return 'URL must use HTTP or HTTPS protocol';
      }
      
      // Additional validation for RPC URLs
      if (type === 'rpc' && !url.hostname) {
        return 'RPC URL must include a valid hostname';
      }
      
      return '';
    } catch (e) {
      return `Please enter a valid URL (e.g., https://${type === 'rpc' ? 'mainnet.infura.io/v3/...' : 'etherscan.io'})`;
    }
  };

  const handleNetworkFormChange = (field: string, value: string) => {
    setNetworkForm({
      ...networkForm,
      [field]: value
    });
    
    // Validate the field
    let error = '';
    switch (field) {
      case 'name':
        error = validateNetworkName(value);
        break;
      case 'chainId':
        error = validateChainId(value);
        break;
      case 'rpcUrl':
        error = validateUrl(value, 'rpc');
        break;
      case 'explorerUrl':
        error = validateUrl(value, 'explorer');
        break;
    }
    
    setErrors({
      ...errors,
      [field]: error
    });
  };

  const addNetwork = () => {
    // Validate all fields
    const nameError = validateNetworkName(networkForm.name);
    const chainIdError = validateChainId(networkForm.chainId);
    const rpcUrlError = validateUrl(networkForm.rpcUrl, 'rpc');
    const explorerUrlError = validateUrl(networkForm.explorerUrl, 'explorer');
    
    if (nameError || chainIdError || rpcUrlError || explorerUrlError) {
      setErrors({
        ...errors,
        name: nameError,
        chainId: chainIdError,
        rpcUrl: rpcUrlError,
        explorerUrl: explorerUrlError
      });
      return;
    }
    
    // Add the network to the list
    const updatedNetworks = [...config.networks.configuredNetworks, {
      name: networkForm.name,
      chainId: networkForm.chainId,
      rpcUrl: networkForm.rpcUrl,
      explorerUrl: networkForm.explorerUrl,
      isEnabled: true,
      shortName: '',
      currencySymbol: '',
      testnet: false
    }];
    
    setConfig({
      ...config,
      networks: {
        ...config.networks,
        configuredNetworks: updatedNetworks
      }
    });
    
    // Reset the form
    setNetworkForm({
      name: '',
      chainId: '',
      rpcUrl: '',
      explorerUrl: ''
    });
    
    setErrors({
      name: '',
      chainId: '',
      rpcUrl: '',
      explorerUrl: '',
      general: ''
    });
  };

  const removeNetwork = (index: number) => {
    const updatedNetworks = [...config.networks.configuredNetworks];
    updatedNetworks.splice(index, 1);
    
    setConfig({
      ...config,
      networks: {
        ...config.networks,
        configuredNetworks: updatedNetworks
      }
    });
  };

  const toggleNetworkEnabled = (index: number) => {
    const updatedNetworks = [...config.networks.configuredNetworks];
    updatedNetworks[index] = {
      ...updatedNetworks[index],
      isEnabled: !updatedNetworks[index].isEnabled
    };
    
    setConfig({
      ...config,
      networks: {
        ...config.networks,
        configuredNetworks: updatedNetworks
      }
    });
  };

  const selectPredefinedNetwork = (network: typeof predefinedNetworks[0]) => {
    setNetworkForm({
      name: network.name,
      chainId: network.chainId,
      rpcUrl: network.rpcUrl,
      explorerUrl: network.explorerUrl
    });
    
    setErrors({
      name: '',
      chainId: '',
      rpcUrl: '',
      explorerUrl: '',
      general: ''
    });
  };

  const validateAndContinue = () => {
    // Make sure at least one network is configured
    if (config.networks.configuredNetworks.length === 0) {
      setErrors({
        ...errors,
        general: 'Please configure at least one network before continuing'
      });
      return;
    }
    
    // Make sure at least one network is enabled
    const hasEnabledNetwork = config.networks.configuredNetworks.some(network => network.isEnabled);
    if (!hasEnabledNetwork) {
      setErrors({
        ...errors,
        general: 'Please enable at least one network before continuing'
      });
      return;
    }
    
    onNext();
  };

  // Add this computed property to check if the form is valid
  const isFormValid = 
    networkForm.name.trim() !== '' && 
    networkForm.chainId.trim() !== '' && 
    networkForm.rpcUrl.trim() !== '' && 
    networkForm.explorerUrl.trim() !== '' && 
    !errors.name && 
    !errors.chainId && 
    !errors.rpcUrl && 
    !errors.explorerUrl;

  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4">Network Settings</h2>
      <p className="mb-6 text-gray-600">
        Configure the blockchain networks you want to support for token deployment.
      </p>
      
      <div className="bg-blue-50 border border-blue-300 text-blue-800 p-4 rounded mb-6">
        <h3 className="font-semibold mb-2 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          How to Add Networks
        </h3>
        <ol className="list-decimal ml-5 space-y-1">
          <li>Select a network from the Quick Select options <strong>OR</strong> fill in the network details manually</li>
          <li>Click the <strong>Add Network</strong> button to add it to your configuration</li>
          <li>Repeat for each network you want to support</li>
          <li>Networks will appear in the list below where you can enable/disable or remove them</li>
        </ol>
        <p className="mt-2 font-medium text-blue-900">Important: You must add networks one at a time. Complete each network's details and click "Add Network" before configuring the next one.</p>
      </div>
      
      {errors.general && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {errors.general}
        </div>
      )}
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          Quick Select
          <HelpIcon 
            position="right"
            content={
              <div>
                <p>Choose from popular blockchain networks to quickly add them to your configuration.</p>
                <p className="mt-1">These presets include recommended RPC URLs and block explorers.</p>
                <p className="mt-1">You can modify the details after selecting if needed.</p>
                <p className="mt-2 font-medium">Remember: You still need to click "Add Network" after selecting to add it to your configuration.</p>
              </div>
            }
          />
        </h3>
        
        <div className="mb-5">
          <h4 className="text-md font-medium mb-3 text-gray-700">Mainnet Networks:</h4>
          <div className="flex flex-wrap gap-2">
            {predefinedNetworks.filter(network => !network.name.toLowerCase().includes('testnet')).slice(0, 8).map((network, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectPredefinedNetwork(network)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center min-w-[120px]"
              >
                <span className="font-medium">{network.name.replace(' Mainnet', '')}</span>
                <span className="ml-2 text-xs text-gray-500">({network.chainId})</span>
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-5">
          <h4 className="text-md font-medium mb-3 text-gray-700">Testnet Networks:</h4>
          <div className="flex flex-wrap gap-2">
            {predefinedNetworks.filter(network => network.name.toLowerCase().includes('testnet')).map((network, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectPredefinedNetwork(network)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center min-w-[120px]"
              >
                <span className="font-medium">{network.name.replace(' Testnet', '')}</span>
                <span className="ml-2 text-xs text-gray-500">({network.chainId})</span>
              </button>
            ))}
          </div>
        </div>
        
        <div>
          <h4 className="text-md font-medium mb-3 text-gray-700">Additional Networks:</h4>
          <div className="flex flex-wrap gap-2">
            {predefinedNetworks.filter(network => 
              !network.name.toLowerCase().includes('testnet') && 
              !['Ethereum Mainnet', 'Polygon', 'BSC', 'Base', 'Optimism', 'Arbitrum', 'Avalanche', 'Fantom'].includes(network.name)
            ).map((network, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectPredefinedNetwork(network)}
                className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors flex items-center min-w-[120px]"
              >
                <span className="font-medium">{network.name}</span>
                <span className="ml-2 text-xs text-gray-500">({network.chainId})</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          Network Details
          <HelpIcon 
            position="right"
            content={
              <div>
                <p>Add a custom blockchain network to your configuration.</p>
                <p className="mt-1"><strong>Important:</strong> You must add each network individually by completing this form and clicking "Add Network".</p>
                <p className="mt-1">To configure multiple networks, repeat this process for each one.</p>
              </div>
            }
          />
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Network Name
              <HelpIcon 
                position="right"
                content={
                  <div>
                    <p>A descriptive name for the blockchain network.</p>
                    <p className="mt-1">Examples: "Ethereum Mainnet", "Polygon Mumbai Testnet"</p>
                    <p className="mt-1">This name will be displayed in the network selector dropdown.</p>
                  </div>
                }
              />
            </label>
            <input
              type="text"
              value={networkForm.name}
              onChange={(e) => handleNetworkFormChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="e.g. Ethereum Mainnet"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chain ID
              <HelpIcon 
                position="right"
                content={
                  <div>
                    <p>The numeric identifier for this blockchain network.</p>
                    <p className="mt-1">Examples:</p>
                    <ul className="list-disc ml-5">
                      <li>Ethereum Mainnet: 1</li>
                      <li>Polygon: 137</li>
                      <li>BSC: 56</li>
                    </ul>
                    <p className="mt-1">This must be exact - incorrect Chain IDs will cause connection problems.</p>
                  </div>
                }
              />
            </label>
            <input
              type="text"
              value={networkForm.chainId}
              onChange={(e) => handleNetworkFormChange('chainId', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.chainId ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="e.g. 1 (for Ethereum Mainnet)"
            />
            {errors.chainId && <p className="mt-1 text-sm text-red-500">{errors.chainId}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              RPC URL
              <HelpIcon 
                position="right"
                content={
                  <div>
                    <p>The endpoint URL used to connect to the blockchain network.</p>
                    <p className="mt-1">Format: https://[domain].[tld]/[path]</p>
                    <p className="mt-1">Examples:</p>
                    <ul className="list-disc ml-5">
                      <li>https://mainnet.infura.io/v3/YOUR_API_KEY</li>
                      <li>https://polygon-rpc.com</li>
                    </ul>
                    <p className="mt-1">You can get RPC URLs from providers like Infura, Alchemy, or public RPC endpoints.</p>
                  </div>
                }
              />
            </label>
            <input
              type="text"
              value={networkForm.rpcUrl}
              onChange={(e) => handleNetworkFormChange('rpcUrl', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.rpcUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="e.g. https://mainnet.infura.io/v3/YOUR_API_KEY"
            />
            {errors.rpcUrl && <p className="mt-1 text-sm text-red-500">{errors.rpcUrl}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Block Explorer URL
              <HelpIcon 
                position="right"
                content={
                  <div>
                    <p>The URL of the blockchain explorer for this network.</p>
                    <p className="mt-1">Examples:</p>
                    <ul className="list-disc ml-5">
                      <li>https://etherscan.io</li>
                      <li>https://polygonscan.com</li>
                      <li>https://bscscan.com</li>
                    </ul>
                    <p className="mt-1">This allows users to view their transactions and token details on the explorer.</p>
                  </div>
                }
              />
            </label>
            <input
              type="text"
              value={networkForm.explorerUrl}
              onChange={(e) => handleNetworkFormChange('explorerUrl', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${errors.explorerUrl ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
              placeholder="e.g. https://etherscan.io"
            />
            {errors.explorerUrl && <p className="mt-1 text-sm text-red-500">{errors.explorerUrl}</p>}
          </div>
        </div>
        
        <button
          type="button"
          onClick={addNetwork}
          disabled={!isFormValid}
          className={`px-4 py-2 rounded-md ${
            isFormValid 
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Network
          </span>
        </button>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Your Configured Networks</h3>
        
        {config.networks.configuredNetworks.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-md p-6 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="48" height="48">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
            </svg>
            <p className="text-gray-500">No networks configured yet.</p>
            <p className="text-gray-500 text-sm">Use the form above to add blockchain networks.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Network</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Chain ID</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {config.networks.configuredNetworks.map((network, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{network.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {network.chainId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${network.isEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                        {network.isEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => toggleNetworkEnabled(index)}
                        className={`text-xs mr-3 ${network.isEnabled ? 'text-yellow-600 hover:text-yellow-900' : 'text-green-600 hover:text-green-900'}`}
                      >
                        {network.isEnabled ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => removeNetwork(index)}
                        className="text-xs text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      <div className="flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-secondary"
        >
          Back
        </button>
        <button
          type="button"
          onClick={validateAndContinue}
          className="btn btn-primary"
        >
          Continue
        </button>
      </div>
    </div>
  );
};

// Main SetupWizard component with updated step count
const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [config, setConfig] = useState<QuickTokenConfig>({...defaultConfig});
  const { disconnectWallet } = useWallet();
  // Add state for temporary whitelist configuration during setup
  const [tempWhitelistConfig, setTempWhitelistConfig] = useState<WhitelistConfig>(() => {
    // Try loading from localStorage initially, otherwise use default
    try {
      const saved = localStorage.getItem('quicktoken_whitelist_config');
      if (saved && saved !== 'undefined' && saved !== 'null') {
        const parsed = JSON.parse(saved);
        // Basic validation
        if (parsed && Array.isArray(parsed.entries)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error("Error parsing initial whitelist config:", error);
    }
    return initialWhitelistConfig;
  });
  
  const nextStep = () => setCurrentStep(currentStep + 1);
  const prevStep = () => setCurrentStep(currentStep - 1);
  
  // Handle whitelist setup step completion
  const handleWhitelistComplete = (finalWhitelistConfig: WhitelistConfig) => {
    console.log("Whitelist step complete. Saving temp config:", finalWhitelistConfig);
    // Update the temporary whitelist state within the wizard
    setTempWhitelistConfig(finalWhitelistConfig);
    
    // Update main config with security flags
    const updatedConfig = {
      ...config,
      security: {
        ...config.security,
        whitelistEnabled: true,
        lastWhitelistUpdate: finalWhitelistConfig.lastModified || Date.now(),
      }
    };
    setConfig(updatedConfig);
    
    // Persist the *temporary* config to localStorage immediately so Step 7 can read it via context
    // This assumes WhitelistContext loads on mount/address change
    try {
      localStorage.setItem('quicktoken_whitelist_config', JSON.stringify(finalWhitelistConfig));
      console.log("Saved temp whitelist to localStorage for Step 7.");
    } catch (error) {
      console.error("Failed to save temporary whitelist to localStorage:", error);
    }
    
    nextStep(); // Move to verification & export step
  };
  
  // Function to handle completion of the setup process - Added disconnectWallet call
  const handleCompleteSetup = () => {
    disconnectWallet(); // Disconnect wallet before finalizing
    // The owner was verified in step 7, we just finalize here.
    const finalConfig = { ...config };
    // Save the final configuration (e.g., to localStorage)
    localStorage.setItem('quicktoken_config', JSON.stringify(finalConfig));
    localStorage.setItem('quicktoken_setup_complete', 'true');
    
    // Call the parent component's onComplete handler
    onComplete(finalConfig);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl max-w-xl w-full">
        <div className="border-b border-gray-200 p-4">
          <div className="flex justify-between items-center">
            <h1 className="text-lg font-bold text-gray-800">QuickToken Setup</h1>
            <div className="flex items-center">
              <span className="text-sm text-gray-500">Step {currentStep} of {totalSteps}</span>
              <div className="ml-3 flex space-x-1">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                  <div 
                    key={i} 
                    className={`w-2 h-2 rounded-full ${currentStep >= i ? 'bg-blue-600' : 'bg-gray-300'}`}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        <div>
          {currentStep === 1 && <WelcomeScreen onNext={nextStep} />}
          {currentStep === 2 && <PlatformSettings config={config} setConfig={setConfig} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 3 && <WalletSettings config={config} setConfig={setConfig} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 4 && <BrandingSettings config={config} setConfig={setConfig} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 5 && <NetworkSettings config={config} setConfig={setConfig} onNext={nextStep} onBack={prevStep} />}
          {currentStep === 6 && (
            <WhitelistSetupStep 
              onComplete={handleWhitelistComplete}
              initialConfig={tempWhitelistConfig}
              onBack={prevStep}
            />
          )}
          {currentStep === 7 && (
            <ConfigExportStep
              initialConfig={config}
              onProceed={nextStep}
              onBack={prevStep}
            />
          )}
          {currentStep === 8 && (
            <Step8Complete
              onComplete={handleCompleteSetup}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupWizard; 