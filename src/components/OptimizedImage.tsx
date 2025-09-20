import React, { useState, useEffect, useRef, useCallback } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
  priority?: boolean;
  sizes?: string;
  quality?: number;
}

interface ImageCache {
  [key: string]: {
    blob: Blob;
    timestamp: number;
    url: string;
  };
}

const CACHE_DURATION = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 20;

const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  fallbackSrc,
  onLoad,
  onError,
  priority = false,
  sizes = '320px',
  quality = 80
}) => {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Image cache management
  const imageCache = useRef<ImageCache>({});

  const cleanCache = useCallback(() => {
    const now = Date.now();
    const entries = Object.entries(imageCache.current);

    if (entries.length > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const sortedEntries = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const entriesToRemove = sortedEntries.slice(0, entries.length - MAX_CACHE_SIZE);

      entriesToRemove.forEach(([key, value]) => {
        URL.revokeObjectURL(value.url);
        delete imageCache.current[key];
      });
    }

    // Remove expired entries
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        URL.revokeObjectURL(value.url);
        delete imageCache.current[key];
      }
    });
  }, []);

  const getCacheKey = (url: string, quality: number) => {
    return `${url}:${quality}`;
  };

  const optimizeImageUrl = (url: string, quality: number): string => {
    // For Picsum photos, we can optimize the URL
    if (url.includes('picsum.photos')) {
      // Add quality parameter if not present
      if (!url.includes('?')) {
        return `${url}?q=${quality}`;
      } else {
        return `${url}&q=${quality}`;
      }
    }
    return url;
  };

  const loadImage = useCallback(async (imageUrl: string): Promise<string> => {
    const cacheKey = getCacheKey(imageUrl, quality);

    // Check cache first
    if (imageCache.current[cacheKey]) {
      return imageCache.current[cacheKey].url;
    }

    try {
      const optimizedUrl = optimizeImageUrl(imageUrl, quality);
      const response = await fetch(optimizedUrl);

      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }

      const blob = await response.blob();

      // Cache the blob
      const objectUrl = URL.createObjectURL(blob);
      imageCache.current[cacheKey] = {
        blob,
        timestamp: Date.now(),
        url: objectUrl,
      };

      cleanCache();
      return objectUrl;
    } catch (error) {
      console.warn('Failed to load/optimize image:', error);
      throw error;
    }
  }, [quality, cleanCache]);

  const getFallbackImage = useCallback((): string => {
    if (fallbackSrc) return fallbackSrc;

    // Generate a Picsum fallback based on alt text hash
    const hash = alt.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `https://picsum.photos/320/180?random=${hash}`;
  }, [fallbackSrc, alt]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.();
  }, [onLoad]);

  const handleImageError = useCallback(async () => {
    if (hasError) {
      // Already tried fallback, show placeholder
      setIsLoading(false);
      onError?.();
      return;
    }

    setHasError(true);
    setIsLoading(true);

    try {
      const fallbackUrl = getFallbackImage();
      const optimizedFallback = await loadImage(fallbackUrl);
      setImageSrc(optimizedFallback);
    } catch (fallbackError) {
      console.warn('Fallback image failed:', fallbackError);
      setIsLoading(false);
      onError?.();
    }
  }, [hasError, getFallbackImage, loadImage, onError]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observerRef.current?.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before the image enters the viewport
        threshold: 0.1,
      }
    );

    observerRef.current.observe(imgRef.current);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [priority]);

  // Load image when in view or priority
  useEffect(() => {
    if (!isInView) return;

    const loadImageAsync = async () => {
      try {
        setIsLoading(true);
        const optimizedSrc = await loadImage(src);
        setImageSrc(optimizedSrc);
      } catch (error) {
        console.warn('Failed to load image:', error);
        handleImageError();
      }
    };

    loadImageAsync();
  }, [isInView, src, loadImage, handleImageError]);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (imageSrc && imageSrc.startsWith('blob:')) {
        URL.revokeObjectURL(imageSrc);
      }
    };
  }, [imageSrc]);

  return (
    <div className={`relative ${className}`}>
      {/* Loading placeholder */}
      {isLoading && (
        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm">Loading...</div>
        </div>
      )}

      {/* Error placeholder */}
      {hasError && !isLoading && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <div className="text-gray-400 text-sm text-center">
            <svg className="mx-auto h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Image unavailable
          </div>
        </div>
      )}

      {/* Actual image */}
      {imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          className={`${className} ${isLoading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
          onLoad={handleImageLoad}
          onError={handleImageError}
          loading={priority ? 'eager' : 'lazy'}
          sizes={sizes}
          style={{ display: isLoading ? 'none' : 'block' }}
        />
      )}

      {/* Invisible placeholder for lazy loading */}
      {!isInView && !priority && (
        <div
          ref={imgRef}
          className={className}
          style={{ backgroundColor: '#f3f4f6' }}
        />
      )}
    </div>
  );
};

export default OptimizedImage;