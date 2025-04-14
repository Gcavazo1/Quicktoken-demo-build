import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DeployedToken } from '../lib/types/tokens';
import { formatDate, formatNumber, truncateAddress } from '../utils/format';
import { getNetworkName, getExplorerUrl } from '../shared/constants/networks';
import { Provider } from '../lib/types/web3';
import { QuickTokenABI } from '../lib/QuickTokenABI';
import TokenActionsForm from './TokenActionsForm';
import TokenDetailModal from './TokenDetailModal';
import HelpIcon from './HelpIcon';

interface TokenTableProps {
  tokens: DeployedToken[];
  provider: Provider | null;
  onManageToken: (token: DeployedToken) => void;
  account: string | null;
}

const TokenTable: React.FC<TokenTableProps> = ({ tokens, provider, onManageToken, account }) => {
  const [expandedTokens, setExpandedTokens] = useState<{ [key: string]: boolean }>({});
  const [tokenBalances, setTokenBalances] = useState<{ [key: string]: string }>({});
  const [loadingBalances, setLoadingBalances] = useState<{ [key: string]: boolean }>({});
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);
  const [balances, setBalances] = useState<{ [key: string]: string }>({});
  
  // Load token balances when tokens change
  useEffect(() => {
    if (tokens.length > 0 && provider && account) {
      loadTokenBalances();
    }
  }, [tokens, provider, account]);

  // Load all token balances
  const loadTokenBalances = async () => {
    if (!provider || !account) return;
    
    try {
      setIsLoadingBalances(true);
      // For each token, load balance
      for (const token of tokens) {
        await loadTokenBalance(token, account);
      }
    } catch (error) {
      console.error('Error loading token balances:', error);
    } finally {
      setIsLoadingBalances(false);
    }
  };
  
  // Load a single token balance
  const loadTokenBalance = async (token: DeployedToken, walletAddress: string) => {
    try {
      const contract = new ethers.Contract(
        token.address,
        ['function balanceOf(address owner) view returns (uint256)'],
        provider
      );
      
      const balance = await contract.balanceOf(walletAddress);
      const formattedBalance = ethers.formatEther(balance);
      
      setBalances(prev => ({
        ...prev,
        [token.address]: formattedBalance
      }));
    } catch (error) {
      console.error(`Error loading balance for token ${token.symbol}:`, error);
    }
  };
  
  // Toggle expanded details for a token
  const toggleDetails = async (token: DeployedToken) => {
    const isExpanded = !!expandedTokens[token.address];
    
    // Set expanded state
    setExpandedTokens(prev => ({
      ...prev,
      [token.address]: !isExpanded
    }));
    
    // If expanding and we have a provider, load token balance
    if (!isExpanded && provider) {
      await loadTokenInfo(token);
    }
  };
  
  // Load token balance and info
  const loadTokenInfo = async (token: DeployedToken) => {
    if (!provider || !account) return;
    
    try {
      // Set loading state
      setLoadingBalances(prev => ({
        ...prev,
        [token.address]: true
      }));
      
      // Create contract instance
      const tokenContract = new ethers.Contract(token.address, QuickTokenABI, provider);
      
      // Get balance
      const balance = await tokenContract.balanceOf(account);
      const formattedBalance = ethers.formatEther(balance);
      
      // Update state
      setTokenBalances(prev => ({
        ...prev,
        [token.address]: formattedBalance
      }));
    } catch (error) {
      console.error('Error loading token info:', error);
    } finally {
      setLoadingBalances(prev => ({
        ...prev,
        [token.address]: false
      }));
    }
  };
  
  // Format address to display a shortened version
  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Optional: Show a tooltip or notification that text was copied
  };

  // Get Etherscan URL for token
  const getTokenExplorerUrl = (token: DeployedToken) => {
    const networkPrefix = getNetworkPrefix(token.chainId);
    return `https://${networkPrefix}etherscan.io/token/${token.address}`;
  };

  // Get network prefix for Etherscan URL
  const getNetworkPrefix = (networkId: number): string => {
    switch (networkId) {
      case 1: return ''; // Mainnet
      case 5: return 'goerli.'; // Goerli testnet
      case 11155111: return 'sepolia.'; // Sepolia testnet
      case 137: return 'polygon.'; // Polygon
      case 80001: return 'mumbai.'; // Mumbai testnet
      default: return 'sepolia.'; // Default to Sepolia
    }
  };
  
  // Handle token actions within the TokenTable component
  const handleTokenAction = async (token: DeployedToken, action: string, amount: string, recipient?: string): Promise<boolean> => {
    try {
      // Call the onManageToken callback
      onManageToken(token);
      
      // Force refresh token balances and info after action
      if (provider && account) {
        // Short delay to allow blockchain to update
        setTimeout(() => {
          loadTokenInfo(token);
        }, 1000);
      }
      
      return true;
    } catch (error) {
      console.error('Error performing token action:', error);
      return false;
    }
  };
  
  // Open token detail modal
  const openTokenDetail = (token: DeployedToken) => {
    setSelectedToken(token);
  };
  
  // Close token detail modal
  const closeTokenDetail = () => {
    setSelectedToken(null);
  };

  if (tokens.length === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mt-6 border border-gray-700">
        <div className="text-center py-4">
          <h3 className="text-lg font-medium text-white">No tokens deployed</h3>
          <p className="mt-2 text-gray-400 max-w-md mx-auto text-sm">
            Deploy your first token using the form above. Once deployed, your tokens will appear here for easy management.
          </p>
          <div className="mt-4">
            <button 
              onClick={() => document.getElementById('deploy-section')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium inline-flex items-center text-sm"
            >
              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Token
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg overflow-hidden">
        <div className="min-w-full divide-y divide-gray-700">
          <div className="bg-gray-700 flex">
            <div className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
              Token
              <HelpIcon 
                content={
                  <div>
                    <p>This shows your deployed token's name and symbol.</p>
                    <p className="mt-1">The symbol is a short identifier (like BTC for Bitcoin) that represents your token on exchanges and block explorers.</p>
                  </div>
                }
              />
            </div>
            <div className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
              Supply
              <HelpIcon 
                content={
                  <div>
                    <p>Shows the initial and maximum supply of your token.</p>
                    <p className="mt-1">Initial Supply: The amount created when the token was deployed</p>
                    <p className="mt-1">Max Supply: The absolute maximum number of tokens that can ever exist</p>
                  </div>
                }
              />
            </div>
            <div className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
              Deployed On
              <HelpIcon 
                content={
                  <div>
                    <p>Shows when your token was deployed and on which blockchain network.</p>
                    <p className="mt-1">Each network is independent - tokens deployed on one network don't exist on others.</p>
                    <p className="mt-1">Testnet tokens have no real value and are used for testing.</p>
                  </div>
                }
              />
            </div>
            <div className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
              Actions
              <HelpIcon 
                content={
                  <div>
                    <p>Access management functions for your token:</p>
                    <ul className="list-disc ml-5 mt-1">
                      <li><strong>Manage:</strong> Opens a detailed management panel with minting, burning, and transfer controls</li>
                      <li><strong>View Details:</strong> Shows token information including your balance, token address, and token parameters</li>
                    </ul>
                    <p className="mt-1">Only the token owner has access to administrative functions like minting and pausing.</p>
                  </div>
                }
              />
            </div>
          </div>
          
          <div className="bg-gray-800 divide-y divide-gray-700">
            {tokens.map((token) => (
              <React.Fragment key={token.address}>
                {/* Token row */}
                <div className="flex hover:bg-gray-750 transition-colors">
                  <div className="w-1/4 px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-900 flex items-center justify-center">
                        <span className="text-blue-300 font-bold">{token.symbol.substring(0, 2)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white flex items-center">
                          {token.name}
                          {token.paused && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs bg-yellow-800 text-yellow-300 rounded-md">
                              PAUSED
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">{token.symbol}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="w-1/4 px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white token-amount">{token.initialSupply}</div>
                    <div className="text-xs text-gray-400">Max: {token.maxSupply}</div>
                  </div>
                  
                  <div className="w-1/4 px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white">{formatDate(token.deployedAt)}</div>
                    <div className="text-xs text-gray-400">{getNetworkName(token.chainId)}</div>
                  </div>
                  
                  <div className="w-1/4 px-6 py-4 whitespace-nowrap text-sm text-gray-400 flex space-x-2">
                    <button
                      onClick={() => openTokenDetail(token)}
                      className="text-blue-400 hover:text-blue-300 px-3 py-1 border border-blue-700 rounded-md bg-blue-900 bg-opacity-30 hover:bg-opacity-50 transition-colors"
                      title="Manage this token's settings and actions"
                    >
                      Manage
                    </button>
                    <button
                      onClick={() => toggleDetails(token)}
                      className="text-gray-300 hover:text-white px-3 py-1 border border-gray-700 rounded-md hover:bg-gray-700 transition-colors"
                      title={expandedTokens[token.address] ? "Hide token details" : "View token details"}
                    >
                      {expandedTokens[token.address] ? 'Hide Details' : 'View Details'}
                    </button>
                  </div>
                </div>
                
                {/* Expanded details row - keep this part but apply dark theme */}
                {expandedTokens[token.address] && (
                  <div className="bg-gray-750 px-6 py-6 border-t border-gray-700">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div>
                        <h3 className="text-lg font-medium mb-4 text-white flex items-center">
                          Token Details
                          <HelpIcon 
                            content={
                              <div>
                                <p>These are the core parameters of your token that were set during deployment.</p>
                                <p className="mt-1">Most of these values cannot be changed after deployment, as they are permanently stored on the blockchain.</p>
                              </div>
                            }
                          />
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="text-sm font-medium text-gray-400">Address</div>
                          <div className="text-sm text-white break-all">{token.address}</div>
                          
                          <div className="text-sm font-medium text-gray-400">Initial Supply</div>
                          <div className="text-sm text-white token-amount">{token.initialSupply} {token.symbol}</div>
                          
                          <div className="text-sm font-medium text-gray-400">Max Supply</div>
                          <div className="text-sm text-white token-amount">{token.maxSupply} {token.symbol}</div>
                          
                          <div className="text-sm font-medium text-gray-400">Mint Fee</div>
                          <div className="text-sm text-white">{token.mintFeeBps / 100}%</div>
                          
                          <div className="text-sm font-medium text-gray-400">Unlock Time</div>
                          <div className="text-sm text-white">{formatDate(token.unlockTime)}</div>
                          
                          <div className="text-sm font-medium text-gray-400">Platform Fee Address</div>
                          <div className="text-sm text-white break-all">{formatAddress(token.platformFeeAddress)}</div>
                          
                          <div className="text-sm font-medium text-gray-400">Your Balance</div>
                          <div className="text-sm text-white">
                            {loadingBalances[token.address] ? (
                              <span className="loading-spinner mr-1"></span>
                            ) : (
                              <span className="token-amount">
                                {tokenBalances[token.address] || '0'} {token.symbol}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="mt-4">
                          <a 
                            href={getTokenExplorerUrl(token)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm"
                          >
                            View on Blockchain Explorer ↗
                          </a>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-4 text-white flex items-center">
                          Token Actions
                          <HelpIcon 
                            content={
                              <div>
                                <p>These controls allow you to manage your token if you are the owner.</p>
                                <p className="mt-1">Common actions include:</p>
                                <ul className="list-disc ml-5">
                                  <li><strong>Mint:</strong> Create more tokens (up to max supply)</li>
                                  <li><strong>Burn:</strong> Permanently remove tokens from circulation</li>
                                  <li><strong>Transfer:</strong> Send tokens to another wallet</li>
                                  <li><strong>Pause/Unpause:</strong> Temporarily disable or enable all token transfers</li>
                                </ul>
                                <p className="mt-1">Note: Some actions may only be available to the token owner.</p>
                              </div>
                            }
                          />
                        </h3>
                        <TokenActionsForm 
                          token={token}
                          account={account}
                          onPerformAction={(action, amount, recipient) => 
                            handleTokenAction(token, action, amount, recipient)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
      
      {/* Token Detail Modal */}
      {selectedToken && (
        <TokenDetailModal
          token={selectedToken}
          account={account}
          provider={provider}
          onClose={closeTokenDetail}
          onPerformAction={(token, action, amount, recipient) => {
            // Properly handle the action on the selected token
            return handleTokenAction(token, action, amount, recipient);
          }}
        />
      )}
    </>
  );
};

export default TokenTable; 