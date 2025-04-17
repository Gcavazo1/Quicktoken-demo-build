import { ethers, Provider } from 'ethers';
// Get the type from the hook's return value
import { useNetwork } from '../contexts/NetworkContext'; 
type NetworkContextType = ReturnType<typeof useNetwork>;
import axios from 'axios'; // Need to install axios if not already

// Define the expected structure of the details fetched from the chain
export interface FetchedTokenDetails {
  name: string;
  symbol: string;
  decimals: number;
  owner: string;
  totalSupply: string; // Keep as string initially, format later if needed
}

// Define the structure for the block explorer API response (for getabi)
interface ExplorerApiResponse {
  status: string;
  message: string;
  result: string; // ABI is usually a JSON string within this field
}

// Standard ERC20 ABI with optional owner() function
// This allows us to interact with any ERC20 token without needing to fetch the full ABI
const STANDARD_ERC20_ABI = [
  // Read functions
  "function name() view returns (string)",
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function totalSupply() view returns (uint256)",
  "function balanceOf(address owner) view returns (uint256)",
  // Optional owner function (not part of ERC20 but common)
  "function owner() view returns (address)",
  // Transfer functions (not needed for import but included for completeness)
  "function transfer(address to, uint amount) returns (bool)",
  "function transferFrom(address sender, address recipient, uint256 amount) returns (bool)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];

/**
 * Fetches standard ERC20 token details (name, symbol, decimals, owner, totalSupply) 
 * directly from the blockchain using the contract address.
 * No longer tries to fetch ABI from the explorer due to potential CORS issues.
 * 
 * @param address The ERC20 contract address.
 * @param chainId The chain ID of the network where the contract resides.
 * @param provider An ethers.js Provider instance connected to the correct network.
 * @param networkContext The NetworkContext instance to get explorer API URLs.
 * @returns A promise resolving to FetchedTokenDetails or throwing an error.
 */
export async function fetchTokenDetailsFromChain(
  address: string,
  chainId: number,
  provider: Provider,
  networkContext: NetworkContextType
): Promise<FetchedTokenDetails> {
  console.log(`[fetchTokenDetailsFromChain] Fetching details for ${address} on chain ${chainId}`);

  // 1. Verify the network has an explorer URL configured
  const networkInfo = networkContext.getNetworkByChainId(chainId);
  if (!networkInfo?.explorerUrl) {
    throw new Error(`Block explorer URL not configured for chain ID ${chainId}`);
  }

  // Basic address validation
  if (!ethers.isAddress(address)) {
    throw new Error(`Invalid contract address format: ${address}`);
  }

  try {
    console.log('[fetchTokenDetailsFromChain] Using standard ERC20 ABI to interact with contract');
    
    // 2. Create a contract instance with the standard ERC20 ABI
    const contract = new ethers.Contract(address, STANDARD_ERC20_ABI, provider);
    
    console.log('[fetchTokenDetailsFromChain] Calling contract methods...');
    
    // 3. Fetch basic token details one by one with individual error handling
    // This approach is more robust across different wallet providers
    
    // Initialize with default/fallback values
    let name = 'Unknown Token';
    let symbol = 'UNKNOWN';
    let decimals = 18; // Most common fallback
    let totalSupplyWei = BigInt(0);
    let owner = ethers.ZeroAddress;
    
    // Try to get name
    try {
      console.log('[fetchTokenDetailsFromChain] Fetching name...');
      name = await contract.name();
      console.log(`[fetchTokenDetailsFromChain] Name: ${name}`);
    } catch (error: any) {
      console.warn('[fetchTokenDetailsFromChain] Failed to fetch name:', error.message);
      // Keep the default value
    }
    
    // Try to get symbol
    try {
      console.log('[fetchTokenDetailsFromChain] Fetching symbol...');
      symbol = await contract.symbol();
      console.log(`[fetchTokenDetailsFromChain] Symbol: ${symbol}`);
    } catch (error: any) {
      console.warn('[fetchTokenDetailsFromChain] Failed to fetch symbol:', error.message);
      // Keep the default value
    }
    
    // Try to get decimals
    try {
      console.log('[fetchTokenDetailsFromChain] Fetching decimals...');
      const fetchedDecimals = await contract.decimals();
      decimals = Number(fetchedDecimals);
      console.log(`[fetchTokenDetailsFromChain] Decimals: ${decimals}`);
    } catch (error: any) {
      console.warn('[fetchTokenDetailsFromChain] Failed to fetch decimals, using default (18):', error.message);
      // Keep the default value of 18
    }
    
    // Try to get totalSupply
    try {
      console.log('[fetchTokenDetailsFromChain] Fetching totalSupply...');
      totalSupplyWei = await contract.totalSupply();
      console.log(`[fetchTokenDetailsFromChain] Total Supply (wei): ${totalSupplyWei.toString()}`);
    } catch (error: any) {
      console.warn('[fetchTokenDetailsFromChain] Failed to fetch totalSupply:', error.message);
      // Keep the default value
    }
    
    // Try to get owner (optional)
    try {
      console.log('[fetchTokenDetailsFromChain] Checking if owner() function exists...');
      // Check if owner() exists by trying to estimate gas for a static call
      await provider.estimateGas({
        to: address,
        data: contract.interface.encodeFunctionData('owner', [])
      });
      
      // If no error was thrown, call owner()
      console.log('[fetchTokenDetailsFromChain] Fetching owner...');
      owner = await contract.owner();
      console.log(`[fetchTokenDetailsFromChain] Owner: ${owner}`);
    } catch (error: any) {
      console.warn('[fetchTokenDetailsFromChain] owner() function not available or failed:', error.message);
      // Keep the default zero address
    }
    
    // Format the totalSupply with the appropriate decimals
    const totalSupply = ethers.formatUnits(totalSupplyWei, decimals);
    
    // Ensure types match expectations
    const result: FetchedTokenDetails = {
      name: String(name),
      symbol: String(symbol),
      decimals: Number(decimals),
      owner: String(owner),
      totalSupply: String(totalSupply)
    };
    
    console.log('[fetchTokenDetailsFromChain] Token details collected:', result);
    
    // Validate that we have at least a name and symbol
    if (result.name === 'Unknown Token' && result.symbol === 'UNKNOWN') {
      throw new Error(`Contract at ${address} does not appear to be a standard ERC20 token or you might be connected to the wrong network. Please verify that the contract address is correct and that you're connected to the network where this token was deployed.`);
    }
    
    return result;

  } catch (error: any) {
    // Handle all other errors
    console.error('[fetchTokenDetailsFromChain] Error:', error);
    
    // Rethrow with useful message
    if (error instanceof Error) {
      throw error; // If it's already a formatted error, just pass it along
    }
    
    throw new Error(`Failed to interact with token contract: ${error?.message || 'Unknown error'}`);
  }
} 