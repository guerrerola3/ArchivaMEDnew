import { Modal, StyleSheet, TouchableOpacity, View, Image, Text } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";

interface PhotoDetailModalProps {
  visible: boolean;
  photoUrl: string | null | undefined;
  onClose: () => void;
}

export function PhotoDetailModal({ visible, photoUrl, onClose }: PhotoDetailModalProps) {
  const colors = useColors();

  if (!photoUrl) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background + "E6" }]}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <Text style={styles.headerTitle}>Protocolo</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol name="xmark.circle.fill" size={28} color="white" />
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: photoUrl }}
            style={styles.image}
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
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingTop: 20,
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
    padding: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
