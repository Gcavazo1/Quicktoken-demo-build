import { ethers } from 'ethers';
import { DeployedToken, TokenDeployParams, Provider } from './types';
import { NETWORKS } from '../shared/constants/networks';
import { QuickTokenInterface } from './QuickTokenArtifact';

/**
 * Deploy a new QuickToken contract
 * @param provider Ethers provider (must be a BrowserProvider with signer)
 * @param params Token deployment parameters
 * @returns DeployedToken object with token details
 */
export async function deployToken(
  provider: Provider,
  params: TokenDeployParams
): Promise<DeployedToken> {
  if (!provider) {
    throw new Error('Provider is required');
  }

  // Get signer and network
  const signer = await provider.getSigner();
  const network = await provider.getNetwork();
  const signerAddress = await signer.getAddress();

  try {
    console.log('Starting deployment with parameters:', params);
    
    // Convert values to appropriate format
    const initialSupplyWei = ethers.parseEther(params.initialSupply);
    const maxSupplyWei = ethers.parseEther(params.maxSupply);

    // Use ethers.js v6 approach for Contract creation
    console.log('Creating contract factory...');
    
    console.log('ABI:', JSON.stringify(QuickTokenInterface.abi).substring(0, 100) + '...');
    console.log('Bytecode length:', QuickTokenInterface.bytecode.length);
    
    // Set deployment options with gas limit to avoid out-of-gas errors
    // Gas price will be determined automatically by ethers.js (legacy or EIP-1559 based on network)
    const deployOptions: { gasLimit: bigint } = {
      gasLimit: BigInt(12000000), // Default 12 million gas units
    };
    
    // DEBUG: Inspect bytecode before using it
    console.log('Type of bytecode being passed to Factory:', typeof QuickTokenInterface.bytecode);
    console.log('Bytecode value (first 100 chars):', QuickTokenInterface.bytecode.substring(0, 100));
    console.log('Is bytecode a valid hex string (basic check)?', /^0x[0-9a-fA-F]*$/.test(QuickTokenInterface.bytecode));

    // Use ethers.js v6 ContractFactory with Interface object
    const factory = new ethers.ContractFactory(
      QuickTokenInterface.abi,
      QuickTokenInterface.bytecode,
      signer
    );

    console.log('Contract factory created successfully');

    // Deploy contract with detailed logging and options
    console.log('Preparing deployment transaction...');
    
    // Log constructor parameters
    console.log('Constructor params:', {
      name: params.name,
      symbol: params.symbol,
      initialSupplyWei: initialSupplyWei.toString(),
      maxSupplyWei: maxSupplyWei.toString(),
      mintFeeBps: params.mintFeeBps,
      unlockTime: params.unlockTime,
      platformFeeAddress: params.platformFeeAddress
    });
    
    // Estimate gas before deploying to catch potential errors
    try {
      console.log('Estimating gas...');
      const estimatedGas = await factory.getDeployTransaction(
        params.name,
        params.symbol,
        initialSupplyWei,
        maxSupplyWei,
        params.mintFeeBps,
        params.unlockTime,
        params.platformFeeAddress,
        params.platformFeePercentageBps
      ).then(tx => provider.estimateGas(tx));
      
      console.log('Estimated gas:', estimatedGas.toString());
      
      // Update gas limit if estimation succeeds
      deployOptions.gasLimit = BigInt(estimatedGas) * BigInt(120) / BigInt(100); // 20% buffer
      console.log('Using gas limit:', deployOptions.gasLimit.toString());
    } catch (gasError: any) {
      // Handle specific estimation errors more gracefully
      if (gasError.code === 'CALL_EXCEPTION' && gasError.data?.startsWith('0x1e4fbdf7')) {
        // Likely the "Unlock time must be in the future" error during estimation
        console.warn('Gas estimation failed potentially due to unlock time check. Proceeding with default gas limit.');
        // Use the default gas limit already set in deployOptions
      } else {
        // For other estimation errors, log them but still proceed with default
        console.error('Gas estimation failed:', gasError);
        console.error('Gas estimation error code:', gasError.code);
        console.error('Gas estimation error data:', gasError.data);
        console.log('Falling back to default gas limit:', deployOptions.gasLimit.toString());
      }
      // Fallback gas limit is already set in deployOptions, so we just continue
    }
    
    // DEBUG: Log final constructor arguments and types before deployment
    const finalArgs = [
      params.name,
      params.symbol,
      initialSupplyWei,
      maxSupplyWei,
      params.mintFeeBps,
      params.unlockTime,
      params.platformFeeAddress,
      params.platformFeePercentageBps
    ];
    console.log('Final constructor args being passed:', finalArgs);
    console.log('Argument types:', finalArgs.map(arg => typeof arg + (typeof arg === 'bigint' ? ' (BigInt)' : '')));

    console.log('Deploying contract with options:', deployOptions);
    const contract = await factory.deploy(
      params.name,
      params.symbol,
      initialSupplyWei,
      maxSupplyWei,
      params.mintFeeBps,
      params.unlockTime,
      params.platformFeeAddress,
      params.platformFeePercentageBps,
      deployOptions
    );

    // Get deployment transaction - ethers v6 pattern
    const deployTx = contract.deploymentTransaction();
    
    if (!deployTx) {
      throw new Error('Deployment transaction not created');
    }
    
    console.log('Deployment transaction sent:', deployTx.hash);

    // Wait for deployment to finish
    console.log('Waiting for deployment confirmation...');
    const receipt = await deployTx.wait();
    console.log('Transaction confirmed in block:', receipt?.blockNumber);
    
    // Get contract address with ethers v6 pattern
    const contractAddress = await contract.getAddress();
    console.log('Contract deployed at:', contractAddress);

    // Create token object
    const token: DeployedToken = {
      address: contractAddress,
      name: params.name,
      symbol: params.symbol,
      initialSupply: params.initialSupply,
      maxSupply: params.maxSupply,
      decimals: 18, // ERC20 standard for most tokens
      mintFeeBps: params.mintFeeBps,
      unlockTime: params.unlockTime,
      platformFeeAddress: params.platformFeeAddress,
      platformFeePercentage: params.platformFeePercentageBps,
      owner: signerAddress,
      totalSupply: params.initialSupply,
      paused: false,
      deployedAt: Math.floor(Date.now() / 1000),
      chainId: Number(network.chainId)
    };

    return token;
  } catch (error: any) {
    // Check if the user rejected the transaction in their wallet
    if (error.code === 'ACTION_REJECTED') {
      console.warn('User rejected the deployment transaction.');
      // Propagate a user-friendly error message instead of the raw ethers error
      throw new Error('Deployment cancelled by user.'); 
    } else {
      // Handle other deployment errors
      console.error('Token deployment failed:', error);
      
      // Enhanced error reporting for other errors
      if (error.code) {
        console.error('Error code:', error.code);
      }
      if (error.reason) {
        console.error('Error reason:', error.reason);
      }
      if (error.transaction) {
        console.error('Error transaction data length:', error.transaction.data?.length);
        console.error('Error transaction from:', error.transaction.from);
        console.error('Error transaction to:', error.transaction.to);
      }
      if (error.error) {
        console.error('Inner error:', error.error);
      }
      
      // Throw a generic failure message for other errors
      throw new Error(`Deployment failed: ${error.reason || error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Load deployed tokens from local storage, returning a network-organized object.
 * @returns Record<number, DeployedToken[]> Tokens organized by chain ID, or {} if none/error.
 */
export function loadTokensByNetwork(): Record<number, DeployedToken[]> {
  try {
    const tokensJson = localStorage.getItem('quicktokens');
    if (!tokensJson) return {};
    
    const parsedData = JSON.parse(tokensJson);

    // Basic validation to ensure it's an object (might be old array format)
    if (typeof parsedData !== 'object' || parsedData === null || Array.isArray(parsedData)) {
        console.warn('Stored token data is not in the expected network-organized format. Attempting conversion or returning empty.');
        // Handle potential legacy array format - Convert it
        if (Array.isArray(parsedData)) {
            const organized: Record<number, DeployedToken[]> = {};
            parsedData.forEach((token: DeployedToken) => {
                if (token && typeof token === 'object' && token.chainId) {
                    const networkId = token.chainId;
                    if (!organized[networkId]) organized[networkId] = [];
                    organized[networkId].push(token);
                } else {
                    console.warn('Skipping invalid token data during conversion:', token);
                }
            });
            // Save the converted format back
            localStorage.setItem('quicktokens', JSON.stringify(organized));
            return organized;
        } 
        // Otherwise, it's invalid, return empty
        return {};
    }
    
    // It's likely the correct object format
    // Perform a deeper check later if needed
    return parsedData as Record<number, DeployedToken[]>;

  } catch (error) {
    console.error('Failed to load or parse tokens from localStorage:', error);
    return {}; // Return empty object on error
  }
}

/**
 * Save deployed token to local storage (maintains network-organized structure).
 * @param token Token to save
 */
export function saveDeployedToken(token: DeployedToken): void {
  if (!token || !token.chainId) {
      console.error('Attempted to save invalid token data:', token);
      return;
  }
  try {
    // Get existing tokens directly as network-organized object
    const organizedTokens = loadTokensByNetwork();
    
    const chainIdKey = token.chainId.toString(); // Use string key for object
    const networkTokens = organizedTokens[token.chainId] || [];

    // Check if token already exists within this network's array
    const existingIndex = networkTokens.findIndex(
      (t) => t.address.toLowerCase() === token.address.toLowerCase()
    );
    
    // Update or add the token within the specific network array
    if (existingIndex >= 0) {
      networkTokens[existingIndex] = token;
    } else {
      networkTokens.push(token);
    }
    
    // Update the main object with the modified network array
    organizedTokens[token.chainId] = networkTokens;
    
    // Save the updated organized structure back to localStorage
    localStorage.setItem('quicktokens', JSON.stringify(organizedTokens));

  } catch (error) {
    console.error('Failed to save token to localStorage:', error);
  }
}

/**
 * (Refactor Recommended if Used) Save multiple tokens at once.
 */
export function saveMultipleTokens(tokens: DeployedToken[], chainId?: number): void {
  console.warn('saveMultipleTokens is using potentially outdated logic and might need refactoring.');
  try {
    // This function needs refactoring to work correctly with the new object storage format
    // It currently flattens and re-organizes, which is inefficient.
    const organizedTokens = loadTokensByNetwork();
    
    tokens.forEach(token => {
      // If chainId is provided, only save tokens on that network
      if (chainId !== undefined && token.chainId !== chainId) {
        return;
      }
      const targetChainId = token.chainId;
      const networkTokens = organizedTokens[targetChainId] || [];
      const existingIndex = networkTokens.findIndex(
        (t) => t.address.toLowerCase() === token.address.toLowerCase()
      );
      if (existingIndex >= 0) {
        networkTokens[existingIndex] = token;
      } else {
        networkTokens.push(token);
      }
      organizedTokens[targetChainId] = networkTokens;
    });
    
    localStorage.setItem('quicktokens', JSON.stringify(organizedTokens));
  } catch (error) {
    console.error('Failed to save tokens to localStorage:', error);
  }
} 