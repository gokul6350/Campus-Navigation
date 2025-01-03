import { StyleSheet, View, TouchableOpacity, Text, Image, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView, PinchGestureHandler, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { useAnimatedGestureHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SCREEN_HEIGHT = Dimensions.get('window').height;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.0;

export default function CampusNavigation() {
  const scale = useSharedValue(0.5);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const handleZoomIn = () => {
    if (scale.value < MAX_SCALE) {
      scale.value = withTiming(scale.value + 0.2);
    }
  };

  const handleZoomOut = () => {
    if (scale.value > MIN_SCALE) {
      scale.value = withTiming(scale.value - 0.2);
    }
  };

  const clampTranslate = (value, max) => Math.min(Math.max(value, -max), max);

  const pinchHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, event.scale * scale.value));
      scale.value = newScale;

      const maxTranslateX = (newScale - 1) * (SCREEN_WIDTH / 2);
      const maxTranslateY = (newScale - 1) * (SCREEN_HEIGHT / 2);

      translateX.value = clampTranslate(savedTranslateX.value + event.translationX, maxTranslateX);
      translateY.value = clampTranslate(savedTranslateY.value + event.translationY, maxTranslateY);
    },
    onEnd: () => {
      scale.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale.value));
    },
  });

  const panHandler = useAnimatedGestureHandler({
    onStart: () => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    },
    onActive: (event) => {
      const maxTranslateX = (scale.value - 1) * (SCREEN_WIDTH / 2);
      const maxTranslateY = (scale.value - 1) * (SCREEN_HEIGHT / 2);

      translateX.value = clampTranslate(savedTranslateX.value + event.translationX, maxTranslateX);
      translateY.value = clampTranslate(savedTranslateY.value + event.translationY, maxTranslateY);
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <Stack.Screen 
        options={{
          title: 'Campus Navigation',
          headerStyle: {
            backgroundColor: '#1a237e',
          },
          headerTintColor: '#fff',
        }} 
      />
      
      <View style={styles.zoomControls}>
        <TouchableOpacity 
          onPress={handleZoomIn} 
          style={[styles.zoomButton, scale.value >= MAX_SCALE && styles.disabledButton]}
          disabled={scale.value >= MAX_SCALE}
        >
          <Text style={styles.zoomButtonText}>+</Text>
        </TouchableOpacity>
        <Text style={styles.zoomLevel}>Zoom: {(scale.value * 100).toFixed(0)}%</Text>
        <TouchableOpacity 
          onPress={handleZoomOut} 
          style={[styles.zoomButton, scale.value <= MIN_SCALE && styles.disabledButton]}
          disabled={scale.value <= MIN_SCALE}
        >
          <Text style={styles.zoomButtonText}>-</Text>
        </TouchableOpacity>
      </View>

      <PanGestureHandler onGestureEvent={panHandler}>
        <Animated.View>
          <PinchGestureHandler onGestureEvent={pinchHandler}>
            <Animated.View style={[styles.mapWrapper, animatedStyle]}>
              <Image
                source={require('../assets/merged_map_z19.webp')}
                style={styles.mapImage}
                resizeMode="contain"
              />
            </Animated.View>
          </PinchGestureHandler>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapWrapper: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  zoomControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    flexDirection: 'column',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  zoomButton: {
    width: 40,
    height: 40,
    backgroundColor: '#1a237e',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  disabledButton: {
    backgroundColor: '#9fa8da',
  },
  zoomButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  zoomLevel: {
    marginVertical: 8,
    color: '#1a237e',
    fontWeight: 'bold',
  },
});
