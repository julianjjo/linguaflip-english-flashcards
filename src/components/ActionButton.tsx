import React from 'react';

interface ActionButtonProps {
  onClick: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

/**
 * Reusable ActionButton component with consistent styling, loading states, and error handling
 *
 * Provides a standardized button component with built-in loading states, accessibility features,
 * and consistent styling across the application. Reduces code duplication for action buttons.
 *
 * @param props - Component props
 * @param props.onClick - Function to execute when button is clicked (supports async)
 * @param props.disabled - Whether the button is disabled (default: false)
 * @param props.loading - Whether to show loading spinner (default: false)
 * @param props.variant - Visual style variant ('primary', 'secondary', 'accent')
 * @param props.size - Size variant ('sm', 'md', 'lg')
 * @param props.children - Button content (text or elements)
 * @param props.className - Additional CSS classes
 * @param props.aria-label - Accessibility label for screen readers
 *
 * @example
 * ```tsx
 * <ActionButton
 *   onClick={handleSave}
 *   loading={isSaving}
 *   variant="primary"
 *   size="md"
 *   aria-label="Save changes"
 * >
 *   Save Changes
 * </ActionButton>
 * ```
 */
export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  disabled = false,
  loading = false,
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const baseClasses =
    'inline-flex items-center justify-center font-semibold rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary:
      'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500 hover:scale-105',
    secondary:
      'bg-secondary-600 hover:bg-secondary-700 text-white focus:ring-secondary-500 hover:scale-105',
    accent:
      'bg-accent-500 hover:bg-accent-600 text-white focus:ring-accent-500 hover:scale-105',
  };

  const sizeClasses = {
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-3 text-base',
    lg: 'px-6 py-4 text-lg',
  };

  const handleClick = async () => {
    if (!disabled && !loading) {
      try {
        await onClick();
      } catch (error) {
        console.error('Action button error:', error);
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-label={ariaLabel}
    >
      {loading && (
        <svg
          className="-ml-1 mr-3 h-4 w-4 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
};
