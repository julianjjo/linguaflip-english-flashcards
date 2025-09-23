import React from 'react';
import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'icon' | 'minimal';
  className?: string;
}

const getSizeClasses = (size: 'sm' | 'md' | 'lg') => {
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

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  size = 'md',
  variant = 'button',
  className = '',
}) => {
  const { theme, actualTheme, toggleTheme, isDark, mounted } = useTheme();

  // Prevent rendering theme-dependent content until after hydration
  if (!mounted) {
    return (
      <div
        className={`${getSizeClasses(size)} animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700`}
      />
    );
  }

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
        className={` ${getSizeClasses(size)} flex items-center justify-center rounded-full bg-gray-100 transition-colors duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:bg-gray-800 dark:hover:bg-gray-700 ${className} `}
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
        className={` ${getSizeClasses(size)} flex items-center justify-center rounded-lg border border-gray-300 bg-gray-100 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:hover:bg-gray-700 ${className} `}
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
      className={` ${getSizeClasses(size)} flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-gray-700 transition-all duration-200 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${className} `}
      aria-label={getLabel()}
      title={getLabel()}
      suppressHydrationWarning={true}
    >
      <span className="text-lg" role="img" aria-hidden="true">
        {getIcon()}
      </span>
      <span className="text-sm font-medium">
        {theme === 'auto' ? 'Auto' : isDark ? 'Oscuro' : 'Claro'}
      </span>
    </button>
  );
};

export default ThemeToggle;
