import { Modal, StyleSheet, TouchableOpacity, View, Text, Animated, PanResponder } from "react-native";
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
  const [offsetX] = useState(new Animated.Value(0));
  const [offsetY] = useState(new Animated.Value(0));

  const scaleRef = useRef(1);
  const offsetXRef = useRef(0);
  const offsetYRef = useRef(0);
  const pinchStartDistanceRef = useRef(0);
  const pinchStartScaleRef = useRef(1);
  const lastPanXRef = useRef(0);
  const lastPanYRef = useRef(0);

  if (!photoUrl) return null;

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

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
          // Pan when zoomed - single finger drag
          const currentX = touches[0].pageX;
          const currentY = touches[0].pageY;

          const deltaX = currentX - lastPanXRef.current;
          const deltaY = currentY - lastPanYRef.current;

          offsetXRef.current += deltaX;
          offsetYRef.current += deltaY;

          offsetX.setValue(offsetXRef.current);
          offsetY.setValue(offsetYRef.current);

          lastPanXRef.current = currentX;
          lastPanYRef.current = currentY;
        }
      },
      onPanResponderRelease: () => {
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
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: Math.max(insets.top, 12) }]}>
          <Text style={styles.headerTitle}>Protocolo</Text>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <IconSymbol name="xmark.circle.fill" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Controls */}
        <View style={[styles.controls, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            onPress={handleRotate}
            style={[styles.controlButton, { backgroundColor: colors.primary + "20" }]}
          >
            <IconSymbol name="rotate.right.fill" size={20} color={colors.primary} />
            <Text style={[styles.controlText, { color: colors.primary }]}>Rotar</Text>
          </TouchableOpacity>
        </View>

        {/* Image Container */}
        <View style={styles.imageContainer} {...panResponder.panHandlers}>
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
    width: "100%",
    height: "100%",
  },
});
