import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DeployedToken, TokenAction } from '../lib/types/tokens';
import TokenActionsForm from './TokenActionsForm';
import { formatDate } from '../utils/format';
import { getNetworkName } from '../shared/constants/networks';
import { Provider } from '../lib/types/web3';

interface TokenDetailModalProps {
  token: DeployedToken | null;
  account: string | null;
  provider: Provider | null;
  onClose: () => void;
  onPerformAction: (token: DeployedToken, action: TokenAction, amount: string, recipient?: string) => Promise<boolean>;
}

const TokenDetailModal: React.FC<TokenDetailModalProps> = ({
  token,
  account,
  provider,
  onClose,
  onPerformAction
}) => {
  const [tokenBalance, setTokenBalance] = useState<string>('0');
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(false);
  const [showActions, setShowActions] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(true);

  // Load token balance when token changes
  useEffect(() => {
    if (token && provider && account) {
      loadTokenBalance();
    }
  }, [token, provider, account]);

  // Load token balance
  const loadTokenBalance = async () => {
    if (!token || !provider || !account) return;

    try {
      setIsLoadingBalance(true);
      const contract = new ethers.Contract(
        token.address,
        [
          'function balanceOf(address owner) view returns (uint256)',
          'function decimals() view returns (uint8)'
        ],
        provider
      );

      const balance = await contract.balanceOf(account);
      const formattedBalance = ethers.formatEther(balance);
      setTokenBalance(formattedBalance);
    } catch (error) {
      console.error('Error loading token balance:', error);
    } finally {
      setIsLoadingBalance(false);
    }
  };

  // Format address for display
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Copy address to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard');
  };

  // Generate Etherscan URL
  const getEtherscanUrl = (tokenAddress: string, chainId: number) => {
    // Get network prefix
    const networkPrefix = getNetworkPrefix(chainId);
    return `https://${networkPrefix}etherscan.io/token/${tokenAddress}`;
  };

  // Helper to get network prefix for Etherscan
  const getNetworkPrefix = (networkId: number): string => {
    switch (networkId) {
      case 1: return '';
      case 5: return 'goerli.';
      case 11155111: return 'sepolia.';
      case 137: return 'polygon.';
      case 80001: return 'mumbai.';
      case 42161: return 'arbiscan.io/token/';
      case 10: return 'optimistic.';
      default: return '';
    }
  };

  // Check if user is token owner
  const isOwner = (): boolean => {
    if (!token || !account) return false;
    return token.owner.toLowerCase() === account.toLowerCase();
  };

  // Handle token action - Updated signature
  const handleTokenAction = async (params: { 
    token: DeployedToken; 
    action: TokenAction; 
    amount?: string; 
    recipient?: string 
  }) => {
    if (!token) return false;
    // Call the modal's onPerformAction prop with the original signature it expects
    // Note: The modal's onPerformAction prop itself might need updating if its parent expects the object structure.
    // For now, we adapt the call here based on the current prop definition.
    return onPerformAction(params.token, params.action, params.amount || '', params.recipient);
  };

  if (!token) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={onClose}></div>

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
              <span className="text-blue-600 font-bold text-lg">{token.symbol.substring(0, 2)}</span>
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
              <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                {token.name}
              </h3>
              <div className="mt-1">
                <p className="text-sm text-gray-500">
                  {token.symbol} • {getNetworkName(token.chainId)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4">
            {/* Actions & Details Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex" aria-label="Tabs">
                <button
                  onClick={() => {
                    setShowActions(true);
                    setShowDetails(false);
                  }}
                  className={`${
                    showActions
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                >
                  Token Actions
                </button>
                <button
                  onClick={() => {
                    setShowActions(false);
                    setShowDetails(true);
                  }}
                  className={`${
                    showDetails
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } w-1/2 py-4 px-1 text-center border-b-2 font-medium text-sm`}
                >
                  Token Details
                </button>
              </nav>
            </div>

            {/* Conditional Content */}
            <div className="mt-4">
              {showActions && (
                <div>
                  <TokenActionsForm
                    token={token}
                    account={account}
                    // Pass the modal's handler which now adapts the call
                    onPerformAction={handleTokenAction} 
                  />
                </div>
              )}

              {showDetails && (
                <div className="bg-white p-4 rounded-lg">
                  <h3 className="text-lg font-medium mb-4">Token Details</h3>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-sm font-medium text-gray-500">Address</div>
                    <div className="text-sm text-gray-900 break-all flex items-center">
                      {token.address}
                      <button
                        onClick={() => copyToClipboard(token.address)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-500">Owner</div>
                    <div className="text-sm text-gray-900 break-all">{token.owner}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Initial Supply</div>
                    <div className="text-sm text-gray-900 token-amount">{token.initialSupply} {token.symbol}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Current Supply</div>
                    <div className="text-sm text-gray-900 token-amount">{token.totalSupply} {token.symbol}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Max Supply</div>
                    <div className="text-sm text-gray-900 token-amount">{token.maxSupply} {token.symbol}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Your Balance</div>
                    <div className="text-sm text-gray-900">
                      {isLoadingBalance ? (
                        <span className="loading-spinner mr-1"></span>
                      ) : (
                        <span className="token-amount">
                          {tokenBalance} {token.symbol}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm font-medium text-gray-500">Mint Fee</div>
                    <div className="text-sm text-gray-900">{token.mintFeeBps / 100}%</div>
                    
                    <div className="text-sm font-medium text-gray-500">Unlock Time</div>
                    <div className="text-sm text-gray-900">{formatDate(token.unlockTime)}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Platform Fee Address</div>
                    <div className="text-sm text-gray-900 break-all">{formatAddress(token.platformFeeAddress)}</div>
                    
                    <div className="text-sm font-medium text-gray-500">Transfer Status</div>
                    <div className="text-sm text-gray-900">
                      {token.paused ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Active
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm font-medium text-gray-500">Deployed On</div>
                    <div className="text-sm text-gray-900">{formatDate(token.deployedAt)}</div>
                  </div>
                  
                  <div className="mt-4">
                    <a 
                      href={getEtherscanUrl(token.address, token.chainId)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      View on Etherscan
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                  
                  {isOwner() && (
                    <div className="mt-6 bg-gray-50 p-4 rounded border border-gray-200">
                      <h4 className="font-medium text-gray-700 mb-2">Owner Controls</h4>
                      <div className="flex flex-wrap gap-2">
                        <button
                          className={`${
                            token.paused
                              ? 'bg-green-100 hover:bg-green-200 text-green-800'
                              : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                          } px-3 py-1 rounded text-sm`}
                          onClick={() => onPerformAction(token, token.paused ? 'unpause' : 'pause', '', undefined)}
                        >
                          {token.paused ? 'Unpause Transfers' : 'Pause Transfers'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TokenDetailModal; 