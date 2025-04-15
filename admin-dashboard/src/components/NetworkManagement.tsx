import React, { useState, useEffect } from 'react';
import { useNetwork } from '../contexts/NetworkContext';
import { NetworkInfo } from '../shared/constants/networks';

interface NetworkManagementProps {
  className?: string;
}

// Helper function to check if currency is an object with the required properties
const isCurrencyObject = (currency: any): currency is { name: string; symbol: string; decimals: number } => {
  return typeof currency === 'object' && currency !== null && 'symbol' in currency;
};

// Helper function to safely access currency properties with proper type checking
const getCurrencyValue = (
  currency: string | { name: string; symbol: string; decimals: number },
  property: 'name' | 'symbol' | 'decimals',
  defaultValue: string | number = ''
): string | number => {
  if (typeof currency === 'string') {
    // If currency is a string, return the string for name/symbol or 18 for decimals
    return property === 'decimals' ? 18 : currency;
  }
  
  // If it's an object, return the requested property
  return currency[property] ?? defaultValue;
};

// Convert any currency format to a consistent object
const normalizeCurrency = (
  currency: string | { name: string; symbol: string; decimals: number } | undefined
): { name: string; symbol: string; decimals: number } => {
  if (!currency) {
    return { name: 'Token', symbol: 'TOKEN', decimals: 18 };
  }
  
  if (typeof currency === 'string') {
    return { name: currency, symbol: currency, decimals: 18 };
  }
  
  return currency;
};

const NetworkManagement: React.FC<NetworkManagementProps> = ({ className = '' }) => {
  const {
    configuredNetworks: networks,
    currentNetwork: activeNetwork,
  } = useNetwork();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState<NetworkInfo | null>(null);
  
  const [formState, setFormState] = useState<Partial<NetworkInfo> & { symbolInput?: string }>({
    name: '',
    chainId: 0,
    shortName: '',
    rpcUrl: '',
    explorerUrl: '',
    blockExplorerUrl: '',
    isTestnet: false,
    testnet: false,
    currency: {
      name: '',
      symbol: '',
      decimals: 18
    },
    symbolInput: ''
  });
  
  // Reset form when closing
  const resetForm = () => {
    setFormState({
      name: '',
      chainId: 0,
      shortName: '',
      rpcUrl: '',
      explorerUrl: '',
      blockExplorerUrl: '',
      isTestnet: false,
      testnet: false,
      currency: {
        name: '',
        symbol: '',
        decimals: 18
      },
      symbolInput: ''
    });
    setEditingNetwork(null);
    setShowAddForm(false);
  };
  
  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'symbolInput') {
      // Update the symbol within the currency object
      const updatedCurrency = normalizeCurrency(formState.currency);
      updatedCurrency.symbol = value;
      
      setFormState({
        ...formState,
        symbolInput: value,
        currency: updatedCurrency
      });
    } else if (name === 'decimals') {
      // Update the decimals within the currency object
      const updatedCurrency = normalizeCurrency(formState.currency);
      updatedCurrency.decimals = parseInt(value, 10) || 18;
      
      setFormState({
        ...formState,
        currency: updatedCurrency
      });
    } else if (name === 'testnet') {
      // Handle checkbox for testnet
      const isChecked = (e.target as HTMLInputElement).checked;
      setFormState({
        ...formState,
        testnet: isChecked,
        isTestnet: isChecked
      });
    } else {
      // Handle other form fields normally
      setFormState({
        ...formState,
        [name]: value
      });
    }
  };
  
  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Network add/update needs refactoring.');
    // ... existing logic ...
    /* 
    if (editingNetwork) {
      // updateNetwork(networkInfo); // Requires updateNetwork from context
      console.log(`Network ${networkInfo.name} has been updated`);
    } else {
      // addNetwork(networkInfo); // Requires addNetwork from context
      console.log(`Network ${networkInfo.name} has been added`);
    }
    resetForm();
    */
  };
  
  // Start editing a network
  const handleEdit = (network: NetworkInfo) => {
    console.log('Network editing needs refactoring.');
    /*
    const normalizedCurrency = normalizeCurrency(network.currency);
    setFormState({ 
      ...network,
      symbolInput: normalizedCurrency.symbol
    });
    setEditingNetwork(network);
    setShowAddForm(true);
    */
  };
  
  // Delete a network
  const handleDelete = (chainId: number) => {
    console.log('Network removal needs refactoring.');
    /*
    if (confirm('Are you sure you want to remove this network?')) {
      // removeNetwork(chainId); // Requires removeNetwork from context
    }
    */
  };
  
  // Filter networks by testnet status
  const mainnetNetworks = networks.filter((network: NetworkInfo) => !network.testnet);
  const testnetNetworks = networks.filter((network: NetworkInfo) => network.testnet);
  
  return (
    <div className={`bg-gray-800 rounded-lg shadow-md border border-gray-700 ${className}`}>
      <div className="px-6 py-4 border-b border-gray-700">
        <h2 className="text-lg font-medium text-white">Network Management</h2>
        <p className="mt-1 text-sm text-gray-400">
          Configure networks for token deployment and interaction
        </p>
      </div>
      
      <div className="p-6">
        {/* Network List */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-white">Available Networks</h3>
            <button
              type="button"
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors"
            >
              {showAddForm ? 'Cancel' : '+ Add Network'}
            </button>
          </div>
          
          {/* Network form */}
          {showAddForm && (
            <form onSubmit={handleSubmit} className="mb-6 bg-gray-700 p-4 rounded-md">
              <h4 className="text-sm font-medium text-white mb-4">
                {editingNetwork ? 'Edit Network' : 'Add New Network'}
              </h4>
              
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Network Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formState.name || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Chain ID
                  </label>
                  <input
                    type="number"
                    name="chainId"
                    value={formState.chainId || ''}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Currency Symbol
                  </label>
                  <input
                    type="text"
                    name="symbolInput"
                    value={formState.symbolInput || getCurrencyValue(formState.currency || { name: 'Token', symbol: 'TOKEN', decimals: 18 }, 'symbol', '')}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Decimals
                  </label>
                  <input
                    type="number"
                    name="decimals"
                    value={getCurrencyValue(formState.currency || { name: 'Token', symbol: 'TOKEN', decimals: 18 }, 'decimals', 18)}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    RPC URL
                  </label>
                  <input
                    type="url"
                    name="rpcUrl"
                    value={formState.rpcUrl || ''}
                    onChange={handleChange}
                    required
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Block Explorer URL
                  </label>
                  <input
                    type="url"
                    name="explorerUrl"
                    value={formState.explorerUrl || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="testnet"
                      checked={formState.testnet || false}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-600 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-300">This is a testnet</span>
                  </label>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-md mr-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                >
                  {editingNetwork ? 'Update Network' : 'Add Network'}
                </button>
              </div>
            </form>
          )}
          
          {/* Mainnet networks */}
          {mainnetNetworks.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Mainnet Networks
              </h4>
              <div className="bg-gray-700 rounded-md overflow-hidden">
                {mainnetNetworks.map((network: NetworkInfo) => (
                  <div 
                    key={network.chainId}
                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-600 last:border-b-0 ${
                      activeNetwork?.chainId === network.chainId ? 'bg-gray-600' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{network.name}</div>
                      <div className="text-sm text-gray-400">Chain ID: {network.chainId} • {getCurrencyValue(network.currency, 'symbol', 'TOKEN')}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(network)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Edit network"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(network.chainId)}
                        className="text-red-400 hover:text-red-300"
                        title="Remove network"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Testnet networks */}
          {testnetNetworks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Testnet Networks
              </h4>
              <div className="bg-gray-700 rounded-md overflow-hidden">
                {testnetNetworks.map((network: NetworkInfo) => (
                  <div 
                    key={network.chainId}
                    className={`flex items-center justify-between px-4 py-3 border-b border-gray-600 last:border-b-0 ${
                      activeNetwork?.chainId === network.chainId ? 'bg-gray-600' : ''
                    }`}
                  >
                    <div>
                      <div className="font-medium text-white">{network.name}</div>
                      <div className="text-sm text-gray-400">Chain ID: {network.chainId} • {getCurrencyValue(network.currency, 'symbol', 'TOKEN')}</div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(network)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Edit network"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(network.chainId)}
                        className="text-red-400 hover:text-red-300"
                        title="Remove network"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {networks.length === 0 && (
            <div className="bg-gray-700 rounded-md p-6 text-center">
              <p className="text-gray-400">No networks configured.</p>
              <p className="text-sm text-gray-500 mt-1">Click "Add Network" to get started.</p>
            </div>
          )}
        </div>
        
        {/* Network information */}
        <div className="mt-4 border-t border-gray-700 pt-4">
          <h3 className="text-sm font-medium text-gray-400 mb-2">Information</h3>
          <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
            <li>Each network requires a valid RPC URL to connect to the blockchain.</li>
            <li>Block explorer URL is used to generate links to transactions and addresses.</li>
            <li>Default networks cannot be removed, but can be modified.</li>
            <li>Changes to networks will take effect immediately.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default NetworkManagement; 