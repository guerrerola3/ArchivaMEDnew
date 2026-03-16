import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PhotoDetailModal } from "@/components/photo-detail-modal";
import { useColors } from "@/hooks/use-colors";
import {
  LocalProcedure,
  MONTHS_ES,
  PROCEDURE_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  useProcedures,
} from "@/lib/procedures-context";

type FilterType = "all" | "cirugia" | "procedimiento" | "interconsulta";
type PaymentFilterType = "all" | "paid" | "unpaid" | "invoiced" | "not_invoiced";

function ProcedureListItem({
  item,
  onPress,
  onDelete,
  onToggleInvoice,
  onTogglePaid,
  onPhotoPress,
}: {
  item: LocalProcedure;
  onPress: () => void;
  onDelete: () => void;
  onToggleInvoice?: (invoiced: boolean) => void;
  onTogglePaid?: (paid: boolean) => void;
  onPhotoPress?: (photoUrl: string) => void;
}) {
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
      onLongPress={() => {
        const options: any[] = [
          {
            text: item.invoiceIssued ? "✓ Boleta realizada" : "○ Marcar boleta",
            onPress: () => onToggleInvoice?.(!item.invoiceIssued),
          },
          {
            text: item.isPaid ? "✓ Pagado" : "○ Marcar pagado",
            onPress: () => onTogglePaid?.(!item.isPaid),
          },
        ];
        
        if (item.photoUrl) {
          options.push({
            text: "📷 Ver protocolo",
            onPress: () => onPhotoPress?.(item.photoUrl!),
          });
        }
        
        options.push(
          {
            text: "Eliminar",
            style: "destructive",
            onPress: () => {
              Alert.alert(
                "Eliminar procedimiento",
                `¿Eliminar el procedimiento de ${item.patientName}?`,
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Eliminar", style: "destructive", onPress: onDelete },
                ]
              );
            },
          },
          { text: "Cancelar", style: "cancel" }
        );
        
        Alert.alert(
          item.patientName,
          "Opciones de procedimiento",
          options
        );
      }}
      style={[styles.listItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      activeOpacity={0.7}
    >
      <View style={[styles.typeIndicator, { backgroundColor: typeColor }]} />
      <View style={styles.listItemContent}>
        <View style={styles.listItemHeader}>
          <Text style={[styles.listItemName, { color: colors.foreground }]} numberOfLines={1}>
            {item.patientName || "Sin nombre"}
          </Text>
          <Text style={[styles.listItemDate, { color: colors.muted }]}>
            {date.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })}
          </Text>
        </View>
        <Text style={[styles.listItemDiagnosis, { color: colors.muted }]} numberOfLines={1}>
          {item.diagnosis || item.procedureName || "Sin diagnóstico"}
        </Text>
        <View style={styles.listItemFooter}>
          <View style={[styles.smallBadge, { backgroundColor: typeColor + "15" }]}>
            <Text style={[styles.smallBadgeText, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <View style={[styles.smallBadge, { backgroundColor: item.schedule === "inhabil" ? colors.warning + "15" : colors.success + "15" }]}>
            <Text style={[styles.smallBadgeText, { color: item.schedule === "inhabil" ? colors.warning : colors.success }]}>
              {scheduleLabel}
            </Text>
          </View>
          {item.invoiceIssued && (
            <View style={[styles.smallBadge, { backgroundColor: colors.primary + "15" }]}>
              <Text style={[styles.smallBadgeText, { color: colors.primary }]}>Boleta</Text>
            </View>
          )}
          {item.isPaid && (
            <View style={[styles.smallBadge, { backgroundColor: colors.success + "15" }]}>
              <Text style={[styles.smallBadgeText, { color: colors.success }]}>Pagado</Text>
            </View>
          )}
          {item.clinic ? (
            <Text style={[styles.clinicText, { color: colors.muted }]} numberOfLines={1}>
              {item.clinic}
            </Text>
          ) : null}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={16} color={colors.muted} />
    </TouchableOpacity>
  );
}

export default function ProceduresScreen() {
  const router = useRouter();
  const colors = useColors();
  const { procedures, isLoading, deleteProcedure, updateProcedure } = useProcedures();
  const [filter, setFilter] = useState<FilterType>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  const filteredProcedures = useMemo(() => {
    let result = procedures;
    if (filter !== "all") {
      result = result.filter((p) => p.type === filter);
    }
    // Apply payment filter
    if (paymentFilter !== "all") {
      switch (paymentFilter) {
        case "paid":
          result = result.filter((p) => p.isPaid);
          break;
        case "unpaid":
          result = result.filter((p) => !p.isPaid);
          break;
        case "invoiced":
          result = result.filter((p) => p.invoiceIssued);
          break;
        case "not_invoiced":
          result = result.filter((p) => !p.invoiceIssued);
          break;
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.patientName.toLowerCase().includes(q) ||
          p.patientRut.toLowerCase().includes(q) ||
          (p.diagnosis ?? "").toLowerCase().includes(q) ||
          (p.procedureName ?? "").toLowerCase().includes(q) ||
          (p.clinic ?? "").toLowerCase().includes(q) ||
          (p.prestacionNumber ?? "").toLowerCase().includes(q)
      );
    }
    return result;
  }, [procedures, filter, paymentFilter, searchQuery]);

  // Group by month
  const sections = useMemo(() => {
    const groups: Record<string, LocalProcedure[]> = {};
    filteredProcedures.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    return Object.entries(groups)
      .sort(([a], [b]) => {
        const [ay, am] = a.split("-").map(Number);
        const [by, bm] = b.split("-").map(Number);
        return by - ay || bm - am;
      })
      .map(([key, data]) => {
        const [year, month] = key.split("-").map(Number);
        return {
          title: `${MONTHS_ES[month - 1]} ${year}`,
          data,
          count: data.length,
        };
      });
  }, [filteredProcedures]);

  // Count unpaid procedures
  const unpaidCount = useMemo(() => {
    return procedures.filter((p) => !p.isPaid).length;
  }, [procedures]);

  const filterButtons: { key: FilterType; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "cirugia", label: "Cirugías" },
    { key: "procedimiento", label: "Procedim." },
    { key: "interconsulta", label: "Interconsult." },
  ];

  const paymentFilterButtons: { key: PaymentFilterType; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "paid", label: "Pagados" },
    { key: "invoiced", label: "Boleta Hecha" },
    { key: "not_invoiced", label: "Sin boleta" },
  ];

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Procedimientos</Text>
        <TouchableOpacity
          onPress={() => (router as any).push("/procedure/new")}
          style={styles.addButton}
        >
          <IconSymbol name="plus.circle.fill" size={28} color="white" />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <IconSymbol name="magnifyingglass" size={18} color={colors.muted} />
        <TextInput
          placeholder="Buscar por nombre, RUT, clínica..."
          placeholderTextColor={colors.muted + "80"}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.searchInput,
            { color: colors.foreground, borderColor: colors.border },
          ]}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}
            style={styles.clearButton}>
            <IconSymbol name="xmark.circle.fill" size={18} color={colors.muted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {filterButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            onPress={() => setFilter(btn.key)}
            style={[
              styles.filterButton,
              filter === btn.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: filter === btn.key ? colors.primary : colors.muted },
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Payment Filter Tabs */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {paymentFilterButtons.map((btn) => (
          <TouchableOpacity
            key={btn.key}
            onPress={() => setPaymentFilter(btn.key)}
            style={[
              styles.filterButton,
              paymentFilter === btn.key && { borderBottomColor: colors.success, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.filterButtonText,
                { color: paymentFilter === btn.key ? colors.success : colors.muted },
              ]}
            >
              {btn.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      {isLoading ? (
        <View style={styles.centerContent}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>Cargando...</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.centerContent}>
          <IconSymbol name="doc.text.fill" size={48} color={colors.muted} />
          <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin procedimientos</Text>
          <Text style={[styles.emptyText, { color: colors.muted }]}>
            {filter !== "all" ? "No hay procedimientos con este filtro" : "Agrega tu primer procedimiento"}
          </Text>
          <TouchableOpacity
            onPress={() => (router as any).push("/capture")}
            style={[styles.addFirstButton, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.addFirstButtonText}>+ Nuevo procedimiento</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.localId}
          contentContainerStyle={styles.listContent}
          renderSectionHeader={({ section }) => (
            <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                {section.title}
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  {section.count}
                </Text>
              </View>
            </View>
          )}
          renderItem={({ item }) => (
            <ProcedureListItem
              item={item}
              onPress={() => (router as any).push(`/procedure/${item.localId}`)}
              onDelete={() => deleteProcedure(item.localId)}
              onToggleInvoice={(invoiced) => updateProcedure(item.localId, { invoiceIssued: invoiced })}
              onTogglePaid={(paid) => updateProcedure(item.localId, { isPaid: paid })}
              onPhotoPress={(photoUrl) => setSelectedPhotoUrl(photoUrl)}
            />
          )}
          stickySectionHeadersEnabled={true}
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => (router as any).push("/capture")}
        activeOpacity={0.85}
      >
        <IconSymbol name="camera.fill" size={24} color="white" />
      </TouchableOpacity>

      {/* Photo Detail Modal */}
      <PhotoDetailModal
        visible={!!selectedPhotoUrl}
        photoUrl={selectedPhotoUrl}
        onClose={() => setSelectedPhotoUrl(null)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  addButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
  },
  searchInput: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  clearButton: {
    padding: 4,
  },
  filterContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingHorizontal: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "500",
  },
  listContent: {
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  typeIndicator: {
    width: 4,
    alignSelf: "stretch",
  },
  listItemContent: {
    flex: 1,
    padding: 12,
  },
  listItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  listItemName: {
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  listItemDate: {
    fontSize: 12,
    marginLeft: 8,
  },
  listItemDiagnosis: {
    fontSize: 13,
    marginBottom: 6,
  },
  listItemFooter: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  smallBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  smallBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  clinicText: {
    fontSize: 11,
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
  addFirstButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 8,
  },
  addFirstButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 15,
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
  paymentBadge: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
});
