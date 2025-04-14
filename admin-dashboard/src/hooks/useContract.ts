import { useCallback, useMemo } from 'react';
import { Contract, ethers } from 'ethers';
import { useWallet } from './useWallet';

// ABI imports
import { QuickTokenABI } from '../lib/QuickTokenABI';

/**
 * Hook for interacting with blockchain contracts
 * @param address The contract address
 * @param abi The contract ABI (optional, defaults to QuickToken ABI)
 * @returns Object containing contract instance and utility functions
 */
export const useContract = (
  address: string | null | undefined, 
  abi: any = QuickTokenABI
) => {
  const { provider, address: account } = useWallet();
  
  /**
   * Get a read-only contract instance
   */
  const getReadOnlyContract = useCallback(() => {
    if (!address || !provider) return null;
    
    try {
      return new Contract(address, abi, provider);
    } catch (error) {
      console.error('Error creating read contract:', error);
      return null;
    }
  }, [address, abi, provider]);
  
  /**
   * Get a writable contract instance (with signer)
   */
  const getWritableContract = useCallback(async () => {
    if (!address || !provider || !account) return null;
    
    try {
      const signer = await provider.getSigner();
      return new Contract(address, abi, signer);
    } catch (error) {
      console.error('Error creating write contract:', error);
      return null;
    }
  }, [address, abi, provider, account]);
  
  /**
   * Read contract data (view/pure functions)
   */
  const readContractData = useCallback(async (
    methodName: string, 
    args: any[] = []
  ) => {
    const contract = getReadOnlyContract();
    if (!contract) return null;
    
    try {
      const method = contract[methodName];
      return await method(...args);
    } catch (error) {
      console.error(`Error reading ${methodName}:`, error);
      return null;
    }
  }, [getReadOnlyContract]);
  
  /**
   * Write to contract (state changing functions)
   */
  const writeToContract = useCallback(async (
    methodName: string, 
    args: any[] = [], 
    options = {}
  ) => {
    const contract = await getWritableContract();
    if (!contract) return null;
    
    try {
      const method = contract[methodName];
      const tx = await method(...args, options);
      return tx;
    } catch (error) {
      console.error(`Error executing ${methodName}:`, error);
      return null;
    }
  }, [getWritableContract]);
  
  /**
   * Check if user has sufficient balance for a transaction
   */
  const checkBalanceForTransaction = useCallback(async (
    value: string
  ): Promise<boolean> => {
    if (!provider || !account) return false;
    
    try {
      const balance = await provider.getBalance(account);
      return balance >= ethers.parseEther(value);
    } catch (error) {
      console.error('Error checking balance:', error);
      return false;
    }
  }, [provider, account]);
  
  /**
   * Format wei amount to ether (string)
   */
  const formatWei = useCallback((
    wei: bigint | string
  ): string => {
    try {
      return ethers.formatEther(wei);
    } catch (error) {
      console.error('Error formatting wei:', error);
      return '0';
    }
  }, []);
  
  /**
   * Parse ether amount to wei (bigint)
   */
  const parseEther = useCallback((
    ether: string
  ): bigint => {
    try {
      return ethers.parseEther(ether);
    } catch (error) {
      console.error('Error parsing ether:', error);
      return BigInt(0);
    }
  }, []);
  
  /**
   * Create a read contract instance for memoization
   */
  const readContract = useMemo(() => getReadOnlyContract(), [getReadOnlyContract]);
  
  /**
   * Create a write contract instance for memoization - this will be null due to async nature
   */
  const writeContract = null; // Cannot directly use async function in useMemo
  
  /**
   * Check if a contract exists at the given address
   */
  const checkContractExists = useCallback(async (): Promise<boolean> => {
    if (!address || !provider) return false;
    
    try {
      const code = await provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      console.error('Error checking contract existence:', error);
      return false;
    }
  }, [address, provider]);
  
  return {
    address,
    readContract,
    writeContract,
    readContractData,
    writeToContract,
    checkBalanceForTransaction,
    formatWei,
    parseEther,
    checkContractExists,
    isConnected: !!provider && !!account
  };
};

export default useContract; 