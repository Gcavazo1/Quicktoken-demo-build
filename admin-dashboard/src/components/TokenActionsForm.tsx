import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { DeployedToken } from '../lib/types/tokens';
import HelpIcon from './HelpIcon';

// Define the component props
interface TokenActionsFormProps {
  token: DeployedToken;
  account: string | null;
  onPerformAction: (action: string, amount: string, recipient?: string) => Promise<boolean>;
}

// Define the actions available
type ActionType = 'mint' | 'burn' | 'transfer' | 'pause' | 'unpause';

const TokenActionsForm: React.FC<TokenActionsFormProps> = ({ token, account, onPerformAction }) => {
  // State for the form
  const [selectedAction, setSelectedAction] = useState<ActionType>('mint');
  const [amount, setAmount] = useState<string>('');
  const [recipient, setRecipient] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reset recipient when action changes
  useEffect(() => {
    if (selectedAction === 'mint') {
      setRecipient(account || '');
    } else if (selectedAction === 'burn') {
      setRecipient('');
    }
  }, [selectedAction, account]);

  // Handle action selection
  const handleActionChange = (action: ActionType) => {
    setSelectedAction(action);
    setError(null);
    setSuccess(null);
  };

  // Validate the form input
  const validateForm = (): boolean => {
    // Reset states
    setError(null);
    setSuccess(null);

    // Validate amount
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }

    // Validate recipient for transfer
    if (selectedAction === 'transfer' && !ethers.isAddress(recipient)) {
      setError('Please enter a valid recipient address');
      return false;
    }

    return true;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      await onPerformAction(
        selectedAction, 
        amount, 
        selectedAction === 'transfer' ? recipient : undefined
      );
      setSuccess(`Successfully performed ${selectedAction} action`);
      setAmount('');
      if (selectedAction === 'transfer') setRecipient('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Calculate mint fee (if applicable)
  const calculateMintFee = (): string => {
    if (selectedAction !== 'mint' || !amount || parseFloat(amount) <= 0) return '0';
    
    // Calculate mint fee based on token's mintFeeBps
    const amountValue = parseFloat(amount);
    const mintFeePercentage = token.mintFeeBps / 10000; // Convert basis points to percentage
    const feeAmount = amountValue * mintFeePercentage;
    
    return feeAmount.toFixed(6);
  };

  return (
    <div className="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700">
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            selectedAction === 'mint' 
              ? 'text-blue-400 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => handleActionChange('mint')}
        >
          Mint
          <HelpIcon 
            content={
              <div>
                <p>Create new tokens and add them to a wallet.</p>
                <p className="mt-1">Minting:</p>
                <ul className="list-disc ml-5">
                  <li>Increases the total supply</li>
                  <li>Can only be done by the token owner</li>
                  <li>Cannot exceed the maximum supply</li>
                  <li>Incurs a mint fee of {token.mintFeeBps / 100}%</li>
                </ul>
              </div>
            }
          />
        </button>
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            selectedAction === 'burn' 
              ? 'text-blue-400 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => handleActionChange('burn')}
        >
          Burn
          <HelpIcon 
            content={
              <div>
                <p>Permanently destroy tokens, removing them from circulation.</p>
                <p className="mt-1">Burning:</p>
                <ul className="list-disc ml-5">
                  <li>Decreases the total supply</li>
                  <li>Can only be done by the token owner</li>
                  <li>Cannot burn more tokens than exist</li>
                  <li>Is irreversible - burned tokens cannot be recovered</li>
                </ul>
              </div>
            }
          />
        </button>
        <button
          className={`py-2 px-4 font-medium flex items-center ${
            selectedAction === 'transfer' 
              ? 'text-blue-400 border-b-2 border-blue-500' 
              : 'text-gray-400 hover:text-gray-300'
          }`}
          onClick={() => handleActionChange('transfer')}
        >
          Transfer
          <HelpIcon 
            content={
              <div>
                <p>Send tokens from your wallet to another address.</p>
                <p className="mt-1">Transferring:</p>
                <ul className="list-disc ml-5">
                  <li>Moves tokens between wallets</li>
                  <li>Can be done by anyone who owns tokens</li>
                  <li>Requires you to specify a recipient address</li>
                  <li>Cannot transfer more tokens than you own</li>
                </ul>
              </div>
            }
          />
        </button>
      </div>
      
      {/* Action form */}
      <form onSubmit={handleSubmit}>
        {/* Amount input */}
        <div className="mb-4">
          <label htmlFor="amount" className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
            Amount
            <HelpIcon 
              content={
                <div>
                  <p>The number of tokens to {selectedAction}.</p>
                  {selectedAction === 'mint' && (
                    <>
                      <p className="mt-1">You cannot mint more than the remaining supply:</p>
                      <p className="mt-1">Max Supply: {token.maxSupply}</p>
                      <p className="mt-1">Current Supply: {token.totalSupply}</p>
                      <p className="mt-1">Available to Mint: {Number(token.maxSupply) - Number(token.totalSupply)}</p>
                    </>
                  )}
                  {selectedAction === 'burn' && (
                    <p className="mt-1">You cannot burn more tokens than exist in the total supply ({token.totalSupply}).</p>
                  )}
                  {selectedAction === 'transfer' && (
                    <p className="mt-1">You cannot transfer more tokens than you own.</p>
                  )}
                </div>
              }
            />
          </label>
          <div className="relative rounded-md shadow-sm">
            <input
              type="number"
              id="amount"
              placeholder="0.0"
              className="bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 border border-gray-600 rounded-md"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <span className="text-gray-400">{token.symbol}</span>
            </div>
          </div>
        </div>
        
        {/* Recipient input (for transfer) */}
        {selectedAction === 'transfer' && (
          <div className="mb-4">
            <label htmlFor="recipient" className="block text-sm font-medium text-gray-300 mb-1 flex items-center">
              Recipient Address
              <HelpIcon 
                content={
                  <div>
                    <p>The wallet address that will receive the tokens.</p>
                    <p className="mt-1">Important considerations:</p>
                    <ul className="list-disc ml-5">
                      <li>Must be a valid Ethereum address (0x...)</li>
                      <li>Double-check the address - transfers cannot be reversed</li>
                      <li>Make sure the recipient has access to this wallet</li>
                      <li>Never send tokens to a contract address unless you're certain it can handle them</li>
                    </ul>
                  </div>
                }
              />
            </label>
            <input
              type="text"
              id="recipient"
              placeholder="0x..."
              className="bg-gray-700 text-white focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 border border-gray-600 rounded-md"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              required
            />
          </div>
        )}
        
        {/* Mint fee info (only for mint action) */}
        {selectedAction === 'mint' && (
          <div className="mb-4 p-3 bg-gray-700 rounded-md border border-gray-600">
            <p className="text-sm text-gray-300">
              Mint Fee: <span className="font-medium text-white">{calculateMintFee()} {token.symbol}</span> 
              ({token.mintFeeBps / 100}% of token value)
            </p>
            <p className="text-xs text-gray-400 mt-1">
              This fee will be automatically charged when minting tokens.
            </p>
          </div>
        )}
        
        {/* Error and success messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-900 bg-opacity-30 text-red-300 border border-red-800 rounded-md text-sm">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-900 bg-opacity-30 text-green-300 border border-green-800 rounded-md text-sm">
            {success}
          </div>
        )}
        
        {/* Submit button */}
        <div className="mt-4">
          <button
            type="submit"
            className={`w-full px-4 py-2 ${
              loading
                ? 'bg-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700'
            } text-white font-medium rounded-md flex items-center justify-center`}
            disabled={loading}
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              `${selectedAction === 'mint' ? 'Mint' : selectedAction === 'burn' ? 'Burn' : 'Transfer'} Tokens`
            )}
          </button>
        </div>
      </form>
      
      {/* Token Admin Controls */}
      {account && token.owner.toLowerCase() === account.toLowerCase() && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h3 className="text-lg font-medium text-white mb-3 flex items-center">
            Token Administration
            <HelpIcon 
              content={
                <div>
                  <p>Administrative actions for your token:</p>
                  <ul className="list-disc ml-5 mt-1">
                    <li><strong>Pause/Unpause:</strong> Temporarily halt all token transfers. Useful during emergencies or migrations.</li>
                  </ul>
                  <p className="mt-1">These actions can only be performed by the token owner.</p>
                </div>
              }
            />
          </h3>
          
          <div className="flex gap-3">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await onPerformAction('pause', '0');
                  setSuccess('Token transfers paused successfully');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to pause token');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || token.paused}
              className={`px-4 py-2 rounded-md font-medium text-sm ${
                token.paused
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-yellow-600 hover:bg-yellow-700 text-white'
              }`}
            >
              {token.paused ? 'Token Paused' : 'Pause Transfers'}
            </button>
            
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  await onPerformAction('unpause', '0');
                  setSuccess('Token transfers unpaused successfully');
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Failed to unpause token');
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading || !token.paused}
              className={`px-4 py-2 rounded-md font-medium text-sm ${
                !token.paused
                  ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {!token.paused ? 'Token Active' : 'Unpause Transfers'}
            </button>
          </div>
          
          {/* Status message indicator */}
          <div className={`mt-2 text-sm ${token.paused ? 'text-yellow-500' : 'text-green-500'}`}>
            {token.paused ? 'Token transfers are currently paused' : 'Token is active and transfers are enabled'}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mt-4 text-red-500 bg-red-900/20 border border-red-800 p-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mt-4 text-green-500 bg-green-900/20 border border-green-800 p-3 rounded-md text-sm">
          {success}
        </div>
      )}
    </div>
  );
};

export default TokenActionsForm; 