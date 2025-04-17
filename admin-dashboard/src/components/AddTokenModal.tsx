import React, { useState, useEffect } from 'react';
import { Button } from './Button';
import { useNetwork } from '../contexts/NetworkContext';
import { useWallet } from '../hooks/useWallet';
import { useTokens } from '../contexts/TokenContext';
import { FetchedTokenDetails, fetchTokenDetailsFromChain } from '../utils/tokenUtils';
import { Loader2, X } from 'lucide-react';
import { ethers } from 'ethers';

interface AddTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddTokenModal: React.FC<AddTokenModalProps> = ({ isOpen, onClose }) => {
  const networkContext = useNetwork(); 
  const { currentNetwork } = networkContext; 
  const wallet = useWallet();
  const { importToken, isLoading: isTokenContextLoading, error: tokenContextError } = useTokens();

  const [contractAddress, setContractAddress] = useState('');
  const [fetchedDetails, setFetchedDetails] = useState<FetchedTokenDetails | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(false);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setContractAddress('');
      setFetchedDetails(null);
      setIsFetching(false);
      setError(null);
      setImportSuccess(null);
      setIsOwner(false);
    }
  }, [isOpen]);

  // Lock scrolling when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle fetching details
  const handleFetchDetails = async () => {
    if (!contractAddress || !currentNetwork || !wallet.provider) {
      setError('Please enter a valid contract address and ensure your wallet is connected to the correct network.');
      return;
    }
    
    // Basic address validation
    if (!ethers.isAddress(contractAddress)) {
      setError('Invalid contract address format.');
      return;
    }

    setIsFetching(true);
    setError(null);
    setFetchedDetails(null);
    setImportSuccess(null);
    setIsOwner(false);

    try {
      const details = await fetchTokenDetailsFromChain(
        contractAddress,
        currentNetwork.chainId,
        wallet.provider,
        networkContext 
      );
      
      // Check if the connected wallet is the owner of the token
      const isTokenOwner = !!(wallet.address && 
        details.owner && 
        wallet.address.toLowerCase() === details.owner.toLowerCase());
      
      setIsOwner(isTokenOwner);
      setFetchedDetails(details);
      
      // Log ownership status
      console.log(`[AddTokenModal] Token owner: ${details.owner}`);
      console.log(`[AddTokenModal] Connected wallet: ${wallet.address}`);
      console.log(`[AddTokenModal] Is owner: ${isTokenOwner}`);
      
      // Set warning if not owner
      if (!isTokenOwner) {
        setError('Warning: You are not the owner of this token. Only owners can add their tokens to the dashboard.');
      }
    } catch (fetchError: any) {
      setError(fetchError.message || 'Failed to fetch token details.');
    } finally {
      setIsFetching(false);
    }
  };

  // Handle adding token to dashboard
  const handleAddToken = async () => {
    // Use contractAddress directly, as importToken fetches details internally
    if (!contractAddress || !currentNetwork) {
      setError('Contract address is missing or network not selected.'); // Should not happen if button is enabled
      return;
    }

    setError(null); // Clear previous errors
    setImportSuccess(null);
    // Note: isTokenContextLoading state from useTokens is used for button disabled/spinner

    try {
      console.log(`[AddTokenModal] Calling context importToken for ${contractAddress}`);
      const imported = await importToken(contractAddress); // Call context function

      if (imported) {
        // Success!
        setImportSuccess(`Token ${imported.symbol} (${imported.name}) added successfully!`);
        console.log(`[AddTokenModal] Import successful for ${imported.symbol}`);
        // Optionally close modal after a short delay
        setTimeout(() => {
          onClose();
        }, 1500); // Close after 1.5 seconds
      } else {
        // Import failed (duplicate or other error handled in context)
        // Error should be set by the TokenContext, display it
        setError(tokenContextError || 'Failed to import token. It might already exist on this network.');
        console.warn(`[AddTokenModal] Import failed or token already exists.`);
      }
    } catch (importError: any) {
      // Catch any unexpected errors from the context call itself
      console.error('[AddTokenModal] Unexpected error during importToken call:', importError);
      setError(importError.message || 'An unexpected error occurred during import.');
    } 
    // No finally block needed here as isLoading is handled by TokenContext
  };

  if (!isOpen) return null;

  // Determine theme (match the pattern used in WalletSelectorModal)
  const isDarkMode = typeof document !== 'undefined' && 
                    (document.documentElement.classList.contains('dark') || 
                     document.documentElement.getAttribute('data-theme') === 'dark');

  const modalBgColor = isDarkMode ? '#1e1e1e' : '#ffffff';
  const modalBorderColor = isDarkMode ? '#3a3a3a' : '#e5e7eb';
  const headerBgColor = isDarkMode ? '#262626' : '#f9fafb';
  const textColor = isDarkMode ? '#e5e7eb' : '#1f2937';
  const secondaryTextColor = isDarkMode ? '#9ca3af' : '#6b7280';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        style={{
          backgroundColor: modalBgColor,
          borderRadius: '8px',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
          width: '100%',
          maxWidth: '500px',
          overflow: 'hidden',
          position: 'relative',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          border: `1px solid ${modalBorderColor}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div style={{
          borderBottom: `1px solid ${modalBorderColor}`,
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: headerBgColor
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: textColor
          }}>
            Add Existing Token
          </h3>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: secondaryTextColor,
              transition: 'color 0.2s'
            }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4" style={{ color: textColor }}>
          <p className="text-sm opacity-80">
            Add an existing ERC20 token to your dashboard view by providing its contract address.
            The token must be on the currently selected network: 
            <span className="font-semibold ml-1">{currentNetwork?.name || 'Unknown Network'}</span>.
          </p>

          <div>
            <label htmlFor="contractAddress" className="block text-sm font-medium mb-1">
              Token Contract Address
            </label>
            <input
              id="contractAddress"
              type="text"
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              placeholder="0x..."
              disabled={isFetching || isTokenContextLoading}
              className="block w-full px-3 py-2 border border-border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-secondary text-primary disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Fetch Details Button */} 
          <Button 
            onClick={handleFetchDetails} 
            disabled={!contractAddress || isFetching || isTokenContextLoading}
            className="w-full"
          >
            {isFetching ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Fetching...</>
            ) : (
              'Fetch Token Info'
            )}
          </Button>

          {/* Display Errors or Success Message */}
          {error && (
            <div className={`mt-4 p-3 ${
              !isOwner && error.includes('Warning:') 
                ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-400 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200' 
                : 'bg-red-100 dark:bg-red-900/30 border-red-400 dark:border-red-800 text-red-700 dark:text-red-200'
              } border rounded-md text-sm`}
            >
              {error}
            </div>
          )}
          {importSuccess && !error && (
            <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-200 rounded-md text-sm">
              {importSuccess}
            </div>
          )}

          {/* Display Fetched Details */}
          {fetchedDetails && !importSuccess && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg space-y-2 text-sm">
              <h3 className="font-medium">Token Found (Verify Details):</h3>
              <p><span className="font-semibold">Name:</span> {fetchedDetails.name}</p>
              <p><span className="font-semibold">Symbol:</span> {fetchedDetails.symbol}</p>
              <p><span className="font-semibold">Decimals:</span> {fetchedDetails.decimals}</p>
              <p><span className="font-semibold">Total Supply:</span> {fetchedDetails.totalSupply}</p>
              <p>
                <span className="font-semibold">Owner:</span> {fetchedDetails.owner}
                {isOwner && (
                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    You are the owner
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Add to Dashboard Button */} 
          <div className="pt-4 border-t border-border mt-4">
            <Button 
              onClick={handleAddToken}
              disabled={!fetchedDetails || isFetching || isTokenContextLoading || !!importSuccess || !isOwner}
              variant="default"
              className="w-full"
            >
              {isTokenContextLoading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding...</>
              ) : !isOwner && fetchedDetails ? (
                'Only Owner Can Add Token'
              ) : (
                'Add to Dashboard'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddTokenModal; 