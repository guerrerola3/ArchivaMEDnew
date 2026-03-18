import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { ProcedureForm, ProcedureFormData } from "@/components/procedure-form";
import { useProcedures } from "@/lib/procedures-context";

export default function NewProcedureScreen() {
  const router = useRouter();
  const colors = useColors();
  const { addProcedure } = useProcedures();
  const [isLoading, setIsLoading] = useState(false);

  // Pre-filled data from OCR capture
  const params = useLocalSearchParams<{
    patientName?: string;
    patientRut?: string;
    date?: string;
    prestacionNumber?: string;
    diagnosis?: string;
    procedureName?: string;
    procedureCode?: string;
    type?: string;
    schedule?: string;
    clinic?: string;
    provision?: string;
    notes?: string;
    photoUrl?: string;
  }>();

  const initialData: Partial<ProcedureFormData> = {
    patientName: params.patientName ?? "",
    patientRut: params.patientRut ?? "",
    date: params.date ?? new Date().toISOString(),
    prestacionNumber: params.prestacionNumber ?? "",
    diagnosis: params.diagnosis ?? "",
    procedureName: params.procedureName ?? "",
    procedureCode: params.procedureCode ?? "",
    type: (params.type as any) ?? "cirugia",
    schedule: (params.schedule as any) ?? "habil",
    clinic: params.clinic ?? "",
    provision: (params.provision as any) ?? null,
    notes: params.notes ?? "",
    photoUrl: params.photoUrl,
  };

  const handleSubmit = async (data: ProcedureFormData) => {
    setIsLoading(true);
    try {
      await addProcedure({
        ...data,
        prestacionNumber: data.prestacionNumber || null,
        diagnosis: data.diagnosis || null,
        procedureName: data.procedureName || null,
        procedureCode: data.procedureCode || null,
        notes: data.notes || null,
        photoUrl: data.photoUrl,
      });
      // Redirect to home screen after saving
      router.replace("/(tabs)");
    } catch (e) {
      console.error("Failed to add procedure:", e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nuevo Procedimiento</Text>
        <View style={{ width: 34 }} />
      </View>

      <ProcedureForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Guardar"
        isLoading={isLoading}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
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
});
