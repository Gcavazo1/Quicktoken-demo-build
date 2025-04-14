import React, { useState } from 'react';
import { useWhitelist } from '../contexts/WhitelistContext';
import { useNotification } from '../contexts/NotificationContext';
import { ethers } from 'ethers';
import AdminBadge from './AdminBadge';
import HelpIcon from './HelpIcon';

// Define available roles
export type WhitelistRole = 'admin' | 'deployer' | 'viewer';

interface WhitelistManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WhitelistManagementModal: React.FC<WhitelistManagementModalProps> = ({
  isOpen,
  onClose
}) => {
  const { whitelist, addToWhitelist, removeFromWhitelist, isOwner } = useWhitelist();
  const { showNotification } = useNotification();
  const [newAddress, setNewAddress] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newRole, setNewRole] = useState<WhitelistRole>('admin');

  // Form validation
  const isAddressValid = React.useMemo(() => {
    return newAddress ? ethers.isAddress(newAddress) : true;
  }, [newAddress]);

  // Handle adding new addresses
  const handleAddAddress = () => {
    if (!ethers.isAddress(newAddress)) {
      showNotification('Invalid Ethereum address format', 'error');
      return;
    }

    try {
      // Create permissions array based on selected role
      const permissions = [newRole];
      
      // Add address to whitelist with proper label and permissions
      addToWhitelist(
        newAddress, 
        newLabel || `${newRole.charAt(0).toUpperCase() + newRole.slice(1)}`,
        permissions
      );
      
      showNotification(`Address ${newAddress} added to whitelist as ${newRole}`, 'success');
      
      // Reset form
      setNewAddress('');
      setNewLabel('');
      setNewRole('admin');
    } catch (error) {
      showNotification('Failed to add address to whitelist', 'error');
    }
  };

  // Handle removing addresses
  const handleRemoveAddress = (address: string) => {
    try {
      removeFromWhitelist(address);
      showNotification(`Address ${address} removed from whitelist`, 'success');
    } catch (error) {
      showNotification('Failed to remove address from whitelist', 'error');
    }
  };

  // Helper function to get badge label based on permissions
  const getBadgeForEntry = (entry: any) => {
    if (entry.permissions?.includes('owner')) return 'Owner';
    if (entry.permissions?.includes('admin')) return 'Admin';
    if (entry.permissions?.includes('deployer')) return 'Deployer';
    return 'Viewer';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 className="text-2xl font-bold mb-4 dark:text-white">
          Manage Whitelist
          <HelpIcon 
            content={
              <div>
                <p>The whitelist controls access to administrative functions in your dashboard.</p>
                <p className="mt-2">Only whitelisted users can:</p>
                <ul className="list-disc pl-5 mt-1">
                  <li>Reset the configuration wizard</li>
                  <li>Export dashboard configuration</li>
                  <li>Modify platform fee settings</li>
                  <li>Manage the whitelist itself</li>
                </ul>
              </div>
            } 
            width="320px"
          />
        </h2>

        {!isOwner ? (
          <p className="text-red-500 mb-4">Only the contract owner can manage the whitelist.</p>
        ) : (
          <>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 dark:text-white">
                Add New User
                <HelpIcon 
                  content={
                    <div>
                      <p>Add wallet addresses that should have administrative access.</p>
                      <p className="mt-2">Role Permissions:</p>
                      <ul className="list-disc pl-5 mt-1">
                        <li><strong>Admin:</strong> Complete access to all dashboard features</li>
                        <li><strong>Deployer:</strong> Can only deploy new tokens</li>
                        <li><strong>Viewer:</strong> Read-only access to the dashboard</li>
                      </ul>
                    </div>
                  }
                  width="300px"
                />
              </h3>
              <div className="flex flex-col space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Ethereum Address
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="0x..."
                    className={`mt-1 block w-full px-3 py-2 border ${!isAddressValid ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white`}
                  />
                  {!isAddressValid && (
                    <p className="mt-1 text-sm text-red-500">Invalid Ethereum address format</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Label (Optional)
                  </label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="E.g., Finance Team, Development Team"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                    <HelpIcon 
                      content={
                        <div>
                          <p><strong>Admin:</strong> Full access to all dashboard functions</p>
                          <p className="mt-2"><strong>Deployer:</strong> Can only create and deploy new tokens</p>
                          <p className="mt-2"><strong>Viewer:</strong> Read-only access to explore the dashboard</p>
                          <p className="mt-2 text-xs italic">The Owner role is reserved for the first address that configured the dashboard.</p>
                        </div>
                      }
                      width="300px"
                    />
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as WhitelistRole)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="admin">Admin (Full Access)</option>
                    <option value="deployer">Deployer (Token Creation Only)</option>
                    <option value="viewer">Viewer (Read-Only)</option>
                  </select>
                </div>
                <button
                  onClick={handleAddAddress}
                  disabled={!isAddressValid || !newAddress}
                  className={`px-4 py-2 rounded-md text-white ${(!isAddressValid || !newAddress) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                  Add to Whitelist
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-2 dark:text-white">
                Current Whitelist
                <HelpIcon 
                  content={
                    <div>
                      <p>This is the list of all addresses with administrative access to your dashboard.</p>
                      <p className="mt-2">The Owner address (first in the list) cannot be removed.</p>
                      <p className="mt-2">Changes to the whitelist take effect immediately.</p>
                    </div>
                  }
                  width="300px"
                />
              </h3>
              {whitelist.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">No addresses have been whitelisted yet.</p>
              ) : (
                <ul className="space-y-2 max-h-60 overflow-y-auto">
                  {whitelist.map((item) => (
                    <li key={item.address} className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium dark:text-white">{item.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{item.address}</p>
                        </div>
                        <div className="ml-2">
                          <AdminBadge label={getBadgeForEntry(item)} />
                        </div>
                      </div>
                      {isOwner && item.address !== whitelist[0]?.address && (
                        <button
                          onClick={() => handleRemoveAddress(item.address)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-white dark:hover:bg-gray-500"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhitelistManagementModal;
