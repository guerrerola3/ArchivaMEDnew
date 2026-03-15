import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PhotoDetailModal } from "@/components/photo-detail-modal";
import { useColors } from "@/hooks/use-colors";
import {
  MONTHS_ES,
  PROCEDURE_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  useProcedures,
} from "@/lib/procedures-context";

function DetailRow({ label, value, icon }: { label: string; value?: string | null; icon?: string }) {
  const colors = useColors();
  if (!value) return null;
  return (
    <View style={[styles.detailRow, { borderBottomColor: colors.border }]}>
      <View style={styles.detailLabelContainer}>
        {icon && <IconSymbol name={icon as any} size={14} color={colors.muted} />}
        <Text style={[styles.detailLabel, { color: colors.muted }]}>{label}</Text>
      </View>
      <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
    </View>
  );
}

export default function ProcedureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colors = useColors();
  const { procedures, deleteProcedure } = useProcedures();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

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

  const date = new Date(procedure.date);
  const typeLabel = PROCEDURE_TYPE_LABELS[procedure.type];
  const scheduleLabel = SCHEDULE_TYPE_LABELS[procedure.schedule];

  const typeColor =
    procedure.type === "cirugia"
      ? colors.error
      : procedure.type === "procedimiento"
      ? colors.primary
      : colors.success;

  const handleDelete = () => {
    Alert.alert(
      "Eliminar procedimiento",
      `¿Está seguro de eliminar el procedimiento de ${procedure.patientName}?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            await deleteProcedure(procedure.localId);
            router.back();
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <IconSymbol name="arrow.left" size={22} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalle
        </Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => (router as any).push(`/procedure/edit/${procedure.localId}`)}
            style={styles.headerActionButton}
          >
            <IconSymbol name="pencil" size={20} color="white" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.headerActionButton}>
            <IconSymbol name="trash.fill" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type & Schedule badges */}
        <View style={styles.badgeRow}>
          <View style={[styles.badge, { backgroundColor: typeColor + "20" }]}>
            <Text style={[styles.badgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: procedure.schedule === "inhabil" ? colors.warning + "20" : colors.success + "20" }]}>
            <Text style={[styles.badgeText, { color: procedure.schedule === "inhabil" ? colors.warning : colors.success }]}>
              Horario {scheduleLabel}
            </Text>
          </View>
        </View>

        {/* Patient info card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Datos del Paciente</Text>
          <DetailRow label="Nombre" value={procedure.patientName} icon="person.fill" />
          <DetailRow label="RUT" value={procedure.patientRut} icon="doc.text.fill" />
          <DetailRow label="N° Prestación" value={procedure.prestacionNumber} icon="tag.fill" />
        </View>

        {/* Procedure info card */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.primary }]}>Procedimiento</Text>
          <DetailRow
            label="Fecha"
            value={date.toLocaleDateString("es-CL", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            icon="calendar"
          />
          <DetailRow label="Diagnóstico" value={procedure.diagnosis} icon="stethoscope" />
          <DetailRow label="Procedimiento" value={procedure.procedureName} icon="bandage.fill" />
          <DetailRow label="Código" value={procedure.procedureCode} icon="tag.fill" />
          <DetailRow label="Clínica" value={procedure.clinic} icon="building.2.fill" />
        </View>

        {/* Notes */}
        {procedure.notes && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.primary }]}>Notas</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{procedure.notes}</Text>
          </View>
        )}

        {/* Photo */}
        {procedure.photoUrl && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.primary }]}>Protocolo / Ficha</Text>
            <TouchableOpacity onPress={() => setPhotoModalVisible(true)}>
              <Image
                source={{ uri: procedure.photoUrl }}
                style={styles.photo}
                resizeMode="contain"
              />
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Photo Detail Modal */}
      <PhotoDetailModal
        visible={photoModalVisible}
        photoUrl={procedure.photoUrl}
        onClose={() => setPhotoModalVisible(false)}
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  badgeRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  card: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  detailRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  detailLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  detailValue: {
    fontSize: 15,
    lineHeight: 21,
  },
  notesText: {
    fontSize: 14,
    lineHeight: 21,
  },
  photo: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginTop: 8,
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
