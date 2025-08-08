import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import PropTypes from 'prop-types';
import Swiper from 'react-native-deck-swiper';

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

  // Reset current index when data changes
  useEffect(() => {
    setCurrentIndex(0);
    swipedCardIdsRef.current = new Set();
    setForceRerender(0);
  }, [data]);



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

  const handleCardSwiped = (cardIndex) => {
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
    
    // Update index immediately to prevent crashes
    const nextIndex = (infinite && cardIndex === data.length - 1) ? 0 : cardIndex + 1;
    setCurrentIndex(nextIndex);
    
    // For iOS production builds, force component re-render to reset animation state
    if (Platform.OS === 'ios') {
      // Use requestAnimationFrame for safer timing
      requestAnimationFrame(() => {
        setForceRerender(prev => prev + 1);
      });
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <Swiper
        ref={swiperRef}
        cards={data}
        renderCard={renderCard}
        onSwipedLeft={(cardIndex) => {
          handleCardSwiped(cardIndex);
          if (onSwipeLeft && data[cardIndex]) {
            onSwipeLeft(data[cardIndex]);
          }
        }}
        onSwipedRight={(cardIndex) => {
          handleCardSwiped(cardIndex);
          if (onSwipeRight && data[cardIndex]) {
            onSwipeRight(data[cardIndex]);
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
