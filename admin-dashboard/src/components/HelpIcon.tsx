import React, { useState, useRef, useEffect } from 'react';

interface HelpIconProps {
  content: React.ReactNode;
  width?: string;
  position?: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Help icon with tooltip - Reverted to CSS positioning + visibility toggle
 */
const HelpIcon: React.FC<HelpIconProps> = ({ 
  content, 
  width = "300px",
  position = "top"
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        tooltipRef.current && 
        iconRef.current && 
        !tooltipRef.current.contains(event.target as Node) &&
        !iconRef.current.contains(event.target as Node)
      ) {
        setIsVisible(false);
      }
    };
    if (isVisible) {
      const timerId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 0); 
      return () => {
        clearTimeout(timerId);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    } 
  }, [isVisible]);

  const getTooltipPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      default:
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };
  
  return (
    <span className="inline-block relative ml-1 align-middle">
      <span
        ref={iconRef as any}
        className="text-gray-400 hover:text-gray-500 focus:outline-none cursor-pointer"
        onClick={() => setIsVisible(prev => !prev)}
        role="button"
        aria-haspopup="true"
        aria-expanded={isVisible}
        aria-label="Show help information"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setIsVisible(prev => !prev); }}
      >
        <span className="bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300 w-4 h-4 rounded-full inline-flex items-center justify-center text-xs font-bold">?</span>
      </span>
      
      {isVisible && (
        <div 
          ref={tooltipRef}
          className={`absolute z-50 ${getTooltipPositionClasses()} rounded-md shadow-xl border border-gray-600 p-3 text-sm font-sans`}
          style={{
              width: width,
              backgroundColor: '#111827',
              color: 'white',
              opacity: '1 !important',
          }} 
          role="tooltip"
        >
          {content}
        </div>
      )}
    </span>
  );
};

export default HelpIcon; 