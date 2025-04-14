import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { WhitelistConfig, WhitelistEntry } from '../../contexts/WhitelistContext';

interface WhitelistSetupStepProps {
  onComplete: (finalConfig: WhitelistConfig) => void;
  initialConfig?: WhitelistConfig | null;
  onBack: () => void;
}

type InternalEntry = {
  address: string;
  label: string;
  permissions: string[];
};

/**
 * Setup wizard step for whitelist configuration
 * 
 * Allows the dashboard owner to configure which wallet addresses
 * have administrative access to sensitive dashboard functions.
 */
const WhitelistSetupStep: React.FC<WhitelistSetupStepProps> = ({ 
  onComplete, 
  initialConfig, 
  onBack 
}) => {
  const [entries, setEntries] = useState<InternalEntry[]>([]);
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedRole, setSelectedRole] = useState('admin');
  
  useEffect(() => {
    console.log("WhitelistSetupStep received initialConfig:", initialConfig);
    if (initialConfig && initialConfig.entries && Array.isArray(initialConfig.entries)) {
      const formattedEntries = initialConfig.entries.map(entry => ({
        address: entry.address.toLowerCase(),
        label: entry.label,
        permissions: entry.permissions
      }));
      setEntries(formattedEntries);
      console.log("Initialized entries from initialConfig:", formattedEntries);
    } else {
      console.log("No valid initialConfig provided, starting fresh.");
      setEntries([]);
    }
  }, [initialConfig]);
  
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newAddress) {
      setError('Address is required');
      return;
    }
    
    if (!ethers.isAddress(newAddress)) {
      setError('Invalid Ethereum address');
      return;
    }
    
    const normalizedAddress = newAddress.toLowerCase();
    
    if (entries.some(entry => entry.address.toLowerCase() === normalizedAddress)) {
      setError('Address is already in the list');
      return;
    }
    
    const permissions = selectedRole === 'owner' ? ['owner', 'admin'] : ['admin'];
    const label = newLabel.trim() || (selectedRole === 'owner' ? 'Owner' : 'Admin');
    
    setEntries([...entries, { 
      address: normalizedAddress, 
      label, 
      permissions 
    }]);
    
    setNewAddress('');
    setNewLabel('');
    setSelectedRole('admin');
    setSuccess(`Added ${label} (${normalizedAddress.substring(0,6)}...) successfully`);
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const handleRemoveEntry = (addressToRemove: string) => {
    setError('');
    setSuccess('');
    const normalizedAddressToRemove = addressToRemove.toLowerCase();
    const entryToRemove = entries.find(entry => entry.address === normalizedAddressToRemove);
    
    if (!entryToRemove) return;
    
    const isRemovingOwner = entryToRemove.permissions.includes('owner');
    const ownersCount = entries.filter(entry => entry.permissions.includes('owner')).length;
    
    if (isRemovingOwner && ownersCount <= 1) {
      setError('Cannot remove the last owner address');
      return;
    }
    
    setEntries(entries.filter(entry => entry.address !== normalizedAddressToRemove));
    setSuccess('Address removed successfully');
    setTimeout(() => setSuccess(''), 3000);
  };
  
  const handleCompleteSetup = () => {
    setError('');
    
    if (entries.length === 0) {
      setError('You must add at least one owner address');
      return;
    }
    
    const hasOwner = entries.some(entry => entry.permissions.includes('owner'));
    if (!hasOwner) {
      setError('You must have at least one owner address');
      return;
    }
    
    const primaryOwner = entries.find(entry => entry.permissions.includes('owner'));
    const finalConfig: WhitelistConfig = {
      entries: entries.map(entry => ({
        ...entry,
        addedAt: Date.now(),
      })),
      ownerAddress: primaryOwner ? primaryOwner.address : '',
      lastModified: Date.now()
    };
    
    console.log("Completing Whitelist Step with config:", finalConfig);
    onComplete(finalConfig);
  };
  
  const ownerEntries = entries.filter(entry => entry.permissions.includes('owner'));
  const adminEntries = entries.filter(entry => !entry.permissions.includes('owner'));
  
  return (
    <div className="setup-content">
      <h2 className="text-2xl font-bold mb-4">
        Whitelist Configuration
      </h2>
      
      <p className="text-gray-600 dark:text-gray-300 mb-6">
        Configure which wallet addresses have access to manage your token platform. 
        Owners have full control, while admins have limited permissions.
      </p>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-blue-500">Owners</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Owners have full access to all platform features and can add/remove other addresses.
        </p>
        
        <div className="space-y-3">
          {ownerEntries.length > 0 ? (
            ownerEntries.map((entry) => (
              <div key={entry.address} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900 dark:bg-opacity-20 border border-blue-100 dark:border-blue-800 rounded-md">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{entry.label}</span>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100 rounded-full">
                      Owner
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {entry.address}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveEntry(entry.address)}
                  className="text-red-500 hover:text-red-700 p-1"
                  disabled={ownerEntries.length <= 1}
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm italic text-gray-500 dark:text-gray-400 py-2">
              No owner addresses added yet. Add at least one owner.
            </p>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center mb-4">
          <h3 className="text-lg font-semibold text-purple-500">Admins</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Admins can manage tokens but cannot modify whitelist settings.
        </p>
        
        <div className="space-y-3">
          {adminEntries.length > 0 ? (
            adminEntries.map((entry) => (
              <div key={entry.address} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
                <div>
                  <div className="flex items-center">
                    <span className="font-medium">{entry.label}</span>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-full">
                      Admin
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                    {entry.address}
                  </div>
                </div>
                <button 
                  onClick={() => handleRemoveEntry(entry.address)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  Remove
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm italic text-gray-500 dark:text-gray-400 py-2">
              No admin addresses added yet.
            </p>
          )}
        </div>
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Add New Address</h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Select Role
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={selectedRole === 'owner'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedRole(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Owner</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={selectedRole === 'admin'}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSelectedRole(e.target.value)}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Admin</span>
              </label>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="wallet-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Wallet Address
            </label>
            <input
              id="wallet-address"
              type="text"
              value={newAddress}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAddress(e.target.value)}
              placeholder={selectedRole === 'owner' ? "Enter owner's wallet address" : "Enter admin's wallet address"}
              className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white`}
            />
            {error && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="label" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Label (Optional)
            </label>
            <input
              id="label"
              type="text"
              value={newLabel}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLabel(e.target.value)}
              placeholder={selectedRole === 'owner' ? "Owner's Name or Device" : "Admin's Name or Device"}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          
          <div className="flex justify-end">
            <button 
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Add {selectedRole === 'owner' ? 'Owner' : 'Admin'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="flex justify-between mt-8">
        <button onClick={onBack} className="btn btn-secondary">
          Back
        </button>
        <button 
          onClick={handleCompleteSetup}
          disabled={entries.length === 0}
          className="btn btn-primary"
        >
          Complete Whitelist Setup
        </button>
      </div>
      
      {success && (
        <div className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-md">
          <div className="flex items-center">
            <span>{success}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhitelistSetupStep; 