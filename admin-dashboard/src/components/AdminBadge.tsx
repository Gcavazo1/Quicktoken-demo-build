import React from 'react';
import { useWhitelist } from '../contexts/WhitelistContext';

interface AdminBadgeProps {
  className?: string;
  label?: string;
}

/**
 * Component that displays an admin badge for whitelisted users
 * Shows different badges for owner vs regular admins or uses a provided label
 */
const AdminBadge: React.FC<AdminBadgeProps> = ({ className = '', label }) => {
  const { isWhitelisted, isOwner } = useWhitelist();

  // If label is provided, use it directly
  if (label) {
    // Return badge with appropriate styling based on role
    switch (label.toLowerCase()) {
      case 'owner':
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ${className}`}>
            Owner
          </span>
        );
      case 'admin':
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 ${className}`}>
            Admin
          </span>
        );
      case 'deployer':
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 ${className}`}>
            Deployer
          </span>
        );
      case 'viewer':
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 ${className}`}>
            Viewer
          </span>
        );
      default:
        return (
          <span className={`px-2 py-1 text-xs font-bold rounded bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 ${className}`}>
            {label}
          </span>
        );
    }
  }

  // If no label provided, check if user is whitelisted
  if (!isWhitelisted) return null;

  // Use context information to determine badge
  return (
    <div className={`inline-flex items-center ${className}`}>
      {isOwner ? (
        <span className="px-2 py-1 text-xs font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
          Owner
        </span>
      ) : (
        <span className="px-2 py-1 text-xs font-bold rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Admin
        </span>
      )}
    </div>
  );
};

export default AdminBadge; 