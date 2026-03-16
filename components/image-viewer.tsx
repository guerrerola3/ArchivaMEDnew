import { useState, useRef } from "react";
import { View, Image, Dimensions, Animated, PanResponder, StyleSheet } from "react-native";

interface ImageViewerProps {
  imageUrl: string;
  containerStyle?: any;
}

export function ImageViewer({ imageUrl, containerStyle }: ImageViewerProps) {
  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
  const [scale] = useState(new Animated.Value(1));
  const [offsetX] = useState(new Animated.Value(0));
  const [offsetY] = useState(new Animated.Value(0));
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);

  // Get image dimensions
  Image.getSize(imageUrl, (width, height) => {
    setImageSize({ width, height });
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        const touches = event.nativeEvent.touches;
        if (touches.length === 2) {
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          pinchStartDistanceRef.current = Math.sqrt(dx * dx + dy * dy);
          pinchStartScaleRef.current = scaleRef.current;
        }
      },
      onPanResponderMove: (event) => {
        const touches = event.nativeEvent.touches;
        
        if (touches.length === 2) {
          // Pinch zoom
          const dx = touches[0].pageX - touches[1].pageX;
          const dy = touches[0].pageY - touches[1].pageY;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const newScale = Math.max(1, Math.min((distance / pinchStartDistanceRef.current) * pinchStartScaleRef.current, 4));
          
          scaleRef.current = newScale;
          scale.setValue(newScale);
        } else if (touches.length === 1 && scaleRef.current > 1) {
          // Pan when zoomed
          const moveX = touches[0].pageX - (touches[0].pageX - offsetXRef.current);
          const moveY = touches[0].pageY - (touches[0].pageY - offsetYRef.current);
          
          offsetXRef.current = moveX;
          offsetYRef.current = moveY;
          offsetX.setValue(moveX);
          offsetY.setValue(moveY);
        }
      },
      onPanResponderRelease: () => {
        // Reset if scale is less than 1
        if (scaleRef.current < 1) {
          Animated.spring(scale, {
            toValue: 1,
            useNativeDriver: false,
          }).start();
          scaleRef.current = 1;
        }
      },
    })
  ).current;

  return (
    <View style={[styles.container, containerStyle]} {...panResponder.panHandlers}>
      <Animated.Image
        source={{ uri: imageUrl }}
        style={[
          styles.image,
          {
            transform: [
              { scale: scale },
              { translateX: offsetX },
              { translateY: offsetY },
            ],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
