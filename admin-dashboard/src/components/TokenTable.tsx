import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DeployedToken, TokenAction } from '../lib/types/tokens';
import { formatDate, formatNumber, truncateAddress } from '../utils/format';
import { getNetworkName, getExplorerUrl } from '../shared/constants/networks';
import { Provider } from '../lib/types/web3';
import { QuickTokenABI } from '../lib/QuickTokenABI';
import TokenActionsForm from './TokenActionsForm';
import TokenDetailModal from './TokenDetailModal';
import HelpIcon from './HelpIcon';
import { useTokens } from '../contexts/TokenContext';

interface TokenTableProps {
  tokens: DeployedToken[];
  provider: Provider | null;
  account: string | null;
}

const TokenTable: React.FC<TokenTableProps> = ({ tokens, provider, account }) => {
  const [expandedTokens, setExpandedTokens] = useState<{ [key: string]: boolean }>({});
  const [tokenBalances, setTokenBalances] = useState<{ [key: string]: string }>({});
  const [loadingBalances, setLoadingBalances] = useState<{ [key: string]: boolean }>({});
  const [selectedToken, setSelectedToken] = useState<DeployedToken | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);
  const [balances, setBalances] = useState<{ [key: string]: string }>({});
  const { performTokenAction } = useTokens();
  
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
    
    setExpandedTokens(prev => ({
      ...prev,
      [token.address]: !isExpanded
    }));
    
    // Load balance when expanding (consider if context should manage this)
    if (!isExpanded && provider && account) {
      await loadTokenInfo(token);
    }
  };
  
  // Load token balance and info (keep for now, might integrate into context later)
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
      {/* Local Storage Notification */}
      <div className="bg-blue-900/40 border border-blue-700 rounded-md p-3 mb-4 text-sm text-blue-100">
        <div className="flex items-start">
          <div className="flex-shrink-0 pt-0.5">
            <svg className="h-5 w-5 text-blue-300" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p>
              Token information is stored in your browser's local storage. Clearing your browser data or using a different browser will reset this information.
            </p>
          </div>
        </div>
      </div>

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
                position="right"
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
                position="bottom"
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
                position="bottom"
              />
            </div>
            <div className="w-1/4 px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider flex items-center">
              Actions
              <HelpIcon 
                content={
                  <div>
                    <p>Access management functions for your token:</p>
                    <ul className="list-disc list-inside mt-1">
                      <li><strong>View Details:</strong> Expands the row to show detailed token information and controls</li>
                    </ul>
                  </div>
                }
                position="left"
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
                        <span className="text-blue-300 font-bold">{token.symbol}</span>
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
                      onClick={() => toggleDetails(token)}
                      className="text-blue-400 hover:text-blue-300 px-3 py-1 border border-blue-700 rounded-md bg-blue-900 bg-opacity-30 hover:bg-opacity-50 transition-colors w-full"
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
                          <span className="ml-2">
                            <HelpIcon 
                              content={
                                <div>
                                  <p>_____These are the core___________ _____details of your token________ _____contract:</p>
                                  <ul className="list-disc list-inside mt-1">
                                    <li><strong>Address:</strong> Your token's unique contract address on the blockchain</li>
                                    <li><strong>Initial Supply:</strong> The amount created at deployment</li>
                                    <li><strong>Max Supply:</strong> Maximum tokens that can ever exist</li>
                                    <li><strong>Mint Fee:</strong> Fee charged when minting new tokens</li>
                                    <li><strong>Unlock Time:</strong> When time-locked features become available</li>
                                  </ul>
                                </div>
                              }
                              position="bottom"
                            />
                          </span>
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
                                <ul className="list-disc list-inside mt-1">
                                  <li><strong>Mint:</strong> Create additional tokens (up to max supply)</li>
                                  <li><strong>Burn:</strong> Permanently destroy tokens you own</li>
                                  <li><strong>Transfer:</strong> Send tokens to another address</li>
                                </ul>
                              </div>
                            }
                            position="right"
                          />
                        </h3>
                        <TokenActionsForm 
                          token={token}
                          account={account}
                          onPerformAction={performTokenAction}
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
          onPerformAction={async (modalToken, action: TokenAction, amount, recipient) => {
            const success = await performTokenAction({
              token: modalToken,
              action,
              amount,
              recipient
            });
            if (success) {
              closeTokenDetail(); // Close modal on success
              // Optionally refresh balance here too
              if (provider && account) {
                setTimeout(() => loadTokenInfo(modalToken), 500);
              }
            }
            return success;
          }}
        />
      )}
    </>
  );
};

export default TokenTable; 