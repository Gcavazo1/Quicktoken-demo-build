import React from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount } from 'wagmi';

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
  const { open } = useWeb3Modal();
  const { isConnected } = useAccount();
  
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