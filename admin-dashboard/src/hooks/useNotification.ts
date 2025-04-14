import { useContext } from 'react';
import NotificationContext from '../contexts/NotificationContext';
import { NotificationType } from '../components/NotificationModal';

/**
 * Enhanced hook for managing notifications with more convenient helpers
 */
export const useNotification = () => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  const { showNotification, hideNotification, clearAllNotifications, notifications, unreadCount } = context;

  /**
   * Show a success notification
   * @param message The message to display
   * @param duration Duration in ms (default: 5000, 0 for no auto-dismiss)
   * @returns ID of the notification
   */
  const showSuccess = (message: string, duration = 5000) => {
    return showNotification(message, 'success', duration);
  };

  /**
   * Show an error notification
   * @param message The message to display
   * @param duration Duration in ms (default: 8000, 0 for no auto-dismiss)
   * @returns ID of the notification
   */
  const showError = (message: string, duration = 8000) => {
    return showNotification(message, 'error', duration);
  };

  /**
   * Show a warning notification
   * @param message The message to display
   * @param duration Duration in ms (default: 6000, 0 for no auto-dismiss)
   * @returns ID of the notification
   */
  const showWarning = (message: string, duration = 6000) => {
    return showNotification(message, 'warning', duration);
  };

  /**
   * Show an info notification
   * @param message The message to display
   * @param duration Duration in ms (default: 5000, 0 for no auto-dismiss)
   * @returns ID of the notification
   */
  const showInfo = (message: string, duration = 5000) => {
    return showNotification(message, 'info', duration);
  };

  /**
   * Show a notification for a transaction
   * Starts with "Processing..." and can be updated with success/error
   * @param initialMessage Initial message to show
   * @returns Object with methods to update the notification
   */
  const showTransaction = (initialMessage: string = 'Processing transaction...') => {
    const id = showNotification(initialMessage, 'info', 0); // No auto-hide

    return {
      /**
       * Update the notification to show success
       * @param message Success message
       * @param autoDismiss Whether to auto-dismiss the notification (default: true)
       */
      success: (message: string = 'Transaction successful!', autoDismiss = true) => {
        hideNotification(id);
        return showNotification(message, 'success', autoDismiss ? 5000 : 0);
      },
      
      /**
       * Update the notification to show an error
       * @param message Error message
       * @param autoDismiss Whether to auto-dismiss the notification (default: true)
       */
      error: (message: string = 'Transaction failed', autoDismiss = true) => {
        hideNotification(id);
        return showNotification(message, 'error', autoDismiss ? 8000 : 0);
      },
      
      /**
       * Update the notification message (keeps the same type)
       * @param message New message
       * @param type Optional new type
       * @param autoDismiss Whether to auto-dismiss the notification
       */
      update: (message: string, type: NotificationType = 'info', autoDismiss = false) => {
        hideNotification(id);
        return showNotification(message, type, autoDismiss ? 5000 : 0);
      },
      
      /**
       * Dismiss the notification
       */
      dismiss: () => {
        hideNotification(id);
      }
    };
  };

  return {
    // Basic notification API
    showNotification,
    hideNotification,
    clearAllNotifications,
    notifications,
    unreadCount,
    
    // Enhanced helpers
    showSuccess,
    showError, 
    showWarning,
    showInfo,
    showTransaction
  };
};

export default useNotification; 