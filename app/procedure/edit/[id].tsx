import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { ProcedureForm, ProcedureFormData } from "@/components/procedure-form";
import { useProcedures } from "@/lib/procedures-context";

export default function EditProcedureScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { procedures, updateProcedure } = useProcedures();
  const [isLoading, setIsLoading] = useState(false);

  const procedure = procedures.find((p) => p.localId === id);

  if (!procedure) {
    return (
      <ScreenContainer>
        <View style={styles.notFound}>
          <Text style={[styles.notFoundText, { color: colors.muted }]}>Procedimiento no encontrado</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backLink, { color: colors.primary }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    );
  }

  const initialData: ProcedureFormData = {
    patientName: procedure.patientName,
    patientRut: procedure.patientRut,
    date: procedure.date,
    prestacionNumber: procedure.prestacionNumber ?? "",
    diagnosis: procedure.diagnosis ?? "",
    procedureName: procedure.procedureName ?? "",
    procedureCode: procedure.procedureCode ?? "",
    type: procedure.type,
    schedule: procedure.schedule,
    clinic: procedure.clinic,
    notes: procedure.notes ?? "",
    photoUrl: procedure.photoUrl,
  };

  const handleSubmit = async (data: ProcedureFormData) => {
    setIsLoading(true);
    try {
      await updateProcedure(procedure.localId, {
        ...data,
        prestacionNumber: data.prestacionNumber || null,
        diagnosis: data.diagnosis || null,
        procedureName: data.procedureName || null,
        procedureCode: data.procedureCode || null,
        notes: data.notes || null,
      });
      // Redirect to home screen after updating
      router.replace("/(tabs)");
    } catch (e) {
      console.error("Failed to update procedure:", e);
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
        <Text style={styles.headerTitle}>Editar Procedimiento</Text>
        <View style={{ width: 34 }} />
      </View>

      <ProcedureForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.back()}
        submitLabel="Actualizar"
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
  notFound: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
  },
  backLink: {
    fontSize: 16,
    fontWeight: "600",
  },
});
