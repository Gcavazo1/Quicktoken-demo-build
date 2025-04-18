import { useState, useEffect } from 'react';
import { useWeb3Modal as useWeb3ModalOriginal } from '@web3modal/wagmi/react';

/**
 * A client-side wrapper for useWeb3Modal that avoids SSR issues
 * Returns placeholder values during server-side rendering and the actual hook on the client
 */
export function useClientWeb3Modal() {
  // Track if we're on the client side
  const [isMounted, setIsMounted] = useState(false);
  
  // Safe placeholder values for SSR
  const defaultValues = {
    open: async () => false,
    close: () => {},
    isOpen: false,
  };
  
  // Set isMounted to true when component mounts on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Only use the actual hook on the client side
  if (!isMounted || typeof window === 'undefined') {
    return defaultValues;
  }
  
  // On client side, return the real hook
  try {
    const web3Modal = useWeb3ModalOriginal();
    return web3Modal;
  } catch (e) {
    console.error('Failed to initialize Web3Modal:', e);
    return defaultValues;
  }
} 