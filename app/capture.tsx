import { CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";

type CaptureStep = "camera" | "preview" | "processing" | "results";

interface ExtractedData {
  patientName?: string | null;
  patientRut?: string | null;
  date?: string | null;
  prestacionNumber?: string | null;
  diagnosis?: string | null;
  procedureName?: string | null;
  procedureCode?: string | null;
  type?: string | null;
  schedule?: string | null;
  clinic?: string | null;
  notes?: string | null;
}

/**
 * Reads a file URI and returns its base64 content.
 * Handles both ph:// (iOS Photos) and file:// URIs.
 */
async function readImageAsBase64(uri: string): Promise<string> {
  // On iOS, ph:// URIs from the media library cannot be read directly.
  // We must copy them to a temp location first.
  if (Platform.OS === "ios" && uri.startsWith("ph://")) {
    const tempUri = FileSystem.cacheDirectory + `ocr_temp_${Date.now()}.jpg`;
    await FileSystem.copyAsync({ from: uri, to: tempUri });
    const base64 = await FileSystem.readAsStringAsync(tempUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    // Clean up temp file (fire and forget)
    FileSystem.deleteAsync(tempUri, { idempotent: true }).catch(() => {});
    return base64;
  }

  // For file:// URIs (camera captures and most gallery picks)
  const base64 = await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return base64;
}

export default function CaptureScreen() {
  const router = useRouter();
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [step, setStep] = useState<CaptureStep>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");

  const extractMutation = trpc.procedures.extractFromPhoto.useMutation();

  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false, // We'll read base64 via FileSystem for reliability
        exif: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setStep("preview");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo tomar la foto. Intente nuevamente.");
    }
  };

  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        base64: false, // We'll read base64 via FileSystem
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        setCapturedUri(asset.uri);
        setStep("preview");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo acceder a la galería.");
    }
  };

  const handleProcessOCR = async () => {
    if (!capturedUri) return;

    setStep("processing");
    setProcessingError(null);

    try {
      // Step 1: Read image as base64 using FileSystem (handles ph:// on iOS)
      let base64: string;
      try {
        base64 = await readImageAsBase64(capturedUri);
      } catch (readErr) {
        console.error("Failed to read image as base64:", readErr);
        throw new Error("No se pudo leer la imagen. Intente con otra foto.");
      }

      if (!base64 || base64.length < 100) {
        throw new Error("La imagen está vacía o es inválida.");
      }

      // Step 2: Send to server for OCR processing
      const result = await extractMutation.mutateAsync({
        imageBase64: base64,
        mimeType: "image/jpeg",
      });

      setUploadedPhotoUrl(result.photoUrl ?? capturedUri);
      setExtractedData(result.extractedData as ExtractedData);
      setStep("results");
    } catch (e: any) {
      console.error("OCR processing error:", e);
      const errorMsg =
        e?.message?.includes("No se pudo")
          ? e.message
          : "No se pudieron extraer los datos automáticamente. Puede ingresar los datos manualmente.";
      setProcessingError(errorMsg);
      setStep("preview");
    }
  };

  const handleConfirmAndNavigate = () => {
    const data = extractedData ?? {};
    (router as any).push({
      pathname: "/procedure/new",
      params: {
        photoUrl: uploadedPhotoUrl ?? capturedUri ?? "",
        patientName: data.patientName ?? "",
        patientRut: data.patientRut ?? "",
        date: data.date ?? new Date().toISOString(),
        prestacionNumber: data.prestacionNumber ?? "",
        diagnosis: data.diagnosis ?? "",
        procedureName: data.procedureName ?? "",
        procedureCode: data.procedureCode ?? "",
        type: ["cirugia", "procedimiento", "interconsulta"].includes(data.type ?? "")
          ? data.type
          : "cirugia",
        schedule: ["habil", "inhabil"].includes(data.schedule ?? "") ? data.schedule : "habil",
        clinic: data.clinic ?? "",
        notes: data.notes ?? "",
      },
    });
  };

  const handleManualEntry = () => {
    (router as any).push({
      pathname: "/procedure/new",
      params: { photoUrl: capturedUri ?? "" },
    });
  };

  const handleRetake = () => {
    setCapturedUri(null);
    setExtractedData(null);
    setUploadedPhotoUrl(null);
    setProcessingError(null);
    setStep("camera");
  };

  // ─── Permission handling ───────────────────────────────────────────────────
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
            Para fotografiar protocolos operatorios y extraer datos automáticamente, necesitamos
            acceso a tu cámara.
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.actionButtonText}>Permitir acceso a cámara</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePickFromGallery}
            style={[styles.outlineButton, { borderColor: colors.primary }]}
          >
            <Text style={[styles.outlineButtonText, { color: colors.primary }]}>
              Seleccionar desde galería
            </Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Processing step ───────────────────────────────────────────────────────
  if (step === "processing") {
    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={{ width: 34 }} />
          <Text style={styles.headerTitle}>Procesando con IA...</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.processingContainer}>
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              style={styles.processingImage}
              resizeMode="contain"
            />
          )}
          <View
            style={[
              styles.processingOverlay,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.processingTitle, { color: colors.foreground }]}>
              Extrayendo datos con IA...
            </Text>
            <Text style={[styles.processingText, { color: colors.muted }]}>
              Analizando el protocolo operatorio. Esto puede tomar unos segundos.
            </Text>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // ─── Results step ──────────────────────────────────────────────────────────
  if (step === "results" && extractedData) {
    const fields: { label: string; value: string | null | undefined }[] = [
      { label: "Nombre del Paciente", value: extractedData.patientName },
      { label: "RUT", value: extractedData.patientRut },
      { label: "Fecha", value: extractedData.date ? new Date(extractedData.date).toLocaleDateString("es-CL") : null },
      { label: "N° Prestación", value: extractedData.prestacionNumber },
      { label: "Diagnóstico", value: extractedData.diagnosis },
      { label: "Procedimiento", value: extractedData.procedureName },
      { label: "Código", value: extractedData.procedureCode },
      { label: "Tipo", value: extractedData.type },
      { label: "Horario", value: extractedData.schedule },
      { label: "Clínica", value: extractedData.clinic },
    ];

    const detectedCount = fields.filter((f) => f.value && f.value !== "null").length;

    return (
      <ScreenContainer containerClassName="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={handleRetake} style={styles.backButton}>
            <IconSymbol name="arrow.left" size={22} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Datos Extraídos</Text>
          <View style={{ width: 34 }} />
        </View>

        <ScrollView contentContainerStyle={styles.resultsContent}>
          {/* Success banner */}
          <View style={[styles.successBanner, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
            <IconSymbol name="checkmark.circle.fill" size={20} color={colors.success} />
            <Text style={[styles.successText, { color: colors.success }]}>
              {detectedCount} campo{detectedCount !== 1 ? "s" : ""} detectado{detectedCount !== 1 ? "s" : ""} automáticamente
            </Text>
          </View>

          {/* Preview image */}
          {capturedUri && (
            <Image
              source={{ uri: capturedUri }}
              style={[styles.resultImage, { borderColor: colors.border }]}
              resizeMode="cover"
            />
          )}

          {/* Extracted fields */}
          <View style={[styles.fieldsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.fieldsTitle, { color: colors.foreground }]}>
              Revise los datos extraídos
            </Text>
            <Text style={[styles.fieldsSubtitle, { color: colors.muted }]}>
              Podrá editar cualquier campo en el formulario siguiente.
            </Text>
            {fields.map((field) => (
              <View
                key={field.label}
                style={[styles.fieldRow, { borderBottomColor: colors.border }]}
              >
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>{field.label}</Text>
                <Text
                  style={[
                    styles.fieldValue,
                    {
                      color:
                        field.value && field.value !== "null"
                          ? colors.foreground
                          : colors.muted,
                    },
                  ]}
                >
                  {field.value && field.value !== "null" ? field.value : "No detectado"}
                </Text>
              </View>
            ))}
          </View>

          {/* Actions */}
          <TouchableOpacity
            onPress={handleConfirmAndNavigate}
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
          >
            <IconSymbol name="pencil" size={18} color="white" />
            <Text style={styles.actionButtonText}>Confirmar y editar en formulario</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRetake}
            style={[styles.outlineButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.outlineButtonText, { color: colors.muted }]}>
              Tomar otra foto
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // ─── Preview step ──────────────────────────────────────────────────────────
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

          <View
            style={[
              styles.previewActions,
              { backgroundColor: colors.surface, borderTopColor: colors.border },
            ]}
          >
            {processingError && (
              <View
                style={[
                  styles.errorBanner,
                  { backgroundColor: colors.error + "15", borderColor: colors.error + "40" },
                ]}
              >
                <IconSymbol name="exclamationmark.triangle.fill" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{processingError}</Text>
              </View>
            )}

            <Text style={[styles.previewHint, { color: colors.muted }]}>
              ¿La imagen es legible? Extrae los datos automáticamente o ingresa manualmente.
            </Text>

            <TouchableOpacity
              onPress={handleProcessOCR}
              style={[styles.actionButton, { backgroundColor: colors.primary }]}
            >
              <IconSymbol name="waveform.path.ecg" size={20} color="white" />
              <Text style={styles.actionButtonText}>Extraer datos con IA</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleManualEntry}
              style={[styles.outlineButton, { borderColor: colors.primary }]}
            >
              <IconSymbol name="pencil" size={18} color={colors.primary} />
              <Text style={[styles.outlineButtonText, { color: colors.primary }]}>
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

  // ─── Camera step ───────────────────────────────────────────────────────────
  return (
    <View style={styles.cameraContainer}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
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
        <View style={styles.cameraGuide}>
          <View style={styles.guideFrame}>
            <View style={[styles.guideCorner, styles.guideCornerTL]} />
            <View style={[styles.guideCorner, styles.guideCornerTR]} />
            <View style={[styles.guideCorner, styles.guideCornerBL]} />
            <View style={[styles.guideCorner, styles.guideCornerBR]} />
          </View>
          <Text style={styles.guideText}>
            Encuadre el protocolo operatorio o ficha clínica
          </Text>
        </View>

        {/* Bottom controls */}
        <View style={styles.cameraControls}>
          <TouchableOpacity onPress={handlePickFromGallery} style={styles.galleryButton}>
            <IconSymbol name="photo.fill" size={26} color="white" />
            <Text style={styles.galleryButtonText}>Galería</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleTakePhoto} style={styles.shutterButton}>
            <View style={styles.shutterInner} />
          </TouchableOpacity>

          <View style={{ width: 64 }} />
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "600", color: "white" },
  backButton: { padding: 4 },

  // Permission screen
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  permissionText: { fontSize: 14, textAlign: "center", lineHeight: 20 },

  // Buttons
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
  },
  actionButtonText: { color: "white", fontWeight: "700", fontSize: 15 },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    width: "100%",
  },
  outlineButtonText: { fontWeight: "600", fontSize: 14 },

  // Processing
  processingContainer: { flex: 1, position: "relative" },
  processingImage: { flex: 1, opacity: 0.35 },
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
    borderTopWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  processingTitle: { fontSize: 18, fontWeight: "700" },
  processingText: { fontSize: 13, textAlign: "center", lineHeight: 18 },

  // Preview
  previewContainer: { flex: 1 },
  previewImage: { flex: 1 },
  previewActions: {
    padding: 20,
    gap: 10,
    borderTopWidth: 1,
  },
  previewHint: { fontSize: 13, textAlign: "center", lineHeight: 18, marginBottom: 4 },
  retakeButton: { alignItems: "center", paddingVertical: 8 },
  retakeButtonText: { fontSize: 14 },

  // Error / Success banners
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { fontSize: 13, flex: 1, lineHeight: 18 },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 4,
  },
  successText: { fontSize: 14, fontWeight: "600" },

  // Results
  resultsContent: { padding: 16, gap: 14, paddingBottom: 40 },
  resultImage: {
    width: "100%",
    height: 160,
    borderRadius: 10,
    borderWidth: 1,
  },
  fieldsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 0,
  },
  fieldsTitle: { fontSize: 15, fontWeight: "600", marginBottom: 4 },
  fieldsSubtitle: { fontSize: 12, marginBottom: 12, lineHeight: 16 },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  fieldLabel: { fontSize: 12, flex: 1, lineHeight: 16 },
  fieldValue: { fontSize: 13, fontWeight: "500", flex: 2, textAlign: "right", lineHeight: 18 },

  // Camera
  cameraContainer: { flex: 1, backgroundColor: "#000" },
  camera: { flex: 1 },
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
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraHeaderTitle: { color: "white", fontSize: 16, fontWeight: "600" },
  cameraGuide: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  guideFrame: {
    width: "90%",
    aspectRatio: 0.75,
    position: "relative",
  },
  guideCorner: {
    position: "absolute",
    width: 24,
    height: 24,
    borderColor: "rgba(255,255,255,0.8)",
  },
  guideCornerTL: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 },
  guideCornerTR: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 },
  guideCornerBL: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 },
  guideCornerBR: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 },
  guideText: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    textAlign: "center",
    marginTop: 16,
    backgroundColor: "rgba(0,0,0,0.3)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 24,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  galleryButton: { alignItems: "center", gap: 4, width: 64 },
  galleryButtonText: { color: "white", fontSize: 11 },
  shutterButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "white",
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "white",
  },
});
