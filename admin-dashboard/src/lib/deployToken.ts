import { ethers } from 'ethers';
import { QuickTokenABI } from './QuickTokenABI';
import { DeployedToken, TokenDeployParams, Provider } from './types';
import { NETWORKS } from '../shared/constants/networks';

// QuickToken contract bytecode (minified)
// This should be replaced with the actual compiled contract bytecode
const QuickTokenBytecode = '0x608060405234801561001057600080fd5b50600436106101425760003560e01c8063793ff179116100b8578063a457c2d71161007c578063a457c2d714610349578063a9059cbb14610362578063c492f04614610375578063dd62ed3e14610388578063e222e34e1461039b578063f2fde38b146103ae57600080fd5b8063793ff179146102e35780637a9a5b61146102ee57806388a1eaae146103015780638da5cb5b1461031457806395d89b411461032757600080fd5b80633d8ab1e3116101055780633d8ab1e31461023557806342966c68146102425780634f6ccce7146102555780636352211e14610268578063702376a91461027b57806370a08231146102d057600080fd5b806301ffc9a71461014757806306fdde031461016f578063095ea7b31461018457806318160ddd146101a757806320c8abfa146101b957806323b872dd14610222575b600080fd5b61015a610155366004610b16565b6103c1565b60405190151581526020015b60405180910390f35b6101776103e1565b6040516101669190610b7f565b61015a610192366004610be1565b610473565b6005545b604051908152602001610166565b6101776101c7366004610c0b565b61048d565b6101ab60008051602061109e833981519152546001600160a01b031681565b61015a610230366004610c3d565b61049e565b6101ab60135481565b6101ab610250366004610c7d565b6104c2565b6101ab610263366004610c7d565b6104d0565b6101ab610276366004610c7d565b610512565b61015a610289366004610c96565b60008051602061109e833981519152546001600160a01b03163314610300576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152600b60248201527f4e6f7420616c6c6f7765640000000000000000000000000000000000000000006044820152606401610166565b600092915050565b6101ab6102de366004610cc4565b61051e565b6101ab60125481565b6101ab60008051602061109e833981519152546001600160a01b031690565b6101ab6101ae366004610be1565b61052a565b6000546001600160a01b03165b6040516001600160a01b039091168152602001610166565b6101776105a4565b61015a610357366004610be1565b6105b3565b61015a610370366004610be1565b610633565b6101ab610383366004610c7d565b610641565b6101ab610396366004610be1565b610661565b6101ab60008051602061109e833981519152546001600160a01b031681565b6103bf6103bc366004610cc4565b61068c565b005b60006001600160e01b03198216635a05180f60e01b1480610300575060006103e682610741565b60606103ec60085490565b6040518060400160405280600a8152602001692a32b9ba2aaa102a37b960b11b8152509050919050565b600061048033848461075d565b50600192915050565b61049682610882565b90505b919050565b60006104ab848484610960565b6104b78484846109e5565b1490505b9392505050565b60006103008261051e565b60006104e560118054600181600116156101000203166002900490501590565b6104b78660118054600181600116156101000203166002900490501590565b6000610499826103c1565b60006104993383610512565b600080610535610a83565b61054a6001600160a01b0384168230610960565b610552610a83565b61055c8483610512565b61056584610512565b61056d610a83565b600061057e89886000878761075d565b9050610589826103c1565b61059289610512565b6105a4565b600063a9059cbb60e01b9695505050505050565b60606105af60085490565b905090565b6000336001600160a01b03841614156105e25760405162461bcd60e51b815260040161016690610cdd565b6001600160a01b0384166000908152600c602052604090205460ff1615610300576105158285858480806020026020016040528093929190818152602001838360200280828437600081840152601f19601f82011690508083019250505050505050610a85565b600061048033848461075d565b60006104998261051e565b60008061066c610a83565b610674610a83565b600092835250602090910152919050565b60008051602061109e833981519152546001600160a01b0316331461071f5760405162461bcd60e51b815260206004820152602660248201527f4f776e61626c653a2063616c6c6572206973206e6f7420746865206f776e657260448201527f20000000000000000000000000000000000000000000000000000000000000006064820152608401610166565b60008051602061109e83398151915280546001600160a01b0319166001600160a01b0392909216919091179055565b600063a9059cbb60e01b4a101580610300575060006103e682610a8a565b6001600160a01b038316610812576040517f08c379a000000000000000000000000000000000000000000000000000000000815260206004820152602660248201527f45524332303a20617070726f76652066726f6d20746865207a65726f2061646460448201527f72657373000000000000000000000000000000000000000000000000000000006064820152608401610166565b6001600160a01b03821661087e576040517f08c379a0000000000000000000000000000000000000000000000000000000008152602060048201526024808201527f45524332303a20617070726f766520746f20746865207a65726f20616464726560448201527f73730000000000000000000000000000000000000000000000000000000000006064820152608401610166565b505050565b60606000825160026108939190610d3b565b67ffffffffffffffff8111156108aa576108aa610d5156b6040519080825280601f01601f1916602001820160405280156108d4576020820181803683370190505b50905060005b838110156109585760018484015181106108f5576108f5610d6756b602001015160f81c60f81b818381518110610912576109126107d066576b6c613a6b69636b6f757454696d657360a81b83525061095b56b60f81b8383815181106108c9576108c9610d6756b6001016108da56b50939250505056b600063a9059cbb60e01b3a101580610a065750836001600160a01b03166109fb8461051256b6016001600160a01b0316145b80610a775750604051630a85bd0160e11b81526001600160a01b0385169063150b7a0290610a3a903390879086906004016107d056b602060405180830381600087803b158015610a5457600080fd5b505af1925050508015610a74575060408051601f3d908101601f19168201909252610a7191810190610d7d56b60015b6104bb575060009594505050505056b90509056b50505056b3a9059cbb60e01b8083019850601c019750909550935050505054600160e01b8110610ab5575060006104993356b600080610148571919825400610ad0575060206104993356b6024830112156105055760246104993356b634e487b7160e01b600052604160045260246000fd5b600060208284031215610b2857600080fd5b81356001600160e01b031981168114610b4057600080fd5b939250505056b6000815180845260005b81811015610b6d57602081850181015186830182015201610b5156b81811115610b7f576000602083870101525b50601f01601f1916929092016020019291505056b602081526000610b406020830184610b4756b80356001600160a01b0381168114610bd957600080fd5b600060208284031215610bf457600080fd5b610bfd83610bc256b94602093909301359350505056b600060208284031215610c1d57600080fd5b503591905056b60208082526022908201527f45524332303a20617070726f766520746f20746865207a65726f206164647265604082015261737360f01b60608201526080019056b634e487b7160e01b600052601160045260246000fd5b634e487b7160e01b600052604160045260246000fd5b634e487b7160e01b600052603260045260246000fd5b600060208284031215610d8f57600080fd5b815180151581146104995760008051602061109e833981519152546001600160a01b031681525063a9059cbb60e01b02946000929190a1';

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

  // console.log('Deploying token with parameters:', params);
  // console.log('Deployer address:', signerAddress);
  // console.log('Network:', network.name, '(', network.chainId, ')');

  try {
    // Convert values to appropriate format
    const initialSupplyWei = ethers.parseEther(params.initialSupply);
    const maxSupplyWei = ethers.parseEther(params.maxSupply);

    // Create contract factory
    const factory = new ethers.ContractFactory(
      QuickTokenABI,
      QuickTokenBytecode,
      signer
    );

    // Deploy contract
    const contract = await factory.deploy(
      params.name,
      params.symbol,
      initialSupplyWei,
      maxSupplyWei,
      params.mintFeeBps,
      params.unlockTime,
      params.platformFeeAddress
    );

    const txHash = contract.deploymentTransaction()?.hash;
    // console.log('Deployment transaction sent:', txHash);

    // Wait for deployment to finish
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();
    // console.log('Contract deployed at:', contractAddress);

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
      platformFeePercentage: 2000, // Default 20% in basis points
      owner: signerAddress,
      totalSupply: params.initialSupply,
      paused: false,
      deployedAt: Math.floor(Date.now() / 1000),
      chainId: Number(network.chainId)
    };

    return token;
  } catch (error: any) {
    console.error('Token deployment failed:', error);
    throw new Error(`Deployment failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Load deployed tokens from local storage
 * @returns Array of deployed tokens
 */
export function loadDeployedTokens(): DeployedToken[] {
  try {
    const tokensJson = localStorage.getItem('quicktokens');
    if (!tokensJson) return [];
    
    // Parse tokens from storage
    const rawTokens = JSON.parse(tokensJson);
    
    // Handle both formats: array or network-organized object
    if (Array.isArray(rawTokens)) {
      // Legacy format (array) - return as is
      return rawTokens;
    } else {
      // New format (object by network) - flatten all networks into a single array
      const allTokens: DeployedToken[] = [];
      Object.values(rawTokens).forEach((networkTokens: any) => {
        if (Array.isArray(networkTokens)) {
          allTokens.push(...networkTokens);
        }
      });
      return allTokens;
    }
  } catch (error) {
    console.error('Failed to load tokens from localStorage:', error);
    return [];
  }
}

/**
 * Save deployed token to local storage
 * @param token Token to save
 */
export function saveDeployedToken(token: DeployedToken): void {
  try {
    // Get existing tokens (as array)
    const existingTokens = loadDeployedTokens();
    
    // Check if token already exists
    const existingIndex = existingTokens.findIndex(
      (t) => t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId
    );
    
    // Update or add the token
    if (existingIndex >= 0) {
      existingTokens[existingIndex] = token;
    } else {
      existingTokens.push(token);
    }
    
    // Convert to network-organized structure
    const organizedTokens: { [chainId: string]: DeployedToken[] } = {};
    
    existingTokens.forEach(t => {
      const chainIdKey = t.chainId.toString();
      if (!organizedTokens[chainIdKey]) {
        organizedTokens[chainIdKey] = [];
      }
      organizedTokens[chainIdKey].push(t);
    });
    
    // Save organized tokens to localStorage
    localStorage.setItem('quicktokens', JSON.stringify(organizedTokens));
  } catch (error) {
    console.error('Failed to save token to localStorage:', error);
  }
}

/**
 * Save multiple tokens at once, useful when refreshing a whole network's token data
 * @param tokens Array of tokens to save
 * @param chainId Optional chain ID to filter tokens by
 */
export function saveMultipleTokens(tokens: DeployedToken[], chainId?: number): void {
  try {
    // Get existing tokens
    const existingTokens = loadDeployedTokens();
    const updatedTokens = [...existingTokens];
    
    // Update tokens
    tokens.forEach(token => {
      // If chainId is provided, only save tokens on that network
      if (chainId !== undefined && token.chainId !== chainId) {
        return;
      }
      
      const existingIndex = updatedTokens.findIndex(
        (t) => t.address.toLowerCase() === token.address.toLowerCase() && t.chainId === token.chainId
      );
      
      if (existingIndex >= 0) {
        updatedTokens[existingIndex] = token;
      } else {
        updatedTokens.push(token);
      }
    });
    
    // Convert to network-organized structure
    const organizedTokens: { [chainId: string]: DeployedToken[] } = {};
    
    updatedTokens.forEach(t => {
      const chainIdKey = t.chainId.toString();
      if (!organizedTokens[chainIdKey]) {
        organizedTokens[chainIdKey] = [];
      }
      organizedTokens[chainIdKey].push(t);
    });
    
    // Save organized tokens to localStorage
    localStorage.setItem('quicktokens', JSON.stringify(organizedTokens));
  } catch (error) {
    console.error('Failed to save tokens to localStorage:', error);
  }
} 