import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UseLazyLoadOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface UseLazyLoadReturn {
  ref: React.RefObject<HTMLElement>;
  isInView: boolean;
  hasTriggered: boolean;
}

export const useLazyLoad = (options: UseLazyLoadOptions = {}): UseLazyLoadReturn => {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
  } = options;

  const [isInView, setIsInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback(() => {
    if (!ref.current || observerRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setHasTriggered(true);

            // Disconnect if triggerOnce is true
            if (triggerOnce && observerRef.current) {
              observerRef.current.disconnect();
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(ref.current);
  }, [threshold, rootMargin, triggerOnce]);

  const unobserve = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
  }, []);

  useEffect(() => {
    observe();

    return () => {
      unobserve();
    };
  }, [observe, unobserve]);

  // Re-observe if hasTriggered is false and triggerOnce is false
  useEffect(() => {
    if (!triggerOnce && hasTriggered && !isInView) {
      observe();
    }
  }, [hasTriggered, isInView, triggerOnce, observe]);

  return {
    ref,
    isInView,
    hasTriggered,
  };
};

// Hook for lazy loading components with React.lazy
export const useLazyComponent = <T extends React.ComponentType<Record<string, unknown>>>(
  importFunc: () => Promise<{ default: T }>,
  options: UseLazyLoadOptions = {}
) => {
  const [Component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ref, isInView, hasTriggered } = useLazyLoad(options);

  useEffect(() => {
    if (isInView && !Component && !isLoading) {
      setIsLoading(true);
      setError(null);

      importFunc()
        .then((module) => {
          setComponent(() => module.default);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsLoading(false);
        });
    }
  }, [isInView, Component, isLoading, importFunc]);

  return {
    Component,
    isLoading,
    error,
    ref,
    isInView,
    hasTriggered,
  };
};

// Hook for lazy loading data
export const useLazyData = <T>(
  fetchFunc: () => Promise<T>,
  options: UseLazyLoadOptions = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ref, isInView, hasTriggered } = useLazyLoad(options);

  useEffect(() => {
    if (isInView && !data && !isLoading) {
      setIsLoading(true);
      setError(null);

      fetchFunc()
        .then((result) => {
          setData(result);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err);
          setIsLoading(false);
        });
    }
  }, [isInView, data, isLoading, fetchFunc]);

  return {
    data,
    isLoading,
    error,
    ref,
    isInView,
    hasTriggered,
  };
};