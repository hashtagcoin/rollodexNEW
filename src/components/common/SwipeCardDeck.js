/**
 * SwipeCardDeck Component
 * A high-performance Tinder-style card swiping component optimized for React Native
 */

import React, { useState, useRef, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  View, 
  Text,
  Animated, 
  PanResponder, 
  Dimensions, 
  StyleSheet,
  InteractionManager
} from 'react-native';
import { COLORS } from '../../constants/theme';

// Get screen dimensions
const { width, height } = Dimensions.get('window');

// Constants for swipe behavior
const SWIPE_THRESHOLD = width * 0.25;
const SWIPE_OUT_DURATION = 250;
const ROTATION_RANGE = 30;
const ROTATION_MULTIPLIER = ROTATION_RANGE / width;
const VERTICAL_THRESHOLD = height * 0.25;

// Performance constants
const CARD_PRELOAD_COUNT = 3; // Number of cards to preload
const MAX_VISIBLE_CARDS = 3;  // Maximum cards visible in stack

const SwipeCardDeck = forwardRef(({ 
  data = [],
  renderCard,
  onSwipeLeft,
  onSwipeRight, 
  onSwipeTop,
  onSwipeBottom,
  onCardDisappear,
  backgroundColor = 'transparent',
  cardStyle = {},
  stackSize = 3,
  infinite = false,
  disableTopSwipe = false,
  disableBottomSwipe = false,
  disableLeftSwipe = false,
  disableRightSwipe = false,
  animationOverlayOpacity = 0.8,
  animationDuration = SWIPE_OUT_DURATION,
  rotationEnabled = true,
  scaleEnabled = true,
  stackSeparation = 10,
  stackScale = 0.05,
  overlayLabels = {
    left: {
      title: 'NOPE',
      color: '#E74C3C',
      fontSize: 45
    },
    right: {
      title: 'LIKE',
      color: '#27AE60',
      fontSize: 45
    },
    top: {
      title: 'SUPER LIKE',
      color: '#3498DB',
      fontSize: 30
    },
    bottom: {
      title: 'DISMISS',
      color: '#7F8C8D',
      fontSize: 30
    }
  }
}, ref) => {
  
  // State
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Refs
  const cardRefs = useRef([]);
  const animatedValues = useRef([]);
  const panRef = useRef(new Animated.ValueXY()).current;
  const rotateRef = useRef(new Animated.Value(0)).current;
  const nextCardScale = useRef(new Animated.Value(1 - stackScale)).current;
  
  // Initialize animated values for each card
  if (animatedValues.current.length < data.length) {
    for (let i = animatedValues.current.length; i < data.length; i++) {
      animatedValues.current[i] = {
        x: new Animated.Value(0),
        y: new Animated.Value(i * stackSeparation),
        scale: new Animated.Value(1 - (i * stackScale)),
        opacity: new Animated.Value(i < MAX_VISIBLE_CARDS ? 1 : 0)
      };
    }
  }
  
  // Get current card data
  const currentCard = useMemo(() => {
    if (currentIndex >= data.length) return null;
    return data[currentIndex];
  }, [currentIndex, data]);
  
  // Reset position
  const resetPosition = useCallback(() => {
    Animated.parallel([
      Animated.spring(panRef, {
        toValue: { x: 0, y: 0 },
        useNativeDriver: true,
        tension: 20,
        friction: 5
      }),
      Animated.timing(rotateRef, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true
      }),
      Animated.spring(nextCardScale, {
        toValue: 1 - stackScale,
        duration: 200,
        useNativeDriver: true
      })
    ]).start();
  }, [panRef, rotateRef, nextCardScale, stackScale]);
  
  // Swipe card animation
  const swipeCard = useCallback((direction) => {
    if (isAnimating) return;
    setIsAnimating(true);
    
    let toX = 0;
    let toY = 0;
    let rotation = 0;
    
    switch (direction) {
      case 'left':
        toX = -width * 1.5;
        rotation = -ROTATION_RANGE;
        break;
      case 'right':
        toX = width * 1.5;
        rotation = ROTATION_RANGE;
        break;
      case 'up':
        toY = -height * 1.5;
        break;
      case 'down':
        toY = height * 1.5;
        break;
    }
    
    Animated.parallel([
      Animated.timing(panRef, {
        toValue: { x: toX, y: toY },
        duration: animationDuration,
        useNativeDriver: true
      }),
      Animated.timing(rotateRef, {
        toValue: rotation,
        duration: animationDuration,
        useNativeDriver: true
      }),
      // Animate next card to full size
      Animated.spring(nextCardScale, {
        toValue: 1,
        duration: animationDuration,
        useNativeDriver: true
      })
    ]).start(() => {
      InteractionManager.runAfterInteractions(() => {
        panRef.setValue({ x: 0, y: 0 });
        rotateRef.setValue(0);
        nextCardScale.setValue(1 - stackScale);
        
        const oldIndex = currentIndex;
        const newIndex = infinite && currentIndex >= data.length - 1 ? 0 : currentIndex + 1;
        
        setCurrentIndex(newIndex);
        setIsAnimating(false);
        
        // Call appropriate callback
        if (currentCard) {
          switch (direction) {
            case 'left':
              onSwipeLeft?.(currentCard, oldIndex);
              break;
            case 'right':
              onSwipeRight?.(currentCard, oldIndex);
              break;
            case 'up':
              onSwipeTop?.(currentCard, oldIndex);
              break;
            case 'down':
              onSwipeBottom?.(currentCard, oldIndex);
              break;
          }
          onCardDisappear?.(currentCard, oldIndex);
        }
      });
    });
  }, [
    isAnimating,
    currentCard,
    currentIndex,
    data.length,
    infinite,
    onSwipeLeft,
    onSwipeRight,
    onSwipeTop,
    onSwipeBottom,
    onCardDisappear,
    panRef,
    rotateRef,
    nextCardScale,
    stackScale,
    animationDuration
  ]);
  
  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    swipeLeft: () => swipeCard('left'),
    swipeRight: () => swipeCard('right'),
    swipeTop: () => swipeCard('up'),
    swipeBottom: () => swipeCard('down'),
    resetPosition,
    getCurrentCard: () => currentCard,
    getCurrentIndex: () => currentIndex,
    isAnimating: () => isAnimating
  }), [
    swipeCard, 
    resetPosition, 
    currentCard, 
    currentIndex, 
    isAnimating
  ]);
  
  // Create pan responder for gesture handling
  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating,
    onMoveShouldSetPanResponder: (_, gesture) => {
      const { dx, dy } = gesture;
      return !isAnimating && (Math.abs(dx) > 5 || Math.abs(dy) > 5);
    },
    
    onPanResponderGrant: () => {
      // Animation is starting
      setIsAnimating(true);
    },
    
    onPanResponderMove: (_, gesture) => {
      panRef.setValue({ x: gesture.dx, y: gesture.dy });
      
      if (rotationEnabled) {
        rotateRef.setValue(gesture.dx * ROTATION_MULTIPLIER);
      }
      
      // Scale next card based on swipe progress
      if (scaleEnabled) {
        const swipeProgress = Math.min(Math.abs(gesture.dx) / width, 1);
        const scale = (1 - stackScale) + (swipeProgress * stackScale);
        nextCardScale.setValue(scale);
      }
    },
    
    onPanResponderRelease: (_, gesture) => {
      const absX = Math.abs(gesture.dx);
      const absY = Math.abs(gesture.dy);
      const velocityX = Math.abs(gesture.vx);
      const velocityY = Math.abs(gesture.vy);
      
      // Determine swipe direction with velocity consideration
      if (!disableRightSwipe && (gesture.dx > SWIPE_THRESHOLD || velocityX > 0.5) && gesture.dx > 0) {
        swipeCard('right');
      } else if (!disableLeftSwipe && (gesture.dx < -SWIPE_THRESHOLD || velocityX > 0.5) && gesture.dx < 0) {
        swipeCard('left');
      } else if (!disableTopSwipe && (gesture.dy < -VERTICAL_THRESHOLD || velocityY > 0.5) && gesture.dy < 0) {
        swipeCard('up');
      } else if (!disableBottomSwipe && (gesture.dy > VERTICAL_THRESHOLD || velocityY > 0.5) && gesture.dy > 0) {
        swipeCard('down');
      } else {
        // Reset card position
        resetPosition();
        setIsAnimating(false);
      }
    }
  })).current;
  
  // Calculate overlay opacity based on swipe position
  const getOverlayOpacity = useCallback((type) => {
    if (type === 'left') {
      return panRef.x.interpolate({
        inputRange: [-width, -SWIPE_THRESHOLD, 0],
        outputRange: [animationOverlayOpacity, animationOverlayOpacity * 0.5, 0],
        extrapolate: 'clamp'
      });
    } else if (type === 'right') {
      return panRef.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD, width],
        outputRange: [0, animationOverlayOpacity * 0.5, animationOverlayOpacity],
        extrapolate: 'clamp'
      });
    } else if (type === 'top') {
      return panRef.y.interpolate({
        inputRange: [-height, -VERTICAL_THRESHOLD, 0],
        outputRange: [animationOverlayOpacity, animationOverlayOpacity * 0.5, 0],
        extrapolate: 'clamp'
      });
    } else if (type === 'bottom') {
      return panRef.y.interpolate({
        inputRange: [0, VERTICAL_THRESHOLD, height],
        outputRange: [0, animationOverlayOpacity * 0.5, animationOverlayOpacity],
        extrapolate: 'clamp'
      });
    }
    return new Animated.Value(0);
  }, [panRef, animationOverlayOpacity]);
  
  // Render overlays during swipe
  const renderOverlays = useCallback(() => {
    const overlays = [];
    
    if (!disableLeftSwipe) {
      overlays.push(
        <Animated.View 
          key="overlay-left"
          style={[styles.overlay, styles.overlayLeft, { opacity: getOverlayOpacity('left') }]}
        >
          <Text style={[styles.overlayText, { color: overlayLabels.left.color }]}>
            {overlayLabels.left.title}
          </Text>
        </Animated.View>
      );
    }
    
    if (!disableRightSwipe) {
      overlays.push(
        <Animated.View 
          key="overlay-right"
          style={[styles.overlay, styles.overlayRight, { opacity: getOverlayOpacity('right') }]}
        >
          <Text style={[styles.overlayText, { color: overlayLabels.right.color }]}>
            {overlayLabels.right.title}
          </Text>
        </Animated.View>
      );
    }
    
    return overlays;
  }, [getOverlayOpacity, disableLeftSwipe, disableRightSwipe, overlayLabels]);
  
  // Render all cards in the deck
  const renderCards = useMemo(() => {
    // If no data or all cards have been swiped
    if (!data.length || currentIndex >= data.length) {
      // Call the onAllCardsViewed callback if provided
      onCardDisappear && onCardDisappear(null, -1);
      return null;
    }
    
    console.log(`Rendering ${data.length} cards, current index: ${currentIndex}`);
    
    return data
      .map((card, i) => {
        // Don't render cards that have been swiped or are too far back in the stack
        if (i < currentIndex || i >= currentIndex + stackSize) {
          return null;
        }
        
        // Get index relative to current card (0 is top card)
        const relativeIndex = i - currentIndex;
        
        // Top card with pan responder
        if (i === currentIndex) {
          // Calculate rotation based on pan gesture
          const rotate = rotationEnabled 
            ? panRef.x.interpolate({
                inputRange: [-width, 0, width],
                outputRange: [`-${ROTATION_RANGE}deg`, '0deg', `${ROTATION_RANGE}deg`],
                extrapolate: 'clamp'
              }) 
            : '0deg';
          
          // Move card based on pan gesture
          const animatedCardStyle = {
            transform: [{
              translateX: panRef.x
            }, {
              translateY: panRef.y
            }, {
              rotate
            }],
            elevation: 999,
            zIndex: 999 // Top card has highest z-index
          };
          
          console.log(`Rendering top card (index ${i}):`, card?.title || card?.name || 'Unnamed card');
          
          // Create the top card with pan responder
          return (
            <Animated.View
              key={`card-${i}-${card.id || i}`}
              style={[styles.card, animatedCardStyle, cardStyle]}
              {...panResponder.panHandlers}
            >
              {renderCard(card)}
              {renderOverlays()}
            </Animated.View>
          );
        }
        
        // Lower cards in the stack
        const stackCardStyle = {
          position: 'absolute',
          top: relativeIndex * stackSeparation,
          left: 0,
          right: 0,
          zIndex: data.length - i - 1,
          elevation: data.length - i - 1,
          transform: [{ scale: 1 - (relativeIndex * stackScale) }]
        };
        
        return (
          <Animated.View
            key={`card-${i}-${card.id || i}`}
            style={[styles.card, stackCardStyle, cardStyle]}
          >
            {renderCard(card)}
          </Animated.View>
        );
      })
      .filter(Boolean);
  }, [
    currentIndex, 
    data, 
    renderCard, 
    panResponder, 
    renderOverlays, 
    rotationEnabled, 
    stackScale, 
    stackSeparation, 
    cardStyle, 
    panRef,
    stackSize,
    onCardDisappear
  ]);
  
  // Return the component's JSX
  return (
    <View style={[styles.container, { backgroundColor }]}>
      {renderCards}
    </View>
  );
});

// Component styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: width - 20,
    height: height * 0.7,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    shadowOpacity: 0.3,
    elevation: 2,
    backgroundColor: 'white',
  },
  overlay: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
    elevation: 100,
    borderWidth: 2,
    borderRadius: 10,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  overlayLeft: {
    left: 20,
    top: 40,
    borderColor: '#E74C3C',
    transform: [{ rotate: '-30deg' }],
  },
  overlayRight: {
    right: 20,
    top: 40,
    borderColor: '#27AE60',
    transform: [{ rotate: '30deg' }],
  },
  overlayText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  }
});

// Display name for debugging
SwipeCardDeck.displayName = 'SwipeCardDeck';

export default SwipeCardDeck;
