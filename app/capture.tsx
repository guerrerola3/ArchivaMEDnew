import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/use-auth";

type CaptureStep = "camera" | "preview" | "processing";

export default function CaptureScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<CaptureStep>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const extractMutation = trpc.procedures.extractFromPhoto.useMutation();

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
      });
      if (photo) {
        setCapturedUri(photo.uri);
        setCapturedBase64(photo.base64 ?? null);
        setStep("preview");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo tomar la foto");
    }
  };

  const handlePickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setCapturedUri(asset.uri);
      setCapturedBase64(asset.base64 ?? null);
      setStep("preview");
    }
  };

  const handleProcessOCR = async () => {
    if (!capturedBase64) return;

    if (!isAuthenticated) {
      // If not authenticated, go directly to new procedure form without OCR
      (router as any).push({
        pathname: "/procedure/new",
        params: { photoUrl: capturedUri },
      });
      return;
    }

    setStep("processing");
    try {
      const result = await extractMutation.mutateAsync({
        imageBase64: capturedBase64,
        mimeType: "image/jpeg",
      });

      const { extractedData, photoUrl } = result;

      // Navigate to new procedure form with pre-filled data
      (router as any).push({
        pathname: "/procedure/new",
        params: {
          photoUrl: photoUrl ?? capturedUri,
          patientName: extractedData.patientName ?? "",
          patientRut: extractedData.patientRut ?? "",
          date: extractedData.date ?? new Date().toISOString(),
          prestacionNumber: extractedData.prestacionNumber ?? "",
          diagnosis: extractedData.diagnosis ?? "",
          procedureName: extractedData.procedureName ?? "",
          procedureCode: extractedData.procedureCode ?? "",
          type: extractedData.type ?? "cirugia",
          schedule: extractedData.schedule ?? "habil",
          clinic: extractedData.clinic ?? "",
          notes: extractedData.notes ?? "",
        },
      });
    } catch (e) {
      console.error("OCR failed:", e);
      Alert.alert(
        "Error en OCR",
        "No se pudieron extraer los datos automáticamente. Puede ingresar los datos manualmente.",
        [
          {
            text: "Ingresar manualmente",
            onPress: () => {
              (router as any).push({
                pathname: "/procedure/new",
                params: { photoUrl: capturedUri },
              });
            },
          },
          { text: "Reintentar", onPress: () => setStep("preview") },
        ]
      );
    }
  };

  const handleManualEntry = () => {
    (router as any).push({
      pathname: "/procedure/new",
      params: { photoUrl: capturedUri },
    });
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setCapturedBase64(null);
    setStep("camera");
  };

  // Permission handling
  if (!permission) {
    return (
      <ScreenContainer>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </ScreenContainer>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <IconSymbol name="arrow.left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Capturar Protocolo</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.permissionContainer}>
          <IconSymbol name="camera.fill" size={64} color={colors.muted} />
          <Text style={[styles.permissionTitle, { color: colors.foreground }]}>
            Permiso de cámara requerido
          </Text>
          <Text style={[styles.permissionText, { color: colors.muted }]}>
            Para fotografiar protocolos operatorios y extraer datos automáticamente, necesitamos acceso a tu cámara.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.permissionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.permissionButtonText}>Permitir acceso a cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePickFromGallery}
            style={[styles.galleryButton, { borderColor: colors.primary }]}
          >
            <Text style={[styles.galleryButtonText, { color: colors.primary }]}>
              Seleccionar desde galería
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // Processing step
  if (step === "processing") {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={{ width: 34 }} />
          <Text style={styles.headerTitle}>Procesando...</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.processingContainer}>
          {capturedUri && (
            <Image source={{ uri: capturedUri }} style={styles.processingImage} resizeMode="contain" />
          )}
          <View style={[styles.processingOverlay, { backgroundColor: colors.surface }]}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingTitle, { color: colors.foreground }]}>
              Extrayendo datos con IA...
            </Text>
            <Text style={[styles.processingText, { color: colors.muted }]}>
              Analizando el protocolo operatorio para extraer automáticamente los datos del paciente y procedimiento.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Preview step
  if (step === "preview" && capturedUri) {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
            <IconSymbol name="arrow.left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vista previa</Text>
          <View style={{ width: 34 }} />
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="contain" />

          <View style={[styles.previewActions, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
            <Text style={[styles.previewHint, { color: colors.muted }]}>
              ¿La imagen es legible? Extrae los datos automáticamente o ingresa manualmente.
            </Text>

            <TouchableOpacity
              onPress={handleProcessOCR}
              style={[styles.ocrButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="waveform.path.ecg" size={20} color="white" />
              <Text style={styles.ocrButtonText}>
                {isAuthenticated ? "Extraer datos con IA" : "Continuar"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleManualEntry}
              style={[styles.manualButton, { borderColor: colors.border }]}
            >
              <IconSymbol name="pencil" size={18} color={colors.primary} />
              <Text style={[styles.manualButtonText, { color: colors.primary }]}>
                Ingresar datos manualmente
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleRetake} style={styles.retakeButton}>
              <Text style={[styles.retakeButtonText, { color: colors.muted }]}>
                Tomar otra foto
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // Camera step
  return (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      >
        {/* Header overlay */}
        <View style={styles.cameraHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cameraHeaderButton}>
            <IconSymbol name="xmark" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.cameraHeaderTitle}>Fotografiar Protocolo</Text>
          <TouchableOpacity
            onPress={() => setFacing((f) => (f === "back" ? "front" : "back"))}
            style={styles.cameraHeaderButton}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Guide overlay */}
        <View style={styles.guideOverlay}>
          <View style={[styles.guideFrame, { borderColor: "rgba(255,255,255,0.6)" }]}>
            <View style={[styles.guideCorner, styles.guideCornerTL]} />
            <View style={[styles.guideCorner, styles.guideCornerTR]} />
            <View style={[styles.guideCorner, styles.guideCornerBL]} />
            <View style={[styles.guideCorner, styles.guideCornerBR]} />
          </View>
          <Text style={styles.guideText}>Centra el protocolo dentro del marco</Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryPickButton}>
            <IconSymbol name="photo.fill" size={28} color="white" />
            <Text style={styles.galleryPickText}>Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTakePhoto} style={styles.captureButton}>
            <View style={styles.captureButtonInner} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => (router as any).push("/procedure/new")}
            style={styles.manualPickButton}
          >
            <IconSymbol name="pencil" size={28} color="white" />
            <Text style={styles.galleryPickText}>Manual</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "white",
    flex: 1,
  },
  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  permissionButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  galleryButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    width: "100%",
    alignItems: "center",
  },
  galleryButtonText: {
    fontWeight: "600",
    fontSize: 15,
  },
  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  cameraHeaderButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraHeaderTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  guideOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guideFrame: {
    width: "85%",
    aspectRatio: 0.75,
    borderWidth: 2,
    borderRadius: 4,
    position: "relative",
  },
  guideCorner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: "white",
    borderWidth: 3,
  },
  guideCornerTL: { top: -2, left: -2, borderRightWidth: 0, borderBottomWidth: 0 },
  guideCornerTR: { top: -2, right: -2, borderLeftWidth: 0, borderBottomWidth: 0 },
  guideCornerBL: { bottom: -2, left: -2, borderRightWidth: 0, borderTopWidth: 0 },
  guideCornerBR: { bottom: -2, right: -2, borderLeftWidth: 0, borderTopWidth: 0 },
  guideText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    marginTop: 16,
    textAlign: "center",
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingBottom: 50,
    paddingTop: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  galleryPickButton: {
    alignItems: "center",
    gap: 4,
  },
  galleryPickText: {
    color: "white",
    fontSize: 11,
    fontWeight: "500",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
  },
  manualPickButton: {
    alignItems: "center",
    gap: 4,
  },
  // Preview
  previewContainer: {
    flex: 1,
  },
  previewImage: {
    flex: 1,
    backgroundColor: "black",
  },
  previewActions: {
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
  },
  previewHint: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 4,
  },
  ocrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  ocrButtonText: {
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  manualButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  manualButtonText: {
    fontWeight: "600",
    fontSize: 14,
  },
  retakeButton: {
    alignItems: "center",
    paddingVertical: 8,
  },
  retakeButtonText: {
    fontSize: 14,
  },
  // Processing
  processingContainer: {
    flex: 1,
    position: "relative",
  },
  processingImage: {
    flex: 1,
    opacity: 0.4,
  },
  processingOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 32,
    alignItems: "center",
    gap: 12,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  processingTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  processingText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
