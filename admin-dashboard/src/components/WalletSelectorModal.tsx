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
  const { isConnected } = useAccount();
  const { connectWallet, disconnectWallet } = useWallet();
  const { open } = useClientWeb3Modal();
  const { currentNetwork } = useNetwork();
  
  // Combine close functions
  const handleClose = React.useCallback(() => {
    onClose();
    onRequestClose();
  }, [onClose, onRequestClose]);

  // If modal should be open and user is not connected, open the Web3Modal
  React.useEffect(() => {
    if (isOpen && !isConnected) {
      open();
      // Close this compatibility modal since Web3Modal will handle the UI
      handleClose();
    }
  }, [isOpen, isConnected, open, handleClose]);

  // This component doesn't render anything visible
  // Web3Modal is injected at the root level by createWeb3Modal
  return null;
};

export default WalletSelectorModal; 