import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { TokenDeployParams, DeployedToken } from '../lib/types';
import { getNetworkName } from '../shared/constants/networks';
import { QuickTokenConfig } from '../pages/SetupWizard';
import HelpIcon from './HelpIcon';
import { useWallet } from '../hooks/useWallet';
import { useNetwork } from '../contexts/NetworkContext';
import { useWhitelist } from '../contexts/WhitelistContext';

interface DeployFormProps {
  provider: ethers.BrowserProvider | null;
  account: string | null;
  chainId: number | null;
  onSubmitDeployment: (params: TokenDeployParams) => Promise<DeployedToken | null>;
  config: QuickTokenConfig;
}

const DeployForm: React.FC<DeployFormProps> = ({ 
  provider, 
  account, 
  chainId, 
  onSubmitDeployment,
  config
}) => {
  // Default values
  const oneMonth = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  
  // Form state
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [initialSupply, setInitialSupply] = useState('1000000');
  const [maxSupply, setMaxSupply] = useState('10000000');
  const [mintFeeBps, setMintFeeBps] = useState('200'); // 2% default
  const [unlockTime, setUnlockTime] = useState(oneMonth.toString());
  const [platformFeeAddress, setPlatformFeeAddress] = useState(config.platformFeeAddress || '');
  
  // UI state
  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState('');
  const [unlockDate, setUnlockDate] = useState('');
  const [mintFeePercent, setMintFeePercent] = useState('2.00');
  const [networkError, setNetworkError] = useState('');
  
  // Get wallet, network and whitelist contexts
  const { address } = useWallet();
  const { getNetworkName: networkContextGetNetworkName } = useNetwork();
  const { isWhitelisted, isOwner } = useWhitelist();
  
  // Check if current network is enabled in config
  useEffect(() => {
    if (chainId && config.networks.configuredNetworks.length > 0) {
      const isNetworkConfigured = config.networks.configuredNetworks.some(
        network => parseInt(network.chainId) === chainId && network.isEnabled
      );
      
      if (!isNetworkConfigured) {
        setNetworkError(`Current network (${networkContextGetNetworkName(chainId)}) is not configured for token deployment. Please switch to a configured network.`);
      } else {
        setNetworkError('');
      }
    }
  }, [chainId, config.networks.configuredNetworks, networkContextGetNetworkName]);
  
  // Convert unix timestamp to date string for the input field
  useEffect(() => {
    if (unlockTime) {
      try {
        // First validate if we have a valid timestamp
        const timestamp = parseInt(unlockTime);
        if (!isNaN(timestamp) && timestamp > 0) {
          const date = new Date(timestamp * 1000);
          // Check if date is valid before calling toISOString()
          if (!isNaN(date.getTime())) {
            const localDate = date.toISOString().slice(0, 16);
            setUnlockDate(localDate);
          }
        }
      } catch (error) {
        // Silently ignore conversion errors during typing
        console.log("Date conversion error:", error);
      }
    }
  }, [unlockTime]);

  // Convert BPS to percentage and vice versa
  useEffect(() => {
    const bps = parseInt(mintFeeBps) || 0;
    const percent = (bps / 100).toFixed(2);
    setMintFeePercent(percent);
  }, [mintFeeBps]);

  // Handle date input change
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const inputValue = e.target.value;
      setUnlockDate(inputValue); // Always update the visual input

      // Only convert to timestamp if we have a valid date
      const dateObj = new Date(inputValue);
      if (!isNaN(dateObj.getTime())) {
        const timestamp = Math.floor(dateObj.getTime() / 1000);
        setUnlockTime(timestamp.toString());
      }
    } catch (error) {
      // Just update the visual input without changing the timestamp
      console.log("Date input error:", error);
    }
  };

  // Handle percentage input change
  const handlePercentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const percent = parseFloat(e.target.value);
    const bps = Math.round(percent * 100).toString();
    setMintFeeBps(bps);
    setMintFeePercent(e.target.value);
  };

  // Validate form inputs
  const validateForm = (): boolean => {
    if (!name || !symbol || !initialSupply || !maxSupply || !mintFeeBps || !unlockTime || !platformFeeAddress) {
      setError('All fields are required');
      console.error('All fields are required');
      return false;
    }

    if (!ethers.isAddress(platformFeeAddress)) {
      setError('Invalid platform fee address');
      console.error('Invalid platform fee address');
      return false;
    }

    const now = Math.floor(Date.now() / 1000);
    if (parseInt(unlockTime) < now) {
      setError('Unlock time must be in the future');
      console.error('Unlock time must be in the future');
      return false;
    }

    if (parseFloat(initialSupply) <= 0 || parseFloat(maxSupply) <= 0) {
      setError('Supply values must be greater than 0');
      console.error('Supply values must be greater than 0');
      return false;
    }

    if (parseFloat(initialSupply) > parseFloat(maxSupply)) {
      setError('Initial supply cannot exceed max supply');
      console.error('Initial supply cannot exceed max supply');
      return false;
    }

    const bps = parseInt(mintFeeBps);
    if (isNaN(bps) || bps < 0 || bps > 10000) {
      setError('Mint fee must be between 0% and 100%');
      console.error('Mint fee must be between 0% and 100%');
      return false;
    }

    if (networkError) {
      setError(networkError);
      console.error(networkError);
      return false;
    }

    setError('');
    return true;
  };

  // Deploy the token
  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account) {
      setError('Please connect your wallet first');
      console.error('Please connect your wallet first');
      return;
    }
    
    if (!validateForm()) {
      return;
    }
    
    setIsDeploying(true);
    setError('');
    
    // Prepare deployment parameters
    const platformFeePercentageBps = Math.round((config.platformFeePercentage || 0) * 100);
    
    const params: TokenDeployParams = {
      name,
      symbol,
      initialSupply,
      maxSupply,
      mintFeeBps: parseInt(mintFeeBps),
      unlockTime: parseInt(unlockTime),
      platformFeeAddress,
      platformFeePercentageBps
    };

    console.log(`Submitting deployment for ${name} token...`, params);
    
    // Call the context action passed via props
    const success = await onSubmitDeployment(params);
      
    if (success) {
      // Log deployment success
      console.log(`Deployment submitted successfully for ${name} (${symbol})!`);
      
      // Reset form on successful submission
      setName('');
      setSymbol('');
      // Keep existing error state cleared or set by the context
      setError(''); 
      
    } else {
      // Error occurred during context action (deploy/save/load)
      // Error state should already be set by the context, but we log it here too
      console.error('Deployment submission failed (error should be set in context).');
      // Optionally: setError('Deployment failed. Check console or context error.');
    } 

    // No specific catch block needed here anymore for deployment errors,
    // as the context handles them. We catch validation/setup errors earlier.
    
    // Reset loading state regardless of outcome
    setIsDeploying(false);
  };
  
  // Check if wallet is connected
  if (!account) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="bg-yellow-900 border border-yellow-800 text-yellow-300 p-4 rounded mb-4">
          Please connect your wallet to deploy a new token.
        </div>
      </div>
    );
  }
  
  // Display network warning if not on a configured network
  if (networkError) {
    return (
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6 mb-6">
        <div className="bg-yellow-900 border border-yellow-800 text-yellow-300 p-4 rounded mb-4">
          <p className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {networkError}
          </p>
          <div className="mt-4">
            <p className="text-sm">Available networks:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-sm">
              {config.networks.configuredNetworks
                .filter(network => network.isEnabled)
                .map(network => (
                  <li key={network.chainId}>{network.name} (Chain ID: {network.chainId})</li>
                ))
              }
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Determine if the user has permission to edit platform fees
  const canEditPlatformFee = isOwner;

  return (
    <div id="deploy-section" className="mb-6">
      {error && (
        <div className="bg-red-900 border border-red-800 text-red-200 p-4 rounded mb-6">
          {error}
        </div>
      )}
      
      <form onSubmit={handleDeploy} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Token Name */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Token Name
              <HelpIcon 
                content={
                  <div>
                    <p>The full name of your token, which will appear on blockchain explorers and exchanges.</p>
                    <p className="mt-1">Example: "My Project Token"</p>
                    <p className="mt-1">Try to choose a unique, memorable name that reflects your project's purpose.</p>
                  </div>
                }
                position="right"
              />
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project Token"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Token Symbol */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Token Symbol
              <HelpIcon 
                content={
                  <div>
                    <p>A short identifier for your token (e.g. "ETH"), typically 3-4 characters.</p>
                    <p className="mt-1">This symbol appears in wallets and exchanges alongside your token's price.</p>
                    <p className="mt-1">Best practice: use only capital letters for better readability.</p>
                  </div>
                }
                position="right"
              />
            </label>
            <input
              type="text"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value.toUpperCase())}
              placeholder="TKN"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Initial Supply */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Initial Supply
              <HelpIcon 
                content={
                  <div>
                    <p>The amount of tokens created at deployment. These tokens will be sent to your connected wallet.</p>
                    <p className="mt-1">Consider your tokenomics carefully - this number should align with your project's distribution plan.</p>
                    <p className="mt-1">Note: This number represents whole tokens, not fractional units.</p>
                  </div>
                }
                position="right"
              />
            </label>
            <input
              type="text"
              value={initialSupply}
              onChange={(e) => setInitialSupply(e.target.value)}
              placeholder="1000000"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Max Supply */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Max Supply
              <HelpIcon 
                content={
                  <div>
                    <p>The maximum number of tokens that can ever be created. Cannot be changed after deployment.</p>
                    <p className="mt-1">Must be greater than or equal to Initial Supply.</p>
                    <p className="mt-1">Setting a maximum supply creates scarcity, which may affect token economics.</p>
                    <p className="mt-1">Warning: Choose carefully as this limit cannot be changed later!</p>
                  </div>
                }
                position="right"
              />
            </label>
            <input
              type="text"
              value={maxSupply}
              onChange={(e) => setMaxSupply(e.target.value)}
              placeholder="10000000"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Mint Fee */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Mint Fee (%)
              <HelpIcon 
                content={
                  <div>
                    <p>Fee charged when new tokens are minted (created) after initial deployment.</p>
                    <p className="mt-1">The fee is calculated as a percentage of the newly minted token value.</p>
                    <p className="mt-1">A portion of this fee goes to the platform, and the remainder goes to you as the token creator.</p>
                    <p className="mt-1">Industry standard: 1-3% for most tokens.</p>
                  </div>
                }
                position="right"
              />
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={mintFeePercent}
                onChange={handlePercentChange}
                placeholder="2.00"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-gray-400">%</span>
              </div>
            </div>
            <p className="mt-1 text-sm text-gray-400">
              Equivalent to {mintFeeBps} basis points
            </p>
          </div>

          {/* Unlock Time */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Unlock Time
              <HelpIcon 
                content={
                  <div>
                    <p>Sets when tokens become freely transferable between wallets.</p>
                    <p className="mt-1">Before this date, only the contract owner (you) can transfer tokens.</p>
                    <p className="mt-1">Common use cases:</p>
                    <ul className="list-disc ml-5 mt-1">
                      <li>Token launch timing coordination</li>
                      <li>Vesting schedules for team/investor tokens</li>
                      <li>Preventing immediate selling after distribution</li>
                    </ul>
                  </div>
                }
                position="right"
              />
            </label>
            <input
              type="datetime-local"
              value={unlockDate}
              onChange={handleDateChange}
              onKeyDown={(e) => {
                e.preventDefault();
              }}
              onClick={(e) => {
                try {
                  e.currentTarget.showPicker();
                } catch (error) {
                  console.error("Could not show date picker:", error);
                }
              }}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
              required
            />
            <p className="mt-1 text-sm text-gray-400">
              Time when tokens become transferable
            </p>
          </div>

          {/* Platform Fee Address */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Platform Fee Address
              <HelpIcon 
                content={
                  <div>
                    <p>The wallet address that will receive platform fees from token minting operations.</p>
                    <p className="mt-1">This address should be controlled by you or your organization.</p>
                    <p className="mt-1">Default: Your currently connected wallet address.</p>
                    <p className="mt-1">Note: Ensure this is a secure address you control, as fees cannot be redirected after deployment.</p>
                    {!canEditPlatformFee && (
                      <p className="mt-1 text-yellow-400">Only whitelisted admins can modify this field.</p>
                    )}
                  </div>
                }
                position="right"
              />
            </label>
            {canEditPlatformFee ? (
              <input
                type="text"
                value={platformFeeAddress}
                onChange={(e) => setPlatformFeeAddress(e.target.value)}
                placeholder="0x..."
                className={`w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                required
              />
            ) : (
              <div 
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-gray-300 font-mono text-sm"
                aria-label="Platform Fee Address (read-only)"
              >
                {platformFeeAddress || 'Not set'}
              </div>
            )}
            {!canEditPlatformFee && (
              <p className="mt-1 text-xs text-yellow-500">
                This field can only be modified by the owner account.
              </p>
            )}
          </div>
        </div>
        
        {/* Deployment Summary */}
        <div className="bg-gray-750 border border-gray-700 rounded-md p-4">
          <h3 className="text-md font-medium text-white mb-2">Deployment Summary</h3>
          <ul className="list-disc pl-5 text-sm text-gray-300 space-y-1">
            <li>Network: {chainId ? getNetworkName(chainId) : 'Unknown'}</li>
            <li>Initial Supply: {initialSupply} {symbol || 'tokens'}</li>
            <li>Max Supply: {maxSupply} {symbol || 'tokens'}</li>
            <li>Mint Fee: {mintFeePercent}%</li>
            <li>Unlock Time: {unlockDate ? new Date(unlockDate).toLocaleString() : 'Not set'}</li>
          </ul>
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-center">
          <button
            type="submit"
            disabled={isDeploying}
            className={`px-6 py-3 rounded-md text-white font-medium flex items-center ${
              isDeploying 
                ? 'bg-blue-700 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 transition-colors'
            }`}
          >
            {isDeploying ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Deploying...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Deploy Token
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default DeployForm; 