import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useNotification } from './NotificationContext';

/**
 * Types for whitelist entries and configuration
 */
export interface WhitelistEntry {
  address: string;
  label: string;
  addedAt: number;
  permissions: string[]; // Can include 'owner', 'admin', etc.
}

export interface WhitelistConfig {
  entries: WhitelistEntry[];
  ownerAddress: string; // For backward compatibility, we keep the primary owner
  lastModified: number;
}

export interface WhitelistContextType {
  whitelist: WhitelistEntry[];
  isWhitelisted: boolean;
  isOwner: boolean;
  allOwners: string[]; // New property to get all owner addresses
  addToWhitelist: (address: string, label: string, permissions: string[]) => void;
  removeFromWhitelist: (address: string) => boolean;
  addOwner: (address: string, label: string) => void; // New method to add owner
  removeOwner: (address: string) => boolean; // New method to remove owner
  saveWhitelist: (config: WhitelistConfig) => void;
  loadWhitelist: () => WhitelistConfig | null;
  isInSetupMode: boolean; // New property to track setup mode
  setIsInSetupMode: (isInSetup: boolean) => void; // New method to set setup mode
}

const WhitelistContext = createContext<WhitelistContextType | undefined>(undefined);

// Local storage key for whitelist
const WHITELIST_STORAGE_KEY = 'quicktoken_whitelist_config';

/**
 * Hook for accessing the whitelist context
 */
export const useWhitelist = (): WhitelistContextType => {
  const context = useContext(WhitelistContext);
  if (context === undefined) {
    throw new Error('useWhitelist must be used within a WhitelistProvider');
  }
  return context;
};

interface WhitelistProviderProps {
  children: ReactNode;
}

/**
 * Provider for whitelist management
 * 
 * Handles whitelist state, permissions, and persistence
 */
export const WhitelistProvider: React.FC<WhitelistProviderProps> = ({ children }) => {
  const { address } = useWallet();
  const { showNotification } = useNotification();
  
  const [whitelist, setWhitelist] = useState<WhitelistEntry[]>([]);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [isInSetupMode, setIsInSetupMode] = useState(false);
  
  // Load whitelist from local storage
  const loadWhitelist = (): WhitelistConfig | null => {
    try {
      const storedConfig = localStorage.getItem(WHITELIST_STORAGE_KEY);
      if (storedConfig && storedConfig !== "undefined" && storedConfig !== "null") {
        return JSON.parse(storedConfig);
      }
    } catch (error) {
      console.error('Failed to load whitelist config:', error);
    }
    return null;
  };
  
  // Save whitelist to local storage
  const saveWhitelist = (config: WhitelistConfig) => {
    try {
      // Ensure we have valid data
      if (!config || !config.entries) {
        console.error('Invalid whitelist config:', config);
        showNotification('Failed to save whitelist configuration: invalid data', 'error');
        return;
      }

      // Ensure entries is an array
      if (!Array.isArray(config.entries)) {
        config.entries = [];
      }

      // Make sure ownerAddress exists
      if (!config.ownerAddress) {
        const firstOwner = config.entries.find(entry => entry.permissions.includes('owner'));
        config.ownerAddress = firstOwner ? firstOwner.address : '';
      }

      localStorage.setItem(WHITELIST_STORAGE_KEY, JSON.stringify(config));
      
      // Update state
      setWhitelist(config.entries);
      
      showNotification('Whitelist configuration saved successfully', 'success');
    } catch (error) {
      console.error('Failed to save whitelist config:', error);
      showNotification('Failed to save whitelist configuration', 'error');
    }
  };
  
  // Get all owner addresses from the whitelist
  const getAllOwners = (): string[] => {
    return whitelist
      .filter(entry => entry.permissions.includes('owner'))
      .map(entry => entry.address.toLowerCase());
  };
  
  // Add an address to the whitelist
  const addToWhitelist = (address: string, label: string, permissions: string[]) => {
    const normalizedAddress = address.toLowerCase();
    
    // Check if the current wallet is an owner - only if not in setup mode
    if (!isInSetupMode && address !== getCurrentWalletAddress() && !isOwner) {
      showNotification('Only owners can add to the whitelist', 'error');
      return;
    }
    
    // Check if address is already in the whitelist
    if (whitelist.some(entry => entry.address.toLowerCase() === normalizedAddress)) {
      showNotification('Address is already in the whitelist', 'error');
      return;
    }
    
    const newEntry: WhitelistEntry = {
      address: normalizedAddress,
      label,
      addedAt: Date.now(),
      permissions
    };
    
    const updatedWhitelist = [...whitelist, newEntry];
    
    // Update local storage
    const config = loadWhitelist();
    if (config) {
      saveWhitelist({
        ...config,
        entries: updatedWhitelist,
        lastModified: Date.now()
      });
    } else {
      saveWhitelist({
        entries: updatedWhitelist,
        ownerAddress: getAllOwners()[0] || normalizedAddress, // First owner, or this address if it's an owner
        lastModified: Date.now()
      });
    }
    
    showNotification(`Added ${label} to whitelist`, 'success');
  };
  
  // Remove an address from the whitelist
  const removeFromWhitelist = (addressToRemove: string): boolean => {
    const normalizedAddress = addressToRemove.toLowerCase();
    
    // Check if trying to remove an owner
    const isRemovingOwner = whitelist.some(
      entry => entry.address.toLowerCase() === normalizedAddress && entry.permissions.includes('owner')
    );
    
    // If removing an owner, make sure it's not the last one
    if (isRemovingOwner) {
      const ownerCount = whitelist.filter(entry => entry.permissions.includes('owner')).length;
      
      if (ownerCount <= 1 && !isInSetupMode) {
        showNotification('Cannot remove the last owner from the whitelist', 'error');
        return false;
      }
    }
    
    // In normal mode (not setup), only owners can remove addresses
    if (!isInSetupMode && !isOwner) {
      showNotification('Only owners can remove addresses from the whitelist', 'error');
      return false;
    }
    
    // Cannot remove current wallet if it's an owner (when not in setup mode)
    if (!isInSetupMode && normalizedAddress === getCurrentWalletAddress() && isOwner) {
      showNotification('Cannot remove your own address while connected', 'error');
      return false;
    }
    
    const updatedWhitelist = whitelist.filter(
      entry => entry.address.toLowerCase() !== normalizedAddress
    );
    
    if (updatedWhitelist.length === whitelist.length) {
      showNotification('Address not found in whitelist', 'error');
      return false;
    }
    
    // Update local storage
    const config = loadWhitelist();
    if (config) {
      // If removing the primary owner, update ownerAddress
      let primaryOwner = config.ownerAddress;
      if (normalizedAddress === primaryOwner.toLowerCase()) {
        // Find the next owner to be primary
        const nextOwner = updatedWhitelist.find(entry => entry.permissions.includes('owner'));
        if (nextOwner) {
          primaryOwner = nextOwner.address;
        }
      }
      
      saveWhitelist({
        ...config,
        entries: updatedWhitelist,
        ownerAddress: primaryOwner,
        lastModified: Date.now()
      });
    }
    
    showNotification('Address removed from whitelist', 'success');
    return true;
  };
  
  // Convenience method to add an owner
  const addOwner = (address: string, label: string) => {
    addToWhitelist(address, label, ['owner', 'admin']);
  };
  
  // Convenience method to remove an owner
  const removeOwner = (address: string): boolean => {
    return removeFromWhitelist(address);
  };
  
  // Helper to get current wallet address safely
  const getCurrentWalletAddress = (): string => {
    return address ? address.toLowerCase() : '';
  };
  
  // Check whitelist status when wallet changes
  useEffect(() => {
    if (!address) {
      setIsWhitelisted(false);
      setIsOwner(false);
      return;
    }
    
    try {
      // Log current wallet address for debugging
      console.log('Checking whitelist status for address:', address);
      
      const config = loadWhitelist();
      if (config && config.entries && Array.isArray(config.entries)) {
        setWhitelist(config.entries);
        
        const normalizedAddress = address.toLowerCase();
        
        // Log all owners for debugging
        const owners = config.entries
          .filter(e => e.permissions?.includes('owner'))
          .map(e => e.address?.toLowerCase())
          .filter(Boolean);
        console.log('Current owners:', owners);
        
        // Check if address is in whitelist
        const entry = config.entries.find(e => e.address && e.address.toLowerCase() === normalizedAddress);
        const isInWhitelist = !!entry;
        setIsWhitelisted(isInWhitelist);
        
        // Check if address is an owner
        const isAddressOwner = entry?.permissions?.includes('owner') || false;
        setIsOwner(isAddressOwner);
        
        console.log(`Address ${normalizedAddress} - In whitelist: ${isInWhitelist}, Is owner: ${isAddressOwner}`);
      } else {
        console.log('No valid whitelist config found');
        setWhitelist([]);
        setIsWhitelisted(false);
        setIsOwner(false);
      }
    } catch (error) {
      console.error('Error checking whitelist status:', error);
      setWhitelist([]);
      setIsWhitelisted(false);
      setIsOwner(false);
    }
  }, [address]);
  
  // Load whitelist on component mount
  useEffect(() => {
    try {
      const config = loadWhitelist();
      if (config && config.entries) {
        setWhitelist(Array.isArray(config.entries) ? config.entries : []);
      } else {
        // Initialize with empty whitelist if none exists or if data is invalid
        setWhitelist([]);
      }
    } catch (error) {
      console.error('Error loading whitelist on mount:', error);
      setWhitelist([]);
    }
  }, []);
  
  // Context value
  const value: WhitelistContextType = {
    whitelist,
    isWhitelisted,
    isOwner,
    allOwners: getAllOwners(),
    addToWhitelist,
    removeFromWhitelist,
    addOwner,
    removeOwner,
    saveWhitelist,
    loadWhitelist,
    isInSetupMode,
    setIsInSetupMode
  };
  
  return (
    <WhitelistContext.Provider value={value}>
      {children}
    </WhitelistContext.Provider>
  );
};

export default WhitelistContext; 