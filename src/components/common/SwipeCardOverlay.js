import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

/**
 * SwipeCardOverlay - Shows the LIKE/NOPE/etc overlay text during card swipes
 */
const SwipeCardOverlay = ({ type, label, opacity }) => {
  if (!label) return null;
  
  const isLeft = type === 'left';
  const isRight = type === 'right';
  const isTop = type === 'top';
  const isBottom = type === 'bottom';
  
  const overlayStyles = [
    styles.overlay,
    isLeft && styles.overlayLeft,
    isRight && styles.overlayRight,
    isTop && styles.overlayTop,
    isBottom && styles.overlayBottom,
  ];
  
  return (
    <Animated.View style={[overlayStyles, { opacity }]}>
      <Text style={[
        styles.overlayText,
        { color: label.color },
        { fontSize: label.fontSize || 32 }
      ]}>
        {label.title}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
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
  overlayTop: {
    top: 20,
    alignSelf: 'center',
    borderColor: '#3498DB',
  },
  overlayBottom: {
    bottom: 20,
    alignSelf: 'center',
    borderColor: '#7F8C8D',
  },
  overlayText: {
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 5,
  },
});

export default SwipeCardOverlay;
