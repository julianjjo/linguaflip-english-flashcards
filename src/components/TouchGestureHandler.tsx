import React, { useRef, useCallback } from 'react';

interface TouchGestureOptions {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  minSwipeDistance?: number;
  maxTapDuration?: number;
  enableHapticFeedback?: boolean;
}

interface TouchGestureHandler {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
}

export const useTouchGestures = (options: TouchGestureOptions): TouchGestureHandler => {
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const {
    onSwipeLeft,
    onSwipeRight,
    onTap,
    minSwipeDistance = 50,
    maxTapDuration = 300,
    enableHapticFeedback = true
  } = options;

  const triggerHapticFeedback = useCallback(() => {
    if (enableHapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
  }, [enableHapticFeedback]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, []);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    // Prevent scrolling when detecting horizontal swipes
    if (touchStartRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartRef.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartRef.current.y);

      // If horizontal movement is greater than vertical, prevent vertical scrolling
      if (deltaX > deltaY && deltaX > 10) {
        e.preventDefault();
      }
    }
  }, []);

  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const touchEnd = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const deltaTime = touchEnd.time - touchStartRef.current.time;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Determine if it's a swipe or tap
    if (absDeltaX > minSwipeDistance && absDeltaX > absDeltaY && deltaTime < 500) {
      // Horizontal swipe
      if (deltaX > 0) {
        // Swipe right
        onSwipeRight?.();
        triggerHapticFeedback();
      } else {
        // Swipe left
        onSwipeLeft?.();
        triggerHapticFeedback();
      }
    } else if (absDeltaX < 10 && absDeltaY < 10 && deltaTime < maxTapDuration) {
      // Tap (minimal movement and quick touch)
      onTap?.();
      triggerHapticFeedback();
    }

    touchStartRef.current = null;
  }, [onSwipeLeft, onSwipeRight, onTap, minSwipeDistance, maxTapDuration, triggerHapticFeedback]);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd
  };
};

export default useTouchGestures;