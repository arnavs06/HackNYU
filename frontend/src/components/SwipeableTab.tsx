import React, { useRef } from 'react';
import { View, PanResponder, Animated, Dimensions, Easing } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2; // Reduced threshold for easier swiping
const VELOCITY_THRESHOLD = 0.3;

interface SwipeableTabProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export default function SwipeableTab({ 
  children, 
  onSwipeLeft, 
  onSwipeRight 
}: SwipeableTabProps) {
  const pan = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only respond to horizontal swipes
        return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset(pan._value);
      },
      onPanResponderMove: (_, gestureState) => {
        // Add resistance at the edges for a more natural feel
        const resistance = 0.5;
        const translationX = gestureState.dx * resistance;
        pan.setValue(translationX);
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        
        const velocity = gestureState.vx;
        const shouldSwipeRight = (gestureState.dx > SWIPE_THRESHOLD || velocity > VELOCITY_THRESHOLD) && onSwipeRight;
        const shouldSwipeLeft = (gestureState.dx < -SWIPE_THRESHOLD || velocity < -VELOCITY_THRESHOLD) && onSwipeLeft;

        if (shouldSwipeRight) {
          // Swipe right with smooth easing
          Animated.timing(pan, {
            toValue: SCREEN_WIDTH,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            pan.setValue(0);
            onSwipeRight();
          });
        } else if (shouldSwipeLeft) {
          // Swipe left with smooth easing
          Animated.timing(pan, {
            toValue: -SCREEN_WIDTH,
            duration: 250,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }).start(() => {
            pan.setValue(0);
            onSwipeLeft();
          });
        } else {
          // Return to center with spring animation
          Animated.spring(pan, {
            toValue: 0,
            friction: 8,
            tension: 50,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        // If gesture is interrupted, smoothly return to center
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: 0,
          friction: 8,
          tension: 50,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // Add interpolation for smoother opacity transition
  const opacity = pan.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: [0.8, 1, 0.8],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View
      style={{
        flex: 1,
        transform: [{ translateX: pan }],
        opacity,
      }}
      {...panResponder.panHandlers}
    >
      {children}
    </Animated.View>
  );
}

