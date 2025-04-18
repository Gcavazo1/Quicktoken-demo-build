import { useState, useEffect } from 'react';
import { useWeb3Modal as useWeb3ModalOriginal } from '@web3modal/wagmi/react';

/**
 * A client-side wrapper for useWeb3Modal that avoids SSR issues
 * Returns placeholder values during server-side rendering and the actual hook on the client
 */
export function useClientWeb3Modal() {
  // Safe placeholder values for SSR and initialization
  const defaultValues = {
    open: async () => false,
    close: () => {},
    isOpen: false,
  };
  
  // Track if we're on the client side
  const [isMounted, setIsMounted] = useState(false);
  
  // Set isMounted to true when component mounts on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Early return for SSR
  if (typeof window === 'undefined') {
    return defaultValues;
  }
  
  // Also return defaults if not yet mounted (to handle hydration)
  if (!isMounted) {
    return defaultValues;
  }
  
  // On client side, return the real hook with error handling
  try {
    const web3Modal = useWeb3ModalOriginal();
    return web3Modal;
  } catch (e) {
    console.error('Failed to initialize Web3Modal:', e);
    return defaultValues;
  }
} 