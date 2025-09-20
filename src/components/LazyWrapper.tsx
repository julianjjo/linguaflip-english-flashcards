import React, { Suspense } from 'react';

interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error) => void;
}

const DefaultFallback = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

const DefaultErrorFallback = ({ error }: { error: Error }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <div className="text-red-500 mb-2">⚠️</div>
      <p className="text-sm text-gray-600">Failed to load component</p>
      {process.env.NODE_ENV === 'development' && (
        <p className="text-xs text-gray-500 mt-1">{error.message}</p>
      )}
    </div>
  </div>
);

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback = <DefaultFallback />,
  errorFallback,
  onError,
}) => {
  const [error, setError] = React.useState<Error | null>(null);

  const handleError = React.useCallback((error: Error) => {
    setError(error);
    onError?.(error);
  }, [onError]);

  React.useEffect(() => {
    // Reset error when children change
    setError(null);
  }, [children]);

  if (error) {
    return errorFallback ? (
      <>{typeof errorFallback === 'function' ? errorFallback(error) : errorFallback}</>
    ) : (
      <DefaultErrorFallback error={error} />
    );
  }

  return (
    <ErrorBoundary onError={handleError}>
      <Suspense fallback={fallback}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
};

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('LazyWrapper error:', error, errorInfo);
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null; // Error will be handled by LazyWrapper
    }

    return this.props.children;
  }
}

// Hook for creating lazy components
export const createLazyComponent = <T extends React.ComponentType<Record<string, unknown>>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) => {
  const LazyComponent = React.lazy(importFunc);

  const WrappedComponent = (props: any) => (
    <LazyWrapper fallback={fallback}>
      <LazyComponent {...props} />
    </LazyWrapper>
  );
  
  WrappedComponent.displayName = `LazyWrapper(Component)`;
  
  return WrappedComponent;
};

// Preload function for critical components
export const preloadComponent = <T extends React.ComponentType<Record<string, unknown>>>(
  importFunc: () => Promise<{ default: T }>
): Promise<void> => {
  return importFunc().then(() => {
    // Component is now cached
  });
};