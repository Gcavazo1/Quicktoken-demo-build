import React, { useState, useEffect } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  message: string;
  timestamp: number;
  duration?: number;
  read?: boolean;
}

interface NotificationModalProps {
  notifications: NotificationItem[];
  isOpen: boolean;
  onClose: () => void;
  onDismissAll: () => void;
  onDismissOne: (id: string) => void;
}

/**
 * A modal component that displays all notifications in a stacked list
 * Similar styling to NetworkSelector modal for consistency
 */
const NotificationModal: React.FC<NotificationModalProps> = ({
  notifications,
  isOpen,
  onClose,
  onDismissAll,
  onDismissOne
}) => {
  // Lock scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Sort notifications by timestamp (newest first)
  const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);
  
  // Group by type for counting
  const notificationCounts = {
    success: notifications.filter(n => n.type === 'success').length,
    error: notifications.filter(n => n.type === 'error').length,
    warning: notifications.filter(n => n.type === 'warning').length,
    info: notifications.filter(n => n.type === 'info').length
  };

  // Get icon for notification type
  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path>
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"></path>
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"></path>
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"></path>
          </svg>
        );
      default:
        return null;
    }
  };

  // Get color for notification type
  const getColorClass = (type: NotificationType) => {
    switch (type) {
      case 'success': return 'bg-green-800/10 text-green-500 border-green-800/20';
      case 'error': return 'bg-red-800/10 text-red-500 border-red-800/20';
      case 'warning': return 'bg-yellow-800/10 text-yellow-500 border-yellow-800/20';
      case 'info': return 'bg-blue-800/10 text-blue-500 border-blue-800/20';
      default: return 'bg-gray-800/10 text-gray-500 border-gray-800/20';
    }
  };

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="bg-gray-900 border border-gray-800 rounded-lg w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
          <h3 className="text-lg font-medium text-white flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
              <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
            </svg>
            Notifications
            {notifications.length > 0 && (
              <span className="ml-2 bg-blue-500 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Status Summary */}
        {notifications.length > 0 && (
          <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-800 grid grid-cols-4 gap-1 text-xs">
            <div className="flex items-center justify-center py-1 rounded bg-green-900/20 text-green-500">
              <span className="font-bold mr-1">{notificationCounts.success}</span> Success
            </div>
            <div className="flex items-center justify-center py-1 rounded bg-red-900/20 text-red-500">
              <span className="font-bold mr-1">{notificationCounts.error}</span> Error
            </div>
            <div className="flex items-center justify-center py-1 rounded bg-yellow-900/20 text-yellow-500">
              <span className="font-bold mr-1">{notificationCounts.warning}</span> Warning
            </div>
            <div className="flex items-center justify-center py-1 rounded bg-blue-900/20 text-blue-500">
              <span className="font-bold mr-1">{notificationCounts.info}</span> Info
            </div>
          </div>
        )}

        {/* Notification List */}
        <div className="overflow-y-auto flex-grow">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <p>No notifications to display</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {sortedNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 ${getColorClass(notification.type)} hover:bg-gray-800/20 transition-colors duration-150`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-start">
                      <div className="mr-3 mt-0.5">
                        {getIcon(notification.type)}
                      </div>
                      <div>
                        <p className="text-sm text-white mb-0.5">{notification.message}</p>
                        <p className="text-xs text-gray-400">{formatTime(notification.timestamp)}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDismissOne(notification.id)}
                      className="text-gray-500 hover:text-white"
                      aria-label="Dismiss notification"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {notifications.length > 0 && (
          <div className="border-t border-gray-800 p-3 bg-gray-800 flex justify-between items-center">
            <div className="text-xs text-gray-400">
              Showing {notifications.length} notification{notifications.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={onDismissAll}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors duration-150"
            >
              Clear All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationModal; 