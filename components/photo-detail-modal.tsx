import { Modal, StyleSheet, TouchableOpacity, View, Image, Text, ScrollView, Animated } from "react-native";
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
  const pinchStartDistance = useRef(0);

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
      const clampedScale = Math.max(1, Math.min(scaleValue, 3));
      scale.setValue(clampedScale);
    }
  };

  const handlePinchEnd = () => {
    setLastScale(Math.max(1, Math.min(lastScale, 3)));
  };

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
          <Text style={[styles.zoomHint, { color: colors.muted }]}>Pinch para zoom</Text>
        </View>

        {/* Image Container with Zoom */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          scrollEnabled={lastScale > 1}
        >
          <View
            style={styles.imageWrapper}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => lastScale > 1}
            onResponderMove={handlePinchMove}
            onResponderGrant={handlePinchStart}
            onResponderRelease={handlePinchEnd}
          >
            <Animated.Image
              source={{ uri: photoUrl }}
              style={[
                styles.image,
                {
                  transform: [
                    { rotate: `${rotation}deg` },
                    { scale: scale },
                  ],
                },
              ]}
              resizeMode="contain"
            />
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  imageWrapper: {
    width: "100%",
    aspectRatio: 0.75,
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
