import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import NotificationModal, { NotificationType, NotificationItem } from '../components/NotificationModal';
import NotificationTrigger from '../components/NotificationTrigger';

// Maximum number of notifications to store
const MAX_NOTIFICATIONS = 50;

interface NotificationContextType {
  notifications: NotificationItem[];
  showNotification: (message: string, type: NotificationType, duration?: number) => string;
  hideNotification: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ 
  children,
  maxNotifications = MAX_NOTIFICATIONS
}) => {
  // All stored notifications
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  
  // Visibility state for modal
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  
  // Count of unread notifications
  const [unreadCount, setUnreadCount] = useState<number>(0);
  
  // Audio notification sounds for different types (optional)
  const [notificationSounds] = useState<Record<NotificationType, HTMLAudioElement | null>>(() => {
    try {
      return typeof window !== 'undefined' 
        ? {
            success: new Audio('/sounds/success.mp3'),
            warning: new Audio('/sounds/warning.mp3'),
            error: new Audio('/sounds/error.mp3'),
            info: new Audio('/sounds/success.mp3') // Info can use success sound
          }
        : { success: null, warning: null, error: null, info: null };
    } catch (error) {
      console.warn('Browser does not support Audio API');
      return { success: null, warning: null, error: null, info: null };
    }
  });

  // Update unread count when notifications change
  useEffect(() => {
    const count = notifications.filter(n => !n.read).length;
    setUnreadCount(count);
    
    // Update document title with notification count if there are unread notifications
    if (count > 0) {
      document.title = `(${count}) ${document.title.replace(/^\(\d+\)\s/, '')}`;
    } else {
      document.title = document.title.replace(/^\(\d+\)\s/, '');
    }
  }, [notifications]);

  // Add a new notification
  const showNotification = (message: string, type: NotificationType, duration = 0): string => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const newNotification: NotificationItem = {
      id,
      type,
      message,
      timestamp: Date.now(),
      duration,
      read: false
    };
    
    // Play sound for important notifications
    if (notificationSounds[type]) {
      notificationSounds[type]?.play().catch(() => {
        // Ignore errors from sound play (common in browsers that block autoplay)
      });
    }
    
    // Add to state, limiting to max notifications
    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      if (updated.length > maxNotifications) {
        return updated.slice(0, maxNotifications);
      }
      return updated;
    });
    
    // If it has a duration, set a timer to hide it
    if (duration > 0) {
      setTimeout(() => {
        hideNotification(id);
      }, duration);
    }
    
    return id;
  };

  // Remove a notification by ID
  const hideNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
    setIsModalOpen(false);
  };
  
  // Mark all as read when modal is opened
  const handleModalOpen = () => {
    setIsModalOpen(true);
    setNotifications(prev => 
      prev.map(notification => ({ 
        ...notification, 
        read: true 
      }))
    );
  };
  
  // Toggle modal visibility
  const toggleModal = () => {
    if (!isModalOpen) {
      handleModalOpen();
    } else {
      setIsModalOpen(false);
    }
  };

  return (
    <NotificationContext.Provider 
      value={{
        notifications,
        showNotification,
        hideNotification,
        clearAllNotifications,
        unreadCount
      }}
    >
      {children}
      
      {/* Notification Trigger Button */}
      <NotificationTrigger 
        onToggle={toggleModal} 
        count={unreadCount} 
      />
      
      {/* Notification Modal */}
      <NotificationModal
        notifications={notifications}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDismissAll={clearAllNotifications}
        onDismissOne={hideNotification}
      />
    </NotificationContext.Provider>
  );
};

export default NotificationContext; 