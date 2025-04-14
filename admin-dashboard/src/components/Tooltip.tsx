import React, { useState, ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  width?: string;
  delay?: number;
}

const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  width = '240px',
  delay = 300
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const newTimer = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimer(newTimer);
  };

  const handleMouseLeave = () => {
    if (timer) {
      clearTimeout(timer);
      setTimer(null);
    }
    setIsVisible(false);
  };

  // Position styles
  const getTooltipStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 1000,
      backgroundColor: '#262626',
      color: '#e0e0e0',
      padding: '10px 14px',
      borderRadius: '6px',
      fontSize: '0.875rem',
      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
      maxWidth: width,
      width: 'max-content',
      border: '1px solid #3d3d3d',
      opacity: isVisible ? 1 : 0,
      visibility: isVisible ? 'visible' : 'hidden',
      transition: 'opacity 0.2s, visibility 0.2s',
      lineHeight: '1.4',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: 'calc(100% + 8px)',
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          ...baseStyle,
          right: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          ...baseStyle,
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
        };
      default:
        return baseStyle;
    }
  };

  // Arrow styles based on position
  const getArrowStyle = () => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      width: '0',
      height: '0',
      borderStyle: 'solid',
    };

    switch (position) {
      case 'top':
        return {
          ...baseStyle,
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '6px 6px 0 6px',
          borderColor: '#3d3d3d transparent transparent transparent',
        };
      case 'bottom':
        return {
          ...baseStyle,
          top: '-6px',
          left: '50%',
          transform: 'translateX(-50%)',
          borderWidth: '0 6px 6px 6px',
          borderColor: 'transparent transparent #3d3d3d transparent',
        };
      case 'left':
        return {
          ...baseStyle,
          right: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '6px 0 6px 6px',
          borderColor: 'transparent transparent transparent #3d3d3d',
        };
      case 'right':
        return {
          ...baseStyle,
          left: '-6px',
          top: '50%',
          transform: 'translateY(-50%)',
          borderWidth: '6px 6px 6px 0',
          borderColor: 'transparent #3d3d3d transparent transparent',
        };
      default:
        return baseStyle;
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {isVisible && (
        <div style={getTooltipStyle()}>
          {content}
          <div style={getArrowStyle()}></div>
        </div>
      )}
      {children}
    </div>
  );
};

export default Tooltip; 