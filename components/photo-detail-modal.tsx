import { Modal, StyleSheet, TouchableOpacity, View, Image, Text, Animated, PanResponder, GestureResponderEvent } from "react-native";
import { useState, useRef } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface PhotoDetailModalProps {
  visible: boolean;
  photoUrl: string | null | undefined;
  onClose: () => void;
}

export function PhotoDetailModal({ visible, photoUrl, onClose }: PhotoDetailModalProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [rotation, setRotation] = useState(0);
  const [scale] = useState(new Animated.Value(1));
  const [lastScale, setLastScale] = useState(1);
  const [offsetX] = useState(new Animated.Value(0));
  const [offsetY] = useState(new Animated.Value(0));
  const pinchStartDistance = useRef(0);
  const lastOffsetX = useRef(0);
  const lastOffsetY = useRef(0);

  if (!photoUrl) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handlePinchStart = (event: any) => {
    const { touches } = event.nativeEvent;
    if (touches.length === 2) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      pinchStartDistance.current = Math.sqrt(dx * dx + dy * dy);
    }
  };

  const handlePinchMove = (event: any) => {
    const { touches } = event.nativeEvent;
    if (touches.length === 2) {
      const dx = touches[0].pageX - touches[1].pageX;
      const dy = touches[0].pageY - touches[1].pageY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const scaleValue = (distance / pinchStartDistance.current) * lastScale;
      const clampedScale = Math.max(1, Math.min(scaleValue, 4));
      scale.setValue(clampedScale);
      setLastScale(clampedScale);
    } else if (touches.length === 1 && lastScale > 1) {
      // Single finger pan when zoomed
      const dx = touches[0].pageX - (touches[0].pageX - lastOffsetX.current);
      const dy = touches[0].pageY - (touches[0].pageY - lastOffsetY.current);
      offsetX.setValue(dx);
      offsetY.setValue(dy);
    }
  };

  const handlePanStart = (event: any, gestureState: any) => {
    if (lastScale <= 1) return;
    lastOffsetX.current = gestureState.dx;
    lastOffsetY.current = gestureState.dy;
  };

  const handlePanMove = (event: any, gestureState: any) => {
    if (lastScale <= 1) return;
    offsetX.setValue(gestureState.dx);
    offsetY.setValue(gestureState.dy);
  };

  const handlePanEnd = (event: any, gestureState: any) => {
    if (lastScale <= 1) return;
    lastOffsetX.current = gestureState.dx;
    lastOffsetY.current = gestureState.dy;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => lastScale > 1,
      onMoveShouldSetPanResponder: () => lastScale > 1,
      onPanResponderGrant: handlePanStart,
      onPanResponderMove: handlePanMove,
      onPanResponderRelease: handlePanEnd,
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header with SafeArea */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={styles.headerTitle}>Protocolo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <IconSymbol name="xmark.circle.fill" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={handleRotate} style={[styles.controlButton, { backgroundColor: colors.primary + "20" }]}>
            <IconSymbol name="rotate.right.fill" size={20} color={colors.primary} />
            <Text style={[styles.controlText, { color: colors.primary }]}>Rotar</Text>
          </TouchableOpacity>
          <Text style={[styles.zoomHint, { color: colors.muted }]}>Pinch para zoom, arrastra para mover</Text>
        </View>

        {/* Image Container with Zoom and Pan */}
        <View
          style={styles.imageContainer}
          {...panResponder.panHandlers}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => lastScale > 1}
          onResponderMove={handlePinchMove}
          onResponderGrant={handlePinchStart}
        >
          <Animated.Image
            source={{ uri: photoUrl }}
            style={[
              styles.image,
              {
                transform: [
                  { rotate: `${rotation}deg` },
                  { scale: scale },
                  { translateX: offsetX },
                  { translateY: offsetY },
                ],
              },
            ]}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "white",
  },
  closeButton: {
    padding: 8,
  },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
  },
  controlButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  controlText: {
    fontSize: 13,
    fontWeight: "600",
  },
  zoomHint: {
    fontSize: 12,
    marginLeft: "auto",
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  image: {
    width: 300,
    height: 400,
  },
});
