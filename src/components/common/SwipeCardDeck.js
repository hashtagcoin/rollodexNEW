import React, { useState, useRef, useEffect, useCallback, Component } from 'react';
import { View, StyleSheet, Platform, unstable_batchedUpdates, Text } from 'react-native';
import PropTypes from 'prop-types';
import Swiper from 'react-native-deck-swiper';

// Error boundary specifically for swipe gestures
class SwipeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('SwipeCardDeck: Gesture error caught:', error, errorInfo);
    // In production, you might want to log this to a crash reporting service
    if (__DEV__) {
      console.error('SwipeCardDeck: Error details:', errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Swipe temporarily unavailable</Text>
        </View>
      );
    }
    return this.props.children;
  }
}

/**
 * SwipeCardDeck component using react-native-deck-swiper library
 * This replaces the previous custom implementation with a more robust solution
 */
const SwipeCardDeck = ({
  data = [],
  renderCard,
  onSwipeLeft,
  onSwipeRight,
  infinite = false,
  stackSize = 3,
  containerStyle,
  cardStyle,
  emptyView,
  onSwiperRef,
}) => {
  const swipedCardIdsRef = useRef(new Set());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [forceRerender, setForceRerender] = useState(0);
  const swiperRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Reset current index when data changes
  useEffect(() => {
    // Cancel any pending animation frames
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    setCurrentIndex(0);
    swipedCardIdsRef.current = new Set();
    setForceRerender(0);
  }, [data]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Cleanup swiper reference
      if (swiperRef.current) {
        swiperRef.current = null;
      }
    };
  }, []);



  // Expose swiper ref to parent
  useEffect(() => {
    if (onSwiperRef && swiperRef.current) {
      onSwiperRef(swiperRef.current);
    }
  }, [onSwiperRef]);

  // Handle when no cards are available
  if (!data || data.length === 0) {
    return emptyView || <View style={styles.emptyContainer} />;
  }

  const handleCardSwiped = useCallback((cardIndex) => {
    try {
      const item = data[cardIndex];
      const cardId = item?.id || item?._id;
      if (cardId) {
        swipedCardIdsRef.current.add(cardId);
      }
      
      // Debug logging for iOS testing
      if (__DEV__) {
        console.log('SwipeCardDeck: Card swiped', {
          cardIndex,
          itemTitle: item?.title || item?.name,
          platform: Platform.OS,
          totalCards: data.length,
          currentIndex,
          forceRerender
        });
      }
      
      // Cancel any pending animation frames
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Batch state updates to prevent race conditions
      unstable_batchedUpdates(() => {
        const nextIndex = (infinite && cardIndex === data.length - 1) ? 0 : cardIndex + 1;
        setCurrentIndex(nextIndex);
        
        // For iOS, use safer animation frame handling
        if (Platform.OS === 'ios') {
          animationFrameRef.current = requestAnimationFrame(() => {
            setForceRerender(prev => prev + 1);
            animationFrameRef.current = null;
          });
        }
      });
    } catch (error) {
      console.error('SwipeCardDeck: Error in handleCardSwiped:', error);
      // Fallback to prevent complete crash
      setCurrentIndex(prev => Math.min(prev + 1, data.length - 1));
    }
  }, [infinite, data.length, currentIndex, forceRerender]);

  return (
    <SwipeErrorBoundary>
      <View style={[styles.container, containerStyle]}>
        <Swiper
        ref={swiperRef}
        cards={data}
        renderCard={renderCard}
        onSwipedLeft={(cardIndex) => {
          try {
            handleCardSwiped(cardIndex);
            if (onSwipeLeft && data[cardIndex]) {
              onSwipeLeft(data[cardIndex]);
            }
          } catch (error) {
            console.error('SwipeCardDeck: Error in onSwipedLeft:', error);
          }
        }}
        onSwipedRight={(cardIndex) => {
          try {
            handleCardSwiped(cardIndex);
            if (onSwipeRight && data[cardIndex]) {
              onSwipeRight(data[cardIndex]);
            }
          } catch (error) {
            console.error('SwipeCardDeck: Error in onSwipedRight:', error);
          }
        }}
        backgroundColor={'transparent'}
        stackSize={stackSize}
        infinite={infinite}
        cardIndex={currentIndex}
        stackSeparation={15}
        stackScale={0.1}
        cardVerticalMargin={10}
        cardHorizontalMargin={5}
        cardStyle={cardStyle}
        overlayLabels={{
          left: {
            title: 'NOPE',
            style: {
              label: styles.overlayLabelLeft,
              wrapper: styles.overlayWrapper,
            }
          },
          right: {
            title: 'LIKE',
            style: {
              label: styles.overlayLabelRight,
              wrapper: styles.overlayWrapper,
            }
          },
        }}
        overlayOpacityHorizontalThreshold={15}
        inputOverlayLabelsOpacityRangeX={[-45, -30, 30, 45]}
        outputOverlayLabelsOpacityRangeX={[0, 1, 1, 0]}
        disableBottomSwipe={true}
        disableTopSwipe={true}
        useViewOverflow={false}
        swipeBackCard={false}
        verticalSwipe={false}
        horizontalSwipe={true}
        showSecondCard={true}
        stackAnimationFriction={7}
        stackAnimationTension={40}
        key={`swiper-${forceRerender}`}
        animateCardOpacity={Platform.OS === 'ios' ? false : true}
        animateOverlayLabelsOpacity={Platform.OS === 'ios' ? false : true}
        goBackToPreviousCardOnSwipeOut={false}
        />
      </View>
    </SwipeErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'visible',
    zIndex: 1,
    ...(Platform.OS === 'ios' && {
      backgroundColor: 'transparent',
    }),
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  overlayWrapper: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    padding: 10,
    borderWidth: 2,
    borderRadius: 10,
  },
  overlayLabelLeft: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 10,
    color: '#d33',
    borderColor: '#d33',
  },
  overlayLabelRight: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 10,
    color: '#2b9',
    borderColor: '#2b9',
  },
});

SwipeCardDeck.propTypes = {
  data: PropTypes.array,
  renderCard: PropTypes.func.isRequired,
  onSwipeLeft: PropTypes.func,
  onSwipeRight: PropTypes.func,
  infinite: PropTypes.bool,
  stackSize: PropTypes.number,
  onSwiperRef: PropTypes.func,
  containerStyle: PropTypes.object,
  cardStyle: PropTypes.object,
  emptyView: PropTypes.element,
};

export default SwipeCardDeck;
