import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon' | 'minimal';
  className?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'button',
  className = ''
}) => {
  const { theme, actualTheme, toggleTheme, isDark } = useTheme();

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'w-8 h-8 text-sm';
      case 'md':
        return 'w-10 h-10 text-base';
      case 'lg':
        return 'w-12 h-12 text-lg';
      default:
        return 'w-10 h-10 text-base';
    }
  };

  const getIcon = () => {
    if (theme === 'auto') {
      return '🌓'; // Auto theme icon
    }
    return isDark ? '🌙' : '☀️'; // Moon for dark, sun for light
  };

  const getLabel = () => {
    if (theme === 'auto') {
      return `Tema automático (${actualTheme === 'dark' ? 'oscuro' : 'claro'})`;
    }
    return `Cambiar a tema ${isDark ? 'claro' : 'oscuro'}`;
  };

  if (variant === 'minimal') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${getSizeClasses()}
          flex items-center justify-center rounded-full
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${className}
        `}
        aria-label={getLabel()}
        title={getLabel()}
        suppressHydrationWarning={true}
      >
        <span className="text-lg" role="img" aria-hidden="true">
          {getIcon()}
        </span>
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${getSizeClasses()}
          flex items-center justify-center rounded-lg
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          border border-gray-300 dark:border-gray-600
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${className}
        `}
        aria-label={getLabel()}
        title={getLabel()}
        suppressHydrationWarning={true}
      >
        <span className="text-xl" role="img" aria-hidden="true">
          {getIcon()}
        </span>
      </button>
    );
  }

  // Default button variant
  return (
    <button
      onClick={toggleTheme}
      className={`
        ${getSizeClasses()}
        flex items-center justify-center gap-2 px-3 py-2 rounded-lg
        bg-gray-100 dark:bg-gray-800
        hover:bg-gray-200 dark:hover:bg-gray-700
        border border-gray-300 dark:border-gray-600
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        text-gray-700 dark:text-gray-300
        ${className}
      `}
      aria-label={getLabel()}
      title={getLabel()}
      suppressHydrationWarning={true}
    >
      <span className="text-lg" role="img" aria-hidden="true">
        {getIcon()}
      </span>
      <span className="text-sm font-medium">
        {theme === 'auto' ? 'Auto' : (isDark ? 'Oscuro' : 'Claro')}
      </span>
    </button>
  );
};

export default ThemeToggle;