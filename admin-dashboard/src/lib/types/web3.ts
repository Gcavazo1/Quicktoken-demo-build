/**
 * Web3-related type definitions
 * Standardizing ethers.js types across the application
 */

import { ethers } from 'ethers';
import { NetworkInfo, NETWORKS } from '../../shared/constants/networks';

/**
 * Provider type used throughout the application
 * We standardize on the modern Provider from ethers.js
 */
export type Provider = ethers.BrowserProvider;

/**
 * Signer type used throughout the application
 */
export type Signer = ethers.Signer;

/**
 * Contract instance type
 */
export type Contract = ethers.Contract;

/**
 * Transaction response type
 */
export type TransactionResponse = ethers.TransactionResponse;

/**
 * Transaction receipt type
 */
export type TransactionReceipt = ethers.TransactionReceipt;

// Re-export network types for backward compatibility
export type { NetworkInfo };
export { NETWORKS }; 