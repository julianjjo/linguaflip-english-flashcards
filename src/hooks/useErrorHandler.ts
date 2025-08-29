import { useCallback } from 'react';

/**
 * Custom hook for consistent error handling and logging across components
 *
 * @param context - Identifier for the component/context where errors occur (used in logs)
 * @param options - Configuration options for error handling behavior
 * @param options.showUserMessage - Whether to return user-friendly error messages (default: false)
 * @param options.logLevel - Console logging level ('warn' or 'error', default: 'error')
 * @param options.fallbackMessage - Default error message when error details are unavailable (default: 'An unexpected error occurred')
 * @returns Object containing error handling functions
 *
 * @example
 * ```typescript
 * const { handleError, handleAsyncError } = useErrorHandler('AudioSettings');
 *
 * // Handle synchronous errors
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   handleError(error, 'Failed to perform operation');
 * }
 *
 * // Handle async errors
 * const result = await handleAsyncError(
 *   () => fetchData(),
 *   'Failed to load data'
 * );
 * ```
 */
export const useErrorHandler = (
  context: string,
  options: {
    showUserMessage?: boolean;
    logLevel?: 'warn' | 'error';
    fallbackMessage?: string;
  } = {}
) => {
  const {
    showUserMessage = false,
    logLevel = 'error',
    fallbackMessage = 'An unexpected error occurred'
  } = options;

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || fallbackMessage;

      // Log to console
      if (logLevel === 'warn') {
        console.warn(`[${context}] ${message}:`, error);
      } else {
        console.error(`[${context}] ${message}:`, error);
      }

      // Here you could integrate with error reporting services
      // like Sentry, LogRocket, etc.

      // Return user-friendly message if needed
      if (showUserMessage) {
        if (error instanceof Error) {
          return error.message;
        }
        return message;
      }

      return null;
    },
    [context, logLevel, fallbackMessage, showUserMessage]
  );

  const handleAsyncError = useCallback(
    async <T>(
      asyncOperation: () => Promise<T>,
      customMessage?: string
    ): Promise<T | null> => {
      try {
        return await asyncOperation();
      } catch (error) {
        handleError(error, customMessage);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
};