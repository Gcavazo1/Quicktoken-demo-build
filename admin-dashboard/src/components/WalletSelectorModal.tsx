import React, { useEffect, useRef, useState } from 'react';
import { Button } from './Button';
import { ethers } from 'ethers';
import { useAccount } from 'wagmi';
import { useWallet } from '../hooks/useWallet';
import { useClientWeb3Modal } from '../hooks/useClientWeb3Modal';
import { useNetwork } from '../contexts/NetworkContext';
import Image from 'next/image';

// Define props required for backward compatibility
interface WalletSelectorModalProps {
  isOpen: boolean;
  // Support both old and new prop names for closing
  onClose?: () => void;
  onRequestClose?: () => void;
  // These props are kept for backward compatibility but not used
  providers?: any[];
  onConnect?: (provider: any) => void;
  isLoading?: boolean;
}

/**
 * WalletSelectorModal - Component that opens the Web3Modal
 * 
 * This is a compatibility wrapper that works with the old code while using
 * Web3Modal under the hood.
 */
const WalletSelectorModal: React.FC<WalletSelectorModalProps> = ({ 
  isOpen, 
  onClose = () => {}, 
  onRequestClose = () => {}
}) => {
  // State to track if component is mounted (client-side)
  const [isMounted, setIsMounted] = useState(false);
  
  // Set mounted state after component mounts on client
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only proceed with hooks when mounted on client
  if (!isMounted) {
    return null;
  }
  
  // Safe access to account information with default value
  const { isConnected = false } = useAccount() || {};
  
  // Use the wallet with safe fallbacks
  const wallet = useWallet();
  const connectWallet = wallet?.connectWallet;
  
  // Safely access Web3Modal
  const web3Modal = useClientWeb3Modal();
  const open = web3Modal?.open;
  
  // Safely access network context
  const network = useNetwork();
  const currentNetwork = network?.currentNetwork || null;
  
  // Combine close functions
  const handleClose = React.useCallback(() => {
    if (onClose) onClose();
    if (onRequestClose) onRequestClose();
  }, [onClose, onRequestClose]);

  // If modal should be open and user is not connected, open the Web3Modal
  React.useEffect(() => {
    if (isOpen && !isConnected && open) {
      try {
        open();
        // Close this compatibility modal since Web3Modal will handle the UI
        handleClose();
      } catch (error) {
        console.error("Error opening Web3Modal:", error);
      }
    }
  }, [isOpen, isConnected, open, handleClose]);

  // This component doesn't render anything visible
  // Web3Modal is injected at the root level by createWeb3Modal
  return null;
};

export default WalletSelectorModal; 