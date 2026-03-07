import { useRouter } from "expo-router";
// @ts-ignore - typed routes will be generated after all screens exist
import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { useAuth } from "@/hooks/use-auth";
import {
  LocalProcedure,
  MONTHS_ES,
  PROCEDURE_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  useProcedures,
} from "@/lib/procedures-context";

function ProcedureCard({ item, onPress }: { item: LocalProcedure; onPress: () => void }) {
  const colors = useColors();
  const date = new Date(item.date);
  const typeLabel = PROCEDURE_TYPE_LABELS[item.type];
  const scheduleLabel = SCHEDULE_TYPE_LABELS[item.schedule];

  const typeColor =
    item.type === "cirugia"
      ? colors.error
      : item.type === "procedimiento"
      ? colors.primary
      : colors.success;

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.typeBadge, { backgroundColor: typeColor + "20" }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>{typeLabel}</Text>
        </View>
        <View style={[styles.scheduleBadge, { backgroundColor: item.schedule === "inhabil" ? colors.warning + "20" : colors.success + "20" }]}>
          <Text style={[styles.scheduleBadgeText, { color: item.schedule === "inhabil" ? colors.warning : colors.success }]}>
            {scheduleLabel}
          </Text>
        </View>
      </View>
      <Text style={[styles.patientName, { color: colors.foreground }]} numberOfLines={1}>
        {item.patientName || "Sin nombre"}
      </Text>
      <Text style={[styles.diagnosis, { color: colors.muted }]} numberOfLines={2}>
        {item.diagnosis || item.procedureName || "Sin diagnóstico"}
      </Text>
      <View style={styles.cardFooter}>
        <View style={styles.cardFooterItem}>
          <IconSymbol name="building.2.fill" size={12} color={colors.muted} />
          <Text style={[styles.cardFooterText, { color: colors.muted }]} numberOfLines={1}>
            {item.clinic || "Sin clínica"}
          </Text>
        </View>
        <Text style={[styles.dateText, { color: colors.muted }]}>
          {date.toLocaleDateString("es-CL", { day: "2-digit", month: "short" })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + "20" }]}>
        <IconSymbol name={icon as any} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.muted }]}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const { isAuthenticated, user } = useAuth();
  const { procedures, isLoading, refreshFromServer } = useProcedures();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const monthProcedures = useMemo(
    () =>
      procedures.filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
      }),
    [procedures, currentYear, currentMonth]
  );

  const stats = useMemo(
    () => ({
      total: monthProcedures.length,
      cirugias: monthProcedures.filter((p) => p.type === "cirugia").length,
      procedimientos: monthProcedures.filter((p) => p.type === "procedimiento").length,
      interconsultas: monthProcedures.filter((p) => p.type === "interconsulta").length,
    }),
    [monthProcedures]
  );

  const recentProcedures = useMemo(() => procedures.slice(0, 5), [procedures]);

  return (
    <ScreenContainer containerClassName="bg-background">
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View>
            <Text style={styles.headerGreeting}>
              {isAuthenticated ? `Hola, Dr. ${user?.name?.split(" ")[0] ?? ""}` : "TraumaLog"}
            </Text>
            <Text style={styles.headerSubtitle}>
              {MONTHS_ES[currentMonth - 1]} {currentYear}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => refreshFromServer()}
            style={styles.refreshButton}
          >
            <IconSymbol name="arrow.clockwise" size={20} color="white" />
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Resumen del mes
          </Text>
          <View style={styles.statsGrid}>
            <StatCard label="Total" value={stats.total} color={colors.primary} icon="waveform.path.ecg" />
            <StatCard label="Cirugías" value={stats.cirugias} color={colors.error} icon="bandage.fill" />
            <StatCard label="Procedim." value={stats.procedimientos} color={colors.warning} icon="stethoscope" />
            <StatCard label="Interconsult." value={stats.interconsultas} color={colors.success} icon="person.fill" />
          </View>
        </View>

        {/* Recent Procedures */}
        <View style={styles.recentSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
              Recientes
            </Text>
            <TouchableOpacity onPress={() => (router as any).push("/(tabs)/procedures")}>
              <Text style={[styles.seeAllText, { color: colors.primary }]}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.muted }]}>Cargando...</Text>
            </View>
          ) : recentProcedures.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <IconSymbol name="doc.text.fill" size={40} color={colors.muted} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Sin procedimientos
              </Text>
              <Text style={[styles.emptyText, { color: colors.muted }]}>
                Toca el botón + para agregar tu primer procedimiento
              </Text>
            </View>
          ) : (
            recentProcedures.map((item) => (
              <ProcedureCard
                key={item.localId}
                item={item}
                onPress={() => (router as any).push(`/procedure/${item.localId}`)}
              />
            ))
          )}
        </View>
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => (router as any).push("/capture")}
        activeOpacity={0.85}
      >
        <IconSymbol name="camera.fill" size={24} color="white" />
      </TouchableOpacity>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerGreeting: {
    fontSize: 22,
    fontWeight: "700",
    color: "white",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  refreshButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  statsSection: {
    padding: 20,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  recentSection: {
    padding: 20,
    paddingTop: 8,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "500",
  },
  card: {
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  scheduleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  scheduleBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  patientName: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 4,
  },
  diagnosis: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardFooterItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  cardFooterText: {
    fontSize: 12,
    flex: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    borderRadius: 12,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
