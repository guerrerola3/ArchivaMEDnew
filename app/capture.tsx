import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { extractProcedureDataLocally } from "@/lib/local-procedure-extractor";

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
  provision?: string | null;
  notes?: string | null;
  rawText?: string | null;
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
  const [processingNotice, setProcessingNotice] = useState<string | null>(null);
  const [ocrTextPreview, setOcrTextPreview] = useState<string | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const insets = useSafeAreaInsets();
  const [compressionStats, setCompressionStats] = useState<{ original: number; compressed: number } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  // ─── Compress image ─────────────────────────────────────────────
  const compressImage = async (uri: string | null, base64: string): Promise<{ base64: string; uri: string | null }> => {
    try {
      const source = uri ?? `data:image/jpeg;base64,${base64}`;
      const result = await ImageManipulator.manipulateAsync(
        source,
        [{ resize: { width: 1080 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );
      if (result.base64) {
        const originalSize = base64.length;
        const compressedSize = result.base64.length;
        setCompressionStats({ original: originalSize, compressed: compressedSize });
        console.log(`[OCR Compression] ${Math.round(originalSize/1024)}KB → ${Math.round(compressedSize/1024)}KB`);
        return { base64: result.base64, uri: result.uri ?? uri };
      }
      return { base64, uri };
    } catch (e) {
      console.warn("[OCR Compression] Failed:", e);
      return { base64, uri };
    }
  };

  // ─── Take photo ───────────────────────────────────────────────
  const handleTakePhoto = async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8, base64: true });
      if (photo.uri) {
        setCapturedUri(photo.uri);
        setCapturedBase64(photo.base64 ?? null);
        setStep("preview");
      }
    } catch (e) {
      console.error("takePictureAsync error:", e);
      Alert.alert("Error", "No se pudo tomar la foto.");
    }
  };

  // ─── Pick from gallery ───────────────────────────────────────
  const handlePickFromGallery = async () => {
    try {
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
    } catch (e) {
      console.error("launchImageLibraryAsync error:", e);
      Alert.alert("Error", "No se pudo acceder a la galería.");
    }
  };

  // ─── Process OCR ─────────────────────────────────────────────
  const handleProcessOCR = async () => {
    if (!capturedBase64) return;
    setStep("processing");
    setProcessingError(null);
    setProcessingNotice(null);
    setIsExtracting(true);

    try {
      const compressedImage = await compressImage(capturedUri, capturedBase64);
      const result = await extractProcedureDataLocally({
        photoUrl: capturedUri,
        imageUri: compressedImage.uri,
        imageBase64: compressedImage.base64,
      });
      setUploadedPhotoUrl(result.photoUrl ?? capturedUri);
      setExtractedData(result.extractedData as ExtractedData);
      setProcessingNotice(result.warnings.join(" ") || null);
      setOcrTextPreview(result.rawText ?? null);
      setStep("results");
    } catch (e) {
      console.error("Local extraction error:", e);
      setProcessingError("No se pudieron preparar los datos automáticamente.");
      setStep("preview");
    } finally {
      setIsExtracting(false);
    }
  };

  // ─── Confirm and navigate ─────────────────────────────────────
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
        type: ["cirugia", "procedimiento", "interconsulta"].includes(data.type ?? "") ? data.type : "cirugia",
        schedule: ["habil", "inhabil"].includes(data.schedule ?? "") ? data.schedule : "habil",
        clinic: data.clinic ?? "",
        provision: ["fonasa","cruz_blanca","nueva_masvida","consalud","vida_tres","colmena","particular"].includes(data.provision ?? "") ? data.provision : "",
        notes: data.notes ?? "",
      },
    });
  };

  // ─── Render ──────────────────────────────────────────────────
  if (!permission) {
    return <ScreenContainer className="justify-center items-center">
      <Text style={{ color: colors.foreground }}>Solicitando permisos de cámara...</Text>
    </ScreenContainer>;
  }

  if (!permission.granted) {
    return <ScreenContainer className="justify-center items-center gap-4">
      <Text style={{ color: colors.foreground, textAlign: "center" }}>Se necesita acceso a la cámara</Text>
      <TouchableOpacity onPress={requestPermission} style={[styles.button, { backgroundColor: colors.primary }]}>
        <Text style={styles.buttonText}>Permitir acceso</Text>
      </TouchableOpacity>
    </ScreenContainer>;
  }

  // Camera
  if (step === "camera") {
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
          <View style={styles.cameraOverlay}>
            <View style={[styles.cameraHeader, { backgroundColor: "rgba(0,0,0,0.5)", paddingTop: Math.max(insets.top, 12) }]}>
              <TouchableOpacity onPress={() => router.back()}><IconSymbol name="chevron.left" size={24} color="white"/></TouchableOpacity>
              <Text style={styles.cameraHeaderTitle}>Capturar protocolo</Text>
              <TouchableOpacity onPress={() => setFacing(facing==="back"?"front":"back")}><IconSymbol name="arrow.triangle.2.circlepath" size={24} color="white"/></TouchableOpacity>
            </View>

            <View style={styles.guideContainer}>
              <View style={[styles.guideFrame, { borderColor: colors.primary }]} />
              <Text style={styles.guideText}>Alinea el documento dentro del marco</Text>
            </View>

            <View style={[styles.cameraFooter, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
              <TouchableOpacity onPress={handlePickFromGallery} style={[styles.footerButton, { backgroundColor: colors.surface }]}>
                <IconSymbol name="photo.fill" size={24} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleTakePhoto} style={[styles.captureButton, { backgroundColor: colors.primary }]}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              <View style={styles.footerButton} />
            </View>
          </View>
        </CameraView>
      </View>
    );
  }

  // Preview
  if (step === "preview") {
    return (
      <ScreenContainer className="bg-background">
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <TouchableOpacity onPress={() => setStep("camera")}><IconSymbol name="chevron.left" size={24} color="white"/></TouchableOpacity>
          <Text style={styles.headerTitle}>Vista previa</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {capturedUri && <Image source={{ uri: capturedUri }} style={styles.previewImage} />}
          {processingError && <View style={[styles.errorBox, { backgroundColor: colors.error + "20", borderColor: colors.error }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{processingError}</Text>
          </View>}
          <TouchableOpacity onPress={handleProcessOCR} disabled={isExtracting} style={[styles.button, { backgroundColor: colors.primary, opacity: isExtracting?0.6:1 }]}>
            {isExtracting ? <ActivityIndicator color="white"/> : <>
              <IconSymbol name="sparkles" size={18} color="white"/>
              <Text style={styles.buttonText}>Extraer datos</Text>
            </>}
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>{setCapturedUri(null);setCapturedBase64(null);setStep("camera");}} style={[styles.button, { backgroundColor: colors.surface, borderWidth:1, borderColor: colors.border }]}>
            <Text style={[styles.buttonText, { color: colors.foreground }]}>Tomar otra foto</Text>
          </TouchableOpacity>
        </ScrollView>
      </ScreenContainer>
    );
  }

  // Processing
  if (step === "processing") {
    return (
      <ScreenContainer className="justify-center items-center">
        <View style={[styles.processingContainer, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.processingText, { color: colors.foreground }]}>Procesando imagen...</Text>
          {compressionStats && <Text style={[styles.compressionInfo, { color: colors.muted }]}>
            {Math.round((1-compressionStats.compressed/compressionStats.original)*100)}% comprimido
          </Text>}
        </View>
      </ScreenContainer>
    );
  }

  // Results
  return (
    <ScreenContainer className="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => setStep("camera")}><IconSymbol name="chevron.left" size={24} color="white"/></TouchableOpacity>
        <Text style={styles.headerTitle}>Datos extraídos</Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {uploadedPhotoUrl && <Image source={{ uri: uploadedPhotoUrl }} style={styles.resultImage} />}
        {processingNotice && <View style={[styles.errorBox, { backgroundColor: colors.warning + "20", borderColor: colors.warning }]}>
          <Text style={[styles.errorText, { color: colors.warning }]}>{processingNotice}</Text>
        </View>}
        <View style={[styles.dataContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.dataTitle, { color: colors.primary }]}>Datos detectados</Text>
          {extractedData?.patientName && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Paciente:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.patientName}</Text></View>}
          {extractedData?.patientRut && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>RUT:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.patientRut}</Text></View>}
          {extractedData?.date && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Fecha:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{new Date(extractedData.date).toLocaleString("es-CL")}</Text></View>}
          {extractedData?.prestacionNumber && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Prestación:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.prestacionNumber}</Text></View>}
          {extractedData?.diagnosis && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Diagnóstico:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.diagnosis}</Text></View>}
          {extractedData?.procedureName && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Procedimiento:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.procedureName}</Text></View>}
          {extractedData?.clinic && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Clínica:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.clinic}</Text></View>}
          {extractedData?.provision && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Previsión:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.provision}</Text></View>}
          {extractedData?.schedule && <View style={styles.dataRow}><Text style={[styles.dataLabel, { color: colors.muted }]}>Horario:</Text><Text style={[styles.dataValue, { color: colors.foreground }]}>{extractedData.schedule}</Text></View>}
        </View>
        {ocrTextPreview ? (
          <View style={[styles.dataContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.dataTitle, { color: colors.primary }]}>Texto OCR</Text>
            <Text style={[styles.ocrPreviewText, { color: colors.foreground }]} numberOfLines={12}>
              {ocrTextPreview}
            </Text>
          </View>
        ) : null}
        <TouchableOpacity onPress={handleConfirmAndNavigate} style={[styles.button, { backgroundColor: colors.primary }]}>
          <IconSymbol name="checkmark.circle.fill" size={18} color="white"/>
          <Text style={styles.buttonText}>Continuar con formulario</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={()=>setStep("camera")} style={[styles.button, { backgroundColor: colors.surface, borderWidth:1, borderColor: colors.border }]}>
          <Text style={[styles.buttonText, { color: colors.foreground }]}>Capturar otra foto</Text>
        </TouchableOpacity>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  cameraContainer:{flex:1},
  camera:{flex:1},
  cameraOverlay:{flex:1,justifyContent:"space-between"},
  cameraHeader:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16,paddingVertical:12},
  cameraHeaderTitle:{color:"white",fontSize:16,fontWeight:"600"},
  guideContainer:{flex:1,justifyContent:"center",alignItems:"center",gap:12},
  guideFrame:{width:280,height:380,borderWidth:2,borderRadius:8},
  guideText:{color:"white",fontSize:14,textAlign:"center"},
  cameraFooter:{flexDirection:"row",justifyContent:"space-around",alignItems:"center",paddingVertical:20},
  footerButton:{width:50,height:50,borderRadius:25,justifyContent:"center",alignItems:"center"},
  captureButton:{width:70,height:70,borderRadius:35,justifyContent:"center",alignItems:"center"},
  captureButtonInner:{width:60,height:60,borderRadius:30,backgroundColor:"white"},
  header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingHorizontal:16,paddingVertical:12},
  headerTitle:{color:"white",fontSize:16,fontWeight:"600"},
  scrollContent:{paddingHorizontal:16,paddingVertical:16,gap:12,paddingBottom:40},
  previewImage:{width:"100%",height:300,borderRadius:8,marginBottom:12},
  resultImage:{width:"100%",height:250,borderRadius:8,marginBottom:12},
  errorBox:{borderWidth:1,borderRadius:8,padding:12,marginBottom:12},
  errorText:{fontSize:14,fontWeight:"500"},
  button:{flexDirection:"row",alignItems:"center",justifyContent:"center",gap:8,borderRadius:8,paddingVertical:12,paddingHorizontal:16},
  buttonText:{color:"white",fontSize:14,fontWeight:"600"},
  processingContainer:{borderRadius:12,padding:24,alignItems:"center",gap:12},
  processingText:{fontSize:16,fontWeight:"500"},
  compressionInfo:{fontSize:12,fontStyle:"italic"},
  dataContainer:{borderRadius:12,borderWidth:1,padding:16,gap:12,marginBottom:12},
  dataTitle:{fontSize:14,fontWeight:"600",marginBottom:8},
  dataRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingVertical:8},
  dataLabel:{fontSize:12,fontWeight:"500"},
  dataValue:{fontSize:12,fontWeight:"600",flex:1,textAlign:"right"},
  ocrPreviewText:{fontSize:12,lineHeight:18},
});
