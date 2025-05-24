/**
 * SwipeCardDeck Component
 * A reusable, optimized card swiping component that prevents image flickering
 * and unmounting issues during animations.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo, useImperativeHandle } from 'react';
import {
  View, 
  Animated, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  TouchableWithoutFeedback,
  InteractionManager
} from 'react-native';
import * as imagePreloader from '../../utils/imagePreloader';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Performance tracking
const performanceMetrics = {
  swipeCount: 0,
  totalSwipeTime: 0,
  successfulSwipes: 0,
  failedSwipes: 0,
  animationDrops: 0,
  lastSwipeTime: 0,
  swipeTimings: [],
  lastLogTime: 0,
};

// Enhanced logging with timestamps and performance data
const log = (action, details = {}) => {
  const now = Date.now();
  const timestamp = new Date(now).toISOString().split('T')[1].split('Z')[0];
  
  // Calculate time since last log if applicable
  let timeSinceLast = '';
  if (performanceMetrics.lastLogTime) {
    timeSinceLast = `+${now - performanceMetrics.lastLogTime}ms`;
  }
  performanceMetrics.lastLogTime = now;
  
  // Add timestamp to all logs
  console.log(`[SwipeCardDeck][${timestamp}]${timeSinceLast} ${action}`, {
    ...details,
    performanceMetrics: {
      swipeCount: performanceMetrics.swipeCount,
      avgSwipeTime: performanceMetrics.swipeCount > 0 ? 
        Math.round(performanceMetrics.totalSwipeTime / performanceMetrics.swipeCount) : 0,
      successRate: performanceMetrics.swipeCount > 0 ? 
        Math.round((performanceMetrics.successfulSwipes / performanceMetrics.swipeCount) * 100) : 0,
      animationDrops: performanceMetrics.animationDrops,
    }
  });
};

// Add global performance logging
const trackSwipePerformance = (start, end, success) => {
  const duration = end - start;
  performanceMetrics.swipeCount++;
  performanceMetrics.totalSwipeTime += duration;
  
  if (success) {
    performanceMetrics.successfulSwipes++;
  } else {
    performanceMetrics.failedSwipes++;
  }
  
  performanceMetrics.swipeTimings.push({
    timestamp: Date.now(),
    duration,
    success,
  });
  
  // Keep only the last 10 timings
  if (performanceMetrics.swipeTimings.length > 10) {
    performanceMetrics.swipeTimings.shift();
  }
  
  // Log abnormal durations
  if (duration > 500) {
    console.warn(`[SwipeCardDeck] SLOW SWIPE DETECTED: ${duration}ms`, {
      timestamp: new Date().toISOString(),
      duration,
      success,
      recentTimings: performanceMetrics.swipeTimings,
    });
  }
};

// Check for potential memory issues
const checkMemoryUsage = () => {
  try {
    if (global.performance && typeof global.performance.memory === 'object') {
      const memory = global.performance.memory;
      console.log('[SwipeCardDeck] MEMORY USAGE', {
        totalJSHeapSize: Math.round(memory.totalJSHeapSize / (1024 * 1024)) + 'MB',
        usedJSHeapSize: Math.round(memory.usedJSHeapSize / (1024 * 1024)) + 'MB',
        jsHeapSizeLimit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024)) + 'MB',
      });
    }
  } catch (e) {
    // Memory API not available
  }
};

const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_OUT_DURATION = 250;

// Colors
const DARK_GREEN = '#006400';

// Fail-safe global animation reset timer to prevent hung animations
let lastAnimationResetTime = 0;
const ANIMATION_STUCK_THRESHOLD = 5000; // 5 seconds

// Global animation state monitoring
const resetStuckAnimations = () => {
  const now = Date.now();
  // Only check every 5 seconds to avoid performance impact
  if (now - lastAnimationResetTime < 5000) return;
  
  lastAnimationResetTime = now;
  
  // Get all SwipeCardDeck components that might be stuck
  const stuckComponents = Object.values(activeSwipeDecks).filter(deck => {
    return deck.isAnimating && (now - deck.animationStartTime > ANIMATION_STUCK_THRESHOLD);
  });
  
  if (stuckComponents.length > 0) {
    console.warn(`[SwipeCardDeck] DETECTED ${stuckComponents.length} STUCK ANIMATIONS. Resetting...`, {
      stuckComponents: stuckComponents.map(c => c.id)
    });
    
    // Force reset all stuck animations
    stuckComponents.forEach(deck => {
      if (deck.resetFn) {
        console.log(`[SwipeCardDeck] Resetting stuck animation for deck ${deck.id}`);
        deck.resetFn();
      }
    });
  }
};

// Track all active swipe decks to monitor for stuck animations
const activeSwipeDecks = {};

// Start the global monitoring interval
setInterval(resetStuckAnimations, 1000);

/**
 * SwipeCardDeck - A component that renders a deck of cards that can be swiped
 * with proper animation handling and image preloading
 */
const SwipeCardDeck = React.forwardRef(({ 
  data = [], 
  renderCard, 
  renderNoMoreCards,
  onSwipeLeft, 
  onSwipeRight, 
  onCardTap,
  onIndexChange,
  getCardImage, // Function to get image URL from card data
  cardKey = item => item.id, // Function to get unique key from card data
  style,
  animationDuration = SWIPE_OUT_DURATION,
  initialIndex = 0,
  loopCards = false,
  preloadLimit = 3, // How many cards ahead to preload
  debugMode = false
}, ref) => {
  // Track which card is on top of the stack
  const [currentIndex, setCurrentIndex] = useState(0);
  const isAnimatingRef = useRef(false);
  const panResponderRef = useRef(null);
  const componentId = useRef(`swipe-deck-${Date.now()}-${Math.floor(Math.random() * 1000)}`);
  const animationStartTimeRef = useRef(0);
  
  // Register this component with the global animation monitoring system
  useEffect(() => {
    // Register this deck with the global monitor
    activeSwipeDecks[componentId.current] = {
      id: componentId.current,
      isAnimating: false,
      animationStartTime: 0,
      resetFn: () => {
        console.warn(`[SwipeCardDeck] Force resetting animation state for ${componentId.current}`);
        // Force reset animation state
        isAnimatingRef.current = false;
        position.setValue({ x: 0, y: 0 });
      }
    };
    
    // Clean up on unmount
    return () => {
      delete activeSwipeDecks[componentId.current];
    };
  }, []);
  
  // Expose methods to parent component via ref
  useImperativeHandle(ref, () => ({
    forceSwipeLeft: () => {
      if (!isAnimatingRef.current && data.length > 0) {
        forceSwipeLeft();
      }
    },
    forceSwipeRight: () => {
      if (!isAnimatingRef.current && data.length > 0) {
        forceSwipeRight();
      }
    },
    getCurrentIndex: () => currentIndex,
    swipeToCard: (index) => {
      if (!isAnimatingRef.current && index >= 0 && index < data.length) {
        setCurrentIndex(index);
      }
    }
  }));
  
  // Animation position values
  const position = useRef(new Animated.ValueXY()).current;
  const rotation = position.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp'
  });
  
  // Logging helper
  const log = useCallback((event, data = {}) => {
    if (debugMode) {
      console.log(`[SwipeCardDeck][${new Date().toISOString()}][${event}]`, {
        currentIndex,
        totalCards: data.length,
        ...data
      });
    }
  }, [currentIndex, debugMode]);
  
  // Reset position when currentIndex changes
  useEffect(() => {
    position.setValue({ x: 0, y: 0 });
    onIndexChange?.(currentIndex);
  }, [currentIndex, position, onIndexChange]);
  
  // Preload images for upcoming cards
  useEffect(() => {
    // Only preload if we have data and current index is valid
    if (data && data.length > 0 && currentIndex < data.length) {
      // Determine how many cards to preload (limited by remaining cards)
      const numToPreload = Math.min(preloadLimit, data.length - currentIndex);
      
      // Create array of promises for preloading
      for (let i = 0; i < numToPreload; i++) {
        const idx = currentIndex + i;
        if (idx >= data.length) break;
        
        const item = data[idx];
        
        // Extract image URL directly, similar to ServiceDetailScreen approach
        const imageUrl = item.media_urls?.[0] || // Primary approach - direct access to first media URL
                        item.image_url || 
                        item.images?.[0]?.url || 
                        item.avatar_url || 
                        'https://smtckdlpdfvdycocwoip.supabase.co/storage/v1/object/public/providerimages/therapy/1.png'; // Default fallback
        
        console.log(`[SwipeCardDeck] Preloading image: ${imageUrl}`);
        
        // Add to preload queue
        if (imageUrl) {
          imagePreloader.preloadImage(imageUrl, `SwipeCardDeck-${componentId.current}-${idx}`);
        }
      }
    }
  }, [currentIndex, data, preloadLimit]);
  
  // Helper to get next card index
  const getNextCardIndex = useCallback(() => {
    if (currentIndex >= data.length - 1) {
      return loopCards ? 0 : -1;
    }
    return currentIndex + 1;
  }, [currentIndex, data.length, loopCards]);
  
  // Completion callback for right swipe with detailed diagnostics
  const onSwipeRightComplete = useCallback(() => {
    const completeStartTime = Date.now();
    const item = data[currentIndex];
    
    log('SWIPE_RIGHT_COMPLETE_START', { 
      timestamp: completeStartTime,
      item,
      currentIndex,
      nextIndex: getNextCardIndex(),
      dataLength: data.length
    });
    
    // Track this operation with unique ID
    const operationId = `complete_right_${completeStartTime}`;
    console.log(`[CALLBACK_TRACE] ${operationId} - Starting right swipe completion`);
    
    try {
      // Reset animation position
      position.setValue({ x: 0, y: 0 });
      console.log(`[CALLBACK_TRACE] ${operationId} - Position reset complete`);
      
      // Execute callback if provided inside error boundary
      if (onSwipeRight) {
        console.log(`[CALLBACK_TRACE] ${operationId} - Calling onSwipeRight callback`);
        try {
          onSwipeRight(item, currentIndex);
          console.log(`[CALLBACK_TRACE] ${operationId} - onSwipeRight callback completed successfully`);
        } catch (err) {
          console.error(`[CALLBACK_TRACE] ${operationId} - ERROR in onSwipeRight callback:`, err);
        }
      }
      
      // Update index after animation with careful error handling
      const nextIndex = getNextCardIndex();
      console.log(`[CALLBACK_TRACE] ${operationId} - Next index calculated: ${nextIndex}`);
      
      if (nextIndex !== -1) {
        console.log(`[CALLBACK_TRACE] ${operationId} - Scheduling index update to ${nextIndex}`);
        InteractionManager.runAfterInteractions(() => {
          console.log(`[CALLBACK_TRACE] ${operationId} - Executing index update to ${nextIndex}`);
          setCurrentIndex(nextIndex);
        });
      }
      
      // Allow animations again
      isAnimatingRef.current = false;
      console.log(`[CALLBACK_TRACE] ${operationId} - Animation flag cleared`);
      
      // Update global animation tracking
      if (activeSwipeDecks[componentId.current]) {
        activeSwipeDecks[componentId.current].isAnimating = false;
        console.log(`[CALLBACK_TRACE] ${operationId} - Global animation tracking updated`);
      }
      
      // Log completion timing
      const completeEndTime = Date.now();
      log('SWIPE_RIGHT_COMPLETE_END', {
        duration: completeEndTime - completeStartTime,
        nextIndex
      });
      
      // Performance check
      InteractionManager.runAfterInteractions(() => {
        checkMemoryUsage();
      });
    } catch (err) {
      console.error(`[CALLBACK_TRACE] ${operationId} - CRITICAL ERROR in onSwipeRightComplete:`, err);
      // Force reset on error to prevent hung state
      isAnimatingRef.current = false;
      position.setValue({ x: 0, y: 0 });
    }
  }, [currentIndex, data, getNextCardIndex, log, onSwipeRight, position]);
  
  // Handle a successful left swipe
  const onSwipeLeftComplete = useCallback(() => {
    const item = data[currentIndex];
    log('SWIPE_LEFT_COMPLETE', { item });
    
    // Execute callback if provided
    onSwipeLeft?.(item, currentIndex);
    
    // Update index after animation
    const nextIndex = getNextCardIndex();
    if (nextIndex !== -1) {
      InteractionManager.runAfterInteractions(() => {
        setCurrentIndex(nextIndex);
      });
    }
    
    // Allow animations again
    isAnimatingRef.current = false;
  }, [currentIndex, data, getNextCardIndex, log, onSwipeLeft]);
  
  // Force swipe right programmatically with optimized animation and performance tracking
  const forceSwipeRight = useCallback(() => {
    if (isAnimatingRef.current) {
      log('ANIMATION_BLOCKED', { reason: 'isAnimatingRef is true', value: isAnimatingRef.current });
      
      // Auto-recovery: If animation has been running too long, force reset it
      const now = Date.now();
      const lastAnimTime = animationStartTimeRef.current;
      if (lastAnimTime > 0 && (now - lastAnimTime > 3000)) {
        console.warn(`[SwipeCardDeck] Detected stuck animation running for ${now - lastAnimTime}ms. Force resetting.`);
        isAnimatingRef.current = false;
        position.setValue({ x: 0, y: 0 });
        
        // Update global tracking
        if (activeSwipeDecks[componentId.current]) {
          activeSwipeDecks[componentId.current].isAnimating = false;
        }
      } else {
        return;
      }
    }
    
    const startTime = Date.now();
    animationStartTimeRef.current = startTime;
    isAnimatingRef.current = true;
    
    // Update global tracking
    if (activeSwipeDecks[componentId.current]) {
      activeSwipeDecks[componentId.current].isAnimating = true;
      activeSwipeDecks[componentId.current].animationStartTime = startTime;
    }
    
    log('FORCE_SWIPE_RIGHT_START', { 
      timestamp: startTime,
      position: position.__getValue(),
      currentIndex,
      dataLength: data.length
    });
    
    // Track current operation with ID to trace animation flow
    const operationId = `swipe_right_${startTime}`;
    console.log(`[ANIM_TRACE] ${operationId} - Starting right swipe animation`);
    
    // Use spring animation for more natural feel and better performance
    // Use faster animation parameters to prevent timeouts
    const animation = Animated.spring(position, {
      toValue: { x: width * 1.5, y: 0 },
      tension: 65,   // Higher tension = faster animation
      friction: 5,   // Lower friction = faster animation
      useNativeDriver: true
    });
    
    // Monitor animation performance
    const startAnimation = () => {
      console.log(`[ANIM_TRACE] ${operationId} - Animation loop started`);
      
      // Set a safety timeout to detect hung animations
      const timeoutId = setTimeout(() => {
        console.warn(`[ANIM_TRACE] ${operationId} - ANIMATION TIMEOUT (1000ms) - Possible hang detected`);
        performanceMetrics.animationDrops++;
        
        // Force animation state reset if we detect a hang
        if (isAnimatingRef.current) {
          console.log(`[ANIM_TRACE] ${operationId} - Forcing animation state reset due to timeout`);
          isAnimatingRef.current = false;
          position.setValue({ x: 0, y: 0 });
          InteractionManager.runAfterInteractions(() => {
            log('ANIMATION_RESET_AFTER_TIMEOUT');
          });
        }
      }, 1000);
      
      animation.start(({ finished }) => {
        clearTimeout(timeoutId);
        const endTime = Date.now();
        console.log(`[ANIM_TRACE] ${operationId} - Animation complete: finished=${finished}, duration=${endTime - startTime}ms`);
        
        // Track performance metrics
        trackSwipePerformance(startTime, endTime, finished);
        
        // Only complete if animation actually finished
        if (finished) {
          log('FORCE_SWIPE_RIGHT_COMPLETE', { 
            duration: endTime - startTime,
            finished,
            position: position.__getValue()
          });
          onSwipeRightComplete();
        } else {
          // Reset animation state if interrupted
          log('FORCE_SWIPE_RIGHT_INTERRUPTED', { 
            duration: endTime - startTime,
            reason: 'Animation not finished' 
          });
          isAnimatingRef.current = false;
          position.setValue({ x: 0, y: 0 });
        }
      });
    };
    
    // Ensure animations run after interactions complete
    InteractionManager.runAfterInteractions(startAnimation);
    
  }, [position, width, log, onSwipeRightComplete, currentIndex, data.length]);
  
  // Force swipe left programmatically with optimized animation and performance tracking
  const forceSwipeLeft = useCallback(() => {
    if (isAnimatingRef.current) {
      log('ANIMATION_BLOCKED', { reason: 'isAnimatingRef is true', value: isAnimatingRef.current });
      
      // Auto-recovery: If animation has been running too long, force reset it
      const now = Date.now();
      const lastAnimTime = animationStartTimeRef.current;
      if (lastAnimTime > 0 && (now - lastAnimTime > 3000)) {
        console.warn(`[SwipeCardDeck] Detected stuck animation running for ${now - lastAnimTime}ms. Force resetting.`);
        isAnimatingRef.current = false;
        position.setValue({ x: 0, y: 0 });
        
        // Update global tracking
        if (activeSwipeDecks[componentId.current]) {
          activeSwipeDecks[componentId.current].isAnimating = false;
        }
      } else {
        return;
      }
    }
    
    const startTime = Date.now();
    animationStartTimeRef.current = startTime;
    isAnimatingRef.current = true;
    
    // Update global tracking
    if (activeSwipeDecks[componentId.current]) {
      activeSwipeDecks[componentId.current].isAnimating = true;
      activeSwipeDecks[componentId.current].animationStartTime = startTime;
    }
    
    log('FORCE_SWIPE_LEFT_START', { 
      timestamp: startTime,
      position: position.__getValue(),
      currentIndex,
      dataLength: data.length
    });
    
    // Track current operation with ID to trace animation flow
    const operationId = `swipe_left_${startTime}`;
    console.log(`[ANIM_TRACE] ${operationId} - Starting left swipe animation`);
    
    // Use spring animation for more natural feel and better performance
    // Use faster animation parameters to prevent timeouts
    const animation = Animated.spring(position, {
      toValue: { x: -width * 1.5, y: 0 },
      tension: 65,   // Higher tension = faster animation
      friction: 5,   // Lower friction = faster animation
      useNativeDriver: true
    });
    
    // Monitor animation performance
    const startAnimation = () => {
      console.log(`[ANIM_TRACE] ${operationId} - Animation loop started`);
      
      // Set a safety timeout to detect hung animations
      const timeoutId = setTimeout(() => {
        console.warn(`[ANIM_TRACE] ${operationId} - ANIMATION TIMEOUT (1000ms) - Possible hang detected`);
        performanceMetrics.animationDrops++;
        
        // Force animation state reset if we detect a hang
        if (isAnimatingRef.current) {
          console.log(`[ANIM_TRACE] ${operationId} - Forcing animation state reset due to timeout`);
          isAnimatingRef.current = false;
          position.setValue({ x: 0, y: 0 });
          InteractionManager.runAfterInteractions(() => {
            log('ANIMATION_RESET_AFTER_TIMEOUT');
          });
        }
      }, 1000);
      
      animation.start(({ finished }) => {
        clearTimeout(timeoutId);
        const endTime = Date.now();
        console.log(`[ANIM_TRACE] ${operationId} - Animation complete: finished=${finished}, duration=${endTime - startTime}ms`);
        
        // Track performance metrics
        trackSwipePerformance(startTime, endTime, finished);
        
        // Only complete if animation actually finished
        if (finished) {
          log('FORCE_SWIPE_LEFT_COMPLETE', { 
            duration: endTime - startTime,
            finished,
            position: position.__getValue()
          });
          onSwipeLeftComplete();
        } else {
          // Reset animation state if interrupted
          log('FORCE_SWIPE_LEFT_INTERRUPTED', { 
            duration: endTime - startTime,
            reason: 'Animation not finished' 
          });
          isAnimatingRef.current = false;
          position.setValue({ x: 0, y: 0 });
        }
      });
    };
    
    // Ensure animations run after interactions complete
    InteractionManager.runAfterInteractions(startAnimation);
    
  }, [position, width, log, onSwipeLeftComplete, currentIndex, data.length]);
  
  // Reset card position (for rejecting swipes that don't cross threshold)
  const resetPosition = useCallback(() => {
    const resetStartTime = Date.now();
    const operationId = `reset_${resetStartTime}`;
    console.log(`[SwipeCardDeck] ${operationId} - Resetting card position`);
    
    // Use faster animation parameters to prevent timeouts
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      tension: 65,   // Higher tension = faster animation
      friction: 5,   // Lower friction = faster animation
      useNativeDriver: true
    }).start(({ finished }) => {
      isAnimatingRef.current = false;
      
      // Update global tracking
      if (activeSwipeDecks[componentId.current]) {
        activeSwipeDecks[componentId.current].isAnimating = false;
      }
      
      const resetEndTime = Date.now();
      log('RESET_POSITION_COMPLETE', {
        operationId,
        duration: resetEndTime - resetStartTime,
        finished
      });
    });
  }, [position, log]);
  
  // Handle tap on card
  const handleCardTap = useCallback(() => {
    if (isAnimatingRef.current) return;
    
    const item = data[currentIndex];
    log('CARD_TAP', { item });
    onCardTap?.(item, currentIndex);
  }, [currentIndex, data, log, onCardTap]);
  
  // Configure pan responder for swipe gestures
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimatingRef.current,
    onPanResponderGrant: () => {
      log('PAN_RESPONDER_GRANT');
    },
    onPanResponderMove: (event, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
    },
    onPanResponderRelease: (event, gesture) => {
      // CRITICAL FIX: Implement a forced advance timeout to ensure cards move
      // This will advance the index if the animation gets stuck
      let forceAdvanceTimeout = null;
      const swipeStartTime = Date.now();
      const operationId = `panResponder_${swipeStartTime}`;
      
      log('PAN_RESPONDER_RELEASE', { 
        dx: gesture.dx, 
        dy: gesture.dy,
        timestamp: swipeStartTime,
        operationId
      });
      
      // Determine if this is a tap or a swipe
      if (Math.abs(gesture.dx) < 5 && Math.abs(gesture.dy) < 5) {
        log('DETECTED_TAP');
        handleCardTap();
        return;
      }
      
      // Check if already animating - safety check
      if (isAnimatingRef.current) {
        console.warn(`[SwipeCardDeck] ${operationId} - Animation already in progress, forcing reset`);
        isAnimatingRef.current = false;
        // Update global tracking
        if (activeSwipeDecks[componentId.current]) {
          activeSwipeDecks[componentId.current].isAnimating = false;
        }
      }
      
      // Update animation timestamps
      animationStartTimeRef.current = swipeStartTime;
      
      // Right swipe
      if (gesture.dx > SWIPE_THRESHOLD) {
        console.log(`[SwipeCardDeck] ${operationId} - Right swipe detected, dx: ${gesture.dx}`);
        
        // Set a backup timeout to force advance the card if animation gets stuck
        forceAdvanceTimeout = setTimeout(() => {
          console.log(`[SwipeCardDeck] ${operationId} - FORCE ADVANCING CARD after right swipe timeout`);
          
          // Only force advance if we're still on the same card (animation didn't complete)
          if (isAnimatingRef.current) {
            // Force state reset and advance to next card
            isAnimatingRef.current = false;
            position.setValue({ x: 0, y: 0 });
            
            // Advance to next card
            const nextIndex = getNextCardIndex();
            if (nextIndex !== -1) {
              setCurrentIndex(nextIndex);
            }
          }
        }, 1000);
        
        // Start the animation
        forceSwipeRight();
      } 
      // Left swipe
      else if (gesture.dx < -SWIPE_THRESHOLD) {
        console.log(`[SwipeCardDeck] ${operationId} - Left swipe detected, dx: ${gesture.dx}`);
        
        // Set a backup timeout to force advance the card if animation gets stuck
        forceAdvanceTimeout = setTimeout(() => {
          console.log(`[SwipeCardDeck] ${operationId} - FORCE ADVANCING CARD after left swipe timeout`);
          
          // Only force advance if we're still on the same card (animation didn't complete)
          if (isAnimatingRef.current) {
            // Force state reset and advance to next card
            isAnimatingRef.current = false;
            position.setValue({ x: 0, y: 0 });
            
            // Advance to next card
            const nextIndex = getNextCardIndex();
            if (nextIndex !== -1) {
              setCurrentIndex(nextIndex);
            }
          }
        }, 1000);
        
        // Start the animation
        forceSwipeLeft();
      } 
      // Not enough to trigger swipe, reset position
      else {
        console.log(`[SwipeCardDeck] ${operationId} - Threshold not met, resetting position`);
        // Mark as animating just for the reset animation
        isAnimatingRef.current = true;
        // Update global tracking
        if (activeSwipeDecks[componentId.current]) {
          activeSwipeDecks[componentId.current].isAnimating = true;
          activeSwipeDecks[componentId.current].animationStartTime = swipeStartTime;
        }
        resetPosition();
      }
    }
  }), [
    forceSwipeRight, 
    forceSwipeLeft, 
    position, 
    resetPosition, 
    log, 
    handleCardTap
  ]);
  
  // Get an array of cards to render
  const getCardsToRender = useCallback(() => {
    if (!data.length) return [];
    
    // If we're out of cards and not looping
    if (currentIndex === -1 || currentIndex >= data.length) {
      return [];
    }
    
    // Keep track of rendered cards for debugging
    const renderedCardInfo = [];
    
    // Generate cards, with the currentIndex card on top
    // Important: Only generate cards for indices >= currentIndex
    const cards = data.map((item, index) => {
      // Calculate the relative position from current card
      const indexDiff = index - currentIndex;
      
      // CRITICAL FIX: Never render cards with index < currentIndex
      // This ensures swiped cards don't reappear in the deck
      if (indexDiff < 0) {
        return null; // Card already swiped, don't render
      }
      
      // Only render current card and next few cards (optimization)
      if (indexDiff > preloadLimit) {
        return null; // Too far ahead, don't render yet
      }
      
      // Track card for debugging
      renderedCardInfo.push({ index, indexDiff, isCurrentCard: indexDiff === 0 });
      
      // Position values - Airbnb-style card stack appearance
      const isCurrentCard = indexDiff === 0;
      const zIndex = 10 - indexDiff; // Higher zIndex for top cards
      const scale = 1 - (0.05 * indexDiff); // Each card is slightly smaller
      const translateY = 10 * indexDiff; // Stack cards with slight offset
      const opacity = isCurrentCard ? 1 : Math.max(0.7, 1 - (0.2 * indexDiff));
      
      // Create a card style based on its position in the stack
      const cardStyle = {
        zIndex,
        opacity,
        transform: [
          { scale },
          { translateY }
        ]
      };
      
      // Only the top card gets the animation and pan handlers
      if (isCurrentCard) {
        cardStyle.transform = [
          { translateX: position.x },
          { translateY: position.y },
          { rotate: rotation },
          { scale },
        ];
        
        return (
          <Animated.View 
            key={cardKey(item)} 
            style={[styles.card, cardStyle]}
            {...panResponder.panHandlers}
          >
            {renderCard(item, index)}
          </Animated.View>
        );
      }
      
      // All other cards are just positioned (not animated or interactive)
      return (
        <Animated.View 
          key={cardKey(item)} 
          style={[styles.card, cardStyle]}
        >
          {renderCard(item, index)}
        </Animated.View>
      );
    }).filter(Boolean); // Remove null entries
    
    // Add debugging to track card stack behavior
    console.log(`[SwipeCardDeck] Rendering ${cards.length} cards at currentIndex=${currentIndex}`, {
      renderedCardIndices: renderedCardInfo.map(info => info.index),
      currentIndex,
      swiped: currentIndex > 0 ? data.slice(0, currentIndex).map((item, idx) => idx) : []
    });
    
    // Don't reverse the cards - this is causing the issue with cards returning to top
    // The z-index property already handles proper stacking
    return cards;
  }, [
    data, 
    currentIndex, 
    preloadLimit, 
    renderCard, 
    position, 
    rotation, 
    panResponder.panHandlers,
    cardKey
  ]);
  
  // Add debug effect to track current index changes
  useEffect(() => {
    console.log(`[SwipeCardDeck] Current index changed to ${currentIndex}`, {
      timestamp: new Date().toISOString(),
      remainingCards: data.length - currentIndex,
      renderedCards: Math.min(preloadLimit + 1, data.length - currentIndex)
    });
  }, [currentIndex, data.length, preloadLimit]);
  
  // Check if we've run out of cards
  const showNoMoreCards = !data.length || (currentIndex === -1 || currentIndex >= data.length);
  
  // Final render
  return (
    <View style={[styles.container, style]}>
      {showNoMoreCards ? renderNoMoreCards?.() : getCardsToRender()}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    position: 'absolute',
    width: width - 40,
    height: height * 0.6,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  }
});

export default SwipeCardDeck;
