import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import TextRecognition from "@react-native-ml-kit/text-recognition";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { compressImageForOCR } from "@/lib/image-compression";
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

export default function CaptureScreen() {
  const router = useRouter();
  const colors = useColors();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [step, setStep] = useState<CaptureStep>("camera");
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [capturedBase64, setCapturedBase64] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [localOcrText, setLocalOcrText] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const insets = useSafeAreaInsets();
  const [compressionStats, setCompressionStats] = useState<{
    original: number;
    compressed: number;
  } | null>(null);

  const extractMutation = trpc.procedures.extractFromPhoto.useMutation();

  // ─── Compress image for faster OCR ─────────────────────────────────────────

  const compressImage = async (base64: string): Promise<string> => {
    try {
      const originalSize = base64.length;
      const compressedBase64 = await compressImageForOCR(base64);
      const compressedSize = compressedBase64.length;

      setCompressionStats({
        original: originalSize,
        compressed: compressedSize,
      });

      return compressedBase64;
    } catch (e) {
      console.warn("[OCR Compression] Failed:", e);
      return base64;
    }
  };

  // ─── Take photo with camera (base64 included directly) ─────────────────────
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
        exif: false,
        skipProcessing: false,
      });
      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setCapturedBase64(photo.base64 ?? null);
        setStep("preview");
      }
    } catch (e) {
      console.error("takePictureAsync error:", e);
      Alert.alert("Error", "No se pudo tomar la foto. Intente nuevamente.");
    }
  };

  // ─── Pick from gallery (base64 included directly) ──────────────────────────
  const handlePickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
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
    } catch (e) {
      console.error("launchImageLibraryAsync error:", e);
      Alert.alert("Error", "No se pudo acceder a la galería.");
    }
  };

  // ─── Local OCR Processing ───────────────────────────────────────────────────
  const performLocalOcr = async (imageUri: string): Promise<string | null> => {
    try {
      const result = await TextRecognition.recognize(imageUri);
      const extractedText = result.textBlocks.map(block => block.text).join('\n');
      console.log("[Local OCR] Extracted text:", extractedText);
      setLocalOcrText(extractedText);
      return extractedText;
    } catch (e) {
      console.error("[Local OCR] Failed:", e);
      setLocalOcrText("Error al realizar OCR local.");
      return null;
    }
  };

  // ─── Process OCR ────────────────────────────────────────────────────────────
  const handleProcessOCR = async () => {
    console.log("📸 CLICK OCR");

    if (!capturedBase64) {
      Alert.alert(
        "Sin imagen",
        "No se encontró el dato de la imagen. Por favor tome o seleccione una foto nuevamente."
      );
      return;
    }

    console.log("🚀 CALLING BACKEND");
    
    setStep("processing");
    setProcessingError(null);

    try {
      // Compress image before sending to OCR for faster processing
      console.log("[OCR] Starting image compression...");
      const compressedBase64 = await compressImage(capturedBase64);

      console.log("[OCR] Performing local OCR...");
      const ocrText = await performLocalOcr(capturedUri!);

      console.log("[OCR] Sending compressed image and local OCR text to LLM...");
      const result = await extractMutation.mutateAsync({
        imageBase64: compressedBase64,
        mimeType: "image/jpeg",
        localOcrText: ocrText, // Enviar el texto OCR local al backend
      });

      setUploadedPhotoUrl(result.photoUrl ?? capturedUri);
      setExtractedData(result.extractedData as ExtractedData);
      setStep("results");
    } catch (e: any) {
      console.error("OCR mutation error:", e);
      const msg =
        e?.message?.includes("LLM") || e?.message?.includes("Storage")
          ? "Error al procesar la imagen en el servidor. Verifique su conexión e intente nuevamente."
          : "No se pudieron extraer los datos automáticamente. Puede ingresar los datos manualmente.";
      setProcessingError(msg);
      setStep("preview");
    }
  };

  // ─── Navigate to form with extracted data ──────────────────────────────────
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

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (step === "camera") {
    if (!permission) {
      return (
        <ScreenContainer className="justify-center items-center">
          <Text style={{ color: colors.foreground }}>Solicitando permisos de cámara...</Text>
        </ScreenContainer>
      );
    }

    if (!permission.granted) {
      return (
        <ScreenContainer className="justify-center items-center gap-4">
          <Text style={{ color: colors.foreground, textAlign: "center" }}>
            Se necesita acceso a la cámara para capturar fotos
          </Text>
          <TouchableOpacity
            onPress={requestPermission}
            style={[styles.button, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.buttonText}>Permitir acceso</Text>
          </TouchableOpacity>
        </ScreenContainer>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            {/* Header */}
            <View style={[styles.cameraHeader, { backgroundColor: "rgba(0,0,0,0.5)", paddingTop: Math.max(insets.top, 12) }]}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconSymbol name="chevron.left" size={24} color="white" />
              </TouchableOpacity>
              <Text style={styles.cameraHeaderTitle}>Capturar protocolo</Text>
              <TouchableOpacity onPress={() => setFacing(facing === "back" ? "front" : "back")} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <IconSymbol name="arrow.triangle.2.circlepath" size={24} color="white" />
              </TouchableOpacity>
            </View>

            {/* Guide frame */}
            <View style={styles.guideContainer}>
              <View style={[styles.guideFrame, { borderColor: colors.primary }]} />
              <Text style={styles.guideText}>Alinea el documento dentro del marco</Text>
            </View>

            {/* Bottom buttons */}
            <View style={[styles.cameraFooter, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <TouchableOpacity
                onPress={handlePickFromGallery}
                style={[styles.footerButton, { backgroundColor: colors.surface }]}
              >
                <IconSymbol name="photo.fill" size={24} color={colors.primary} />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTakePhoto}
                style={[styles.captureButton, { backgroundColor: colors.primary }]}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>

              <View style={styles.footerButton} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  if (step === "preview") {
    return (
      <ScreenContainer className="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => setStep("camera")}>
            <IconSymbol name="chevron.left" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vista previa</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {capturedUri && (
            <Image source={{ uri: capturedUri }} style={styles.previewImage} />
          )}

          {processingError && (
            <View style={[styles.errorBox, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
              <Text style={[styles.errorText, { color: colors.error }]}>{processingError}</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={handleProcessOCR}
            disabled={extractMutation.isPending}
            style={[
              styles.button,
              { backgroundColor: colors.primary, opacity: extractMutation.isPending ? 0.6 : 1 },
            ]}
          >
            {extractMutation.isPending ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <IconSymbol name="sparkles" size={18} color="white" />
                <Text style={styles.buttonText}>Extraer datos</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
          onPress={() => {
            (router as any).push({
              pathname: "/procedure/new",
              params: {
              photoUrl: capturedUri ?? "",
              patientName: "",
              patientRut: "",
              date: new Date().toISOString(),
              prestacionNumber: "",
              diagnosis: "",
              procedureName: "",
              procedureCode: "",
              type: "cirugia",
              schedule: "habil",
              clinic: "",
              notes: "",
            },
          });
        }}
        style={[
          styles.button,
          {
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
>
  <Text style={[styles.buttonText, { color: colors.foreground }]}>
    Ingresar datos manualmente
  </Text>
</TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setCapturedUri(null);
              setCapturedBase64(null);
              setStep("camera");
            }}
            style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
          >
            <Text style={[styles.buttonText, { color: colors.foreground }]}>Tomar otra foto</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  if (step === "processing") {
    return (
      <ScreenContainer className="justify-center items-center">
        <View style={[styles.processingContainer, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.foreground }]}>
            Procesando imagen...
          </Text>
          {compressionStats && (
            <Text style={[styles.compressionInfo, { color: colors.muted }]}>
              {(
                ((1 - compressionStats.compressed / compressionStats.original) * 100)
              ).toFixed(0)}
              % comprimido
            </Text>
          )}
        </View>
      </ScreenContainer>
    );
  }

  // Results step
  return (
    <ScreenContainer className="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => setStep("camera")}>
          <IconSymbol name="chevron.left" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Datos extraídos</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {uploadedPhotoUrl && (
          <Image source={{ uri: uploadedPhotoUrl }} style={styles.resultImage} />
        )}

        <View style={[styles.dataContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.dataTitle, { color: colors.primary }]}>Datos detectados</Text>

          {extractedData?.patientName && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>Paciente:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.patientName}</Text>
            </View>
          )}
          {extractedData?.patientRut && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>RUT:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.patientRut}</Text>
            </View>
          )}
          {extractedData?.prestacionNumber && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>Prestación:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.prestacionNumber}</Text>
            </View>
          )}
          {extractedData?.diagnosis && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>Diagnóstico:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.diagnosis}</Text>
            </View>
          )}
          {extractedData?.procedureName && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>Procedimiento:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.procedureName}</Text>
            </View>
          )}
          {extractedData?.clinic && (
            <View style={styles.dataRow}>
              <Text style={[styles.dataLabel, { color: colors.muted }]}>Clínica:</Text>
              <Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.clinic}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={handleConfirmAndNavigate}
          style={[styles.button, { backgroundColor: colors.primary }]}
        >
          <IconSymbol name="checkmark.circle.fill" size={18} color="white" />
          <Text style={styles.buttonText}>Continuar con formulario</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setStep("camera")}
          style={[styles.button, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}
        >
          <Text style={[styles.buttonText, { color: colors.foreground }]}>Capturar otra foto</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  cameraHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cameraHeaderTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  guideContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  guideFrame: {
    width: 280,
    height: 380,
    borderWidth: 2,
    borderRadius: 8,
  },
  guideText: {
    color: "white",
    fontSize: 14,
    textAlign: "center",
  },
  cameraFooter: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 20,
  },
  footerButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    paddingBottom: 40,
  },
  previewImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  resultImage: {
    width: "100%",
    height: 250,
    borderRadius: 8,
    marginBottom: 12,
  },
  errorBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    fontWeight: "500",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  processingContainer: {
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  compressionInfo: {
    fontSize: 12,
    fontStyle: "italic",
  },
  dataContainer: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    marginBottom: 12,
  },
  dataTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  dataLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  dataValue: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
});
