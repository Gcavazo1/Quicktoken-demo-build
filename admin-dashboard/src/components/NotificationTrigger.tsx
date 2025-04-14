import React from 'react';
import { useNotification } from '../hooks/useNotification';

interface NotificationTriggerProps {
  onToggle: () => void;
  count: number;
}

/**
 * A floating button that shows the notification count and opens the notification modal
 */
const NotificationTrigger: React.FC<NotificationTriggerProps> = ({ onToggle, count }) => {
  const getStyle = () => {
    // Different visual cue based on notification count
    if (count === 0) {
      return 'bg-gray-800 hover:bg-gray-700 text-white';
    } else if (count > 5) {
      return 'bg-red-600 hover:bg-red-500 text-white animate-pulse';
    } else {
      return 'bg-blue-600 hover:bg-blue-500 text-white';
    }
  };

  return (
    <button
      className={`fixed z-40 bottom-4 right-4 rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-all duration-200 ${getStyle()}`}
      onClick={onToggle}
      aria-label={`Open notifications${count > 0 ? ` (${count} unread)` : ''}`}
    >
      <div className="relative">
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
        </svg>
        
        {count > 0 && (
          <span className="absolute -top-2 -right-2 bg-white text-blue-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </div>
    </button>
  );
};

export default NotificationTrigger; 