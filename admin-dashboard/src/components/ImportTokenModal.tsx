import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { useWallet } from '../hooks/useWallet';
import { useNetwork } from '../contexts/NetworkContext';
import { useTokens } from '../contexts/TokenContext'; // Changed to use the proper hook
import { NetworkType } from '../contexts/NetworkContext';
import { DeployedToken } from '../lib/types/tokens'; // Corrected path

// Minimal ERC20 ABI for fetching details
const minimalErc20Abi = [
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)"
];

interface ImportTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FetchedTokenDetails {
  name: string;
  symbol: string;
  decimals: number;
}

const ImportTokenModal: React.FC<ImportTokenModalProps> = ({ isOpen, onClose }) => {
  const { address: walletAddress, provider } = useWallet();
  const { currentNetwork, configuredNetworks } = useNetwork();
  const { importToken } = useTokens(); // Use useTokens hook and get importToken function

  const [contractAddress, setContractAddress] = useState('');
  const [selectedNetworkChainId, setSelectedNetworkChainId] = useState<string | undefined>(
    currentNetwork?.chainId ? currentNetwork.chainId.toString() : undefined
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedDetails, setFetchedDetails] = useState<FetchedTokenDetails | null>(null);
  const [isAddressValid, setIsAddressValid] = useState(true);

  // Update selected network if context changes
  useEffect(() => {
    if (currentNetwork && isOpen) {
      setSelectedNetworkChainId(currentNetwork.chainId.toString());
    }
  }, [currentNetwork, isOpen]);

  // Validate address as user types
  useEffect(() => {
    if (contractAddress === '') {
      setIsAddressValid(true);
      setError(null);
    } else {
      const isValid = ethers.isAddress(contractAddress);
      setIsAddressValid(isValid);
      if (!isValid) {
        setError('Invalid Ethereum address format.');
      } else {
        setError(null); // Clear error if valid
      }
    }
  }, [contractAddress]);

  const resetModalState = useCallback(() => {
    setContractAddress('');
    setSelectedNetworkChainId(currentNetwork?.chainId ? currentNetwork.chainId.toString() : undefined);
    setIsLoading(false);
    setError(null);
    setFetchedDetails(null);
    setIsAddressValid(true);
  }, [currentNetwork?.chainId]);

  const handleClose = () => {
    resetModalState();
    onClose();
  };

  const handleFetchDetails = async () => {
    if (!isAddressValid || !contractAddress || !selectedNetworkChainId || !provider) {
      setError('Please ensure address is valid, network is selected, and wallet is connected.');
      return;
    }
    
    // Find the selected network configuration
    const selectedNetworkConfig = configuredNetworks.find(n => n.chainId.toString() === selectedNetworkChainId);
    if (!selectedNetworkConfig) {
        setError('Selected network configuration not found.');
        return;
    }
    
    // Get RPC URL directly from the network config object
    // const rpcUrl = selectedNetworkConfig.rpcUrl; 
    // WE DON'T NEED THE RPC URL DIRECTLY - ethers.js uses the connected provider

    // Ensure provider is connected to the selected network
    const walletNetwork = await provider.getNetwork();
    if (walletNetwork.chainId.toString() !== selectedNetworkChainId) {
        setError(`Please switch your wallet to the selected network (${selectedNetworkConfig.name || 'Unknown'}).`);
        return;
    }


    setIsLoading(true);
    setError(null);
    setFetchedDetails(null);

    try {
      // ethers.js uses the provider which is already connected to the correct network (checked above)
      const contract = new ethers.Contract(contractAddress, minimalErc20Abi, provider); 
      
      // Fetch details in parallel
      const results = await Promise.allSettled([
        contract.name(),
        contract.symbol(),
        contract.decimals()
      ]);

      const nameResult = results[0];
      const symbolResult = results[1];
      const decimalsResult = results[2];

      if (nameResult.status === 'rejected' && symbolResult.status === 'rejected') {
         throw new Error('Could not fetch name or symbol. Is this a valid ERC20 token contract?');
      }
      
      const details: FetchedTokenDetails = {
         name: nameResult.status === 'fulfilled' ? nameResult.value : 'Unknown Name',
         symbol: symbolResult.status === 'fulfilled' ? symbolResult.value : 'Unknown Symbol',
         // Decimals might return BigInt, ensure conversion
         decimals: decimalsResult.status === 'fulfilled' ? Number(decimalsResult.value) : 0 
      };

      setFetchedDetails(details);
      console.log('Fetched token details:', details);

    } catch (err: any) {
      console.error('Error fetching token details:', err);
      const message = err.reason || err.message || "Failed to fetch token details. Check the address and network, and ensure it's a valid ERC20 contract.";
      setError(message);
      setFetchedDetails(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddToken = () => {
     if (!fetchedDetails || !contractAddress || !selectedNetworkChainId) {
         setError('Cannot add token without fetched details.');
         return;
     }
     
     const tokenToAdd: DeployedToken = {
        address: contractAddress,
        name: fetchedDetails.name,
        symbol: fetchedDetails.symbol,
        decimals: fetchedDetails.decimals,
        chainId: parseInt(selectedNetworkChainId, 10), // Ensure chainId is number
        owner: walletAddress || 'imported', // Changed from deployerAddress to owner
        deployedAt: Date.now(), // Timestamp of import
        // Add missing required fields with default values
        initialSupply: '0',
        maxSupply: '0',
        mintFeeBps: 0,
        unlockTime: 0,
        platformFeeAddress: '0x0000000000000000000000000000000000000000',
        platformFeePercentage: 0,
        totalSupply: '0',
        paused: false
     };

     try {
        importToken(contractAddress); // Call the context function to import token
        console.log('Token imported:', tokenToAdd);
        // Maybe show a success notification here
        handleClose(); // Close modal on success
     } catch (err) {
        console.error("Failed to import token via context:", err);
        setError("Failed to save the token.");
     }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm z-40 flex justify-center items-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden border dark:border-gray-700">
        {/* Header */}
        <div className="px-6 py-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Import Existing Token</h3>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Network Selection */}
          <div>
            <label htmlFor="network-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Network
            </label>
            <select
              id="network-select"
              value={selectedNetworkChainId}
              onChange={(e) => setSelectedNetworkChainId(e.target.value)}
              disabled={isLoading}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded focus:ring-blue-500 focus:border-blue-500"
            >
              {configuredNetworks.map(network => (
                <option key={network.chainId} value={network.chainId.toString()}>
                  {network.name} (ID: {network.chainId})
                </option>
              ))}
            </select>
          </div>

          {/* Contract Address Input */}
          <div>
            <label htmlFor="contract-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Token Contract Address
            </label>
            <input
              type="text"
              id="contract-address"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              disabled={isLoading}
              className={`w-full p-2 border ${isAddressValid ? 'border-gray-300 dark:border-gray-600' : 'border-red-500'} dark:bg-gray-700 dark:text-white rounded focus:ring-blue-500 focus:border-blue-500`}
            />
          </div>

          {/* Fetch Button */}
          {!fetchedDetails && (
             <button
              onClick={handleFetchDetails}
              disabled={isLoading || !isAddressValid || !contractAddress || !selectedNetworkChainId || !provider}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Fetching...
                </>
              ) : (
                'Fetch Token Details'
              )}
            </button>
          )}
          
          {/* Fetched Details Display */}
          {fetchedDetails && !isLoading && (
            <div className="p-3 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30 rounded-md text-sm space-y-1">
                <p><strong className="dark:text-gray-200">Name:</strong> <span className="dark:text-green-300">{fetchedDetails.name}</span></p>
                <p><strong className="dark:text-gray-200">Symbol:</strong> <span className="dark:text-green-300">{fetchedDetails.symbol}</span></p>
                <p><strong className="dark:text-gray-200">Decimals:</strong> <span className="dark:text-green-300">{fetchedDetails.decimals}</span></p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-3 border border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/30 rounded-md text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}
          
          {/* Add Token Button */}
          {fetchedDetails && !isLoading && (
            <button
              onClick={handleAddToken}
              className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Add Token to Dashboard
            </button>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportTokenModal; 