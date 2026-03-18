import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import {
  LocalProcedure,
  MONTHS_ES,
  PROCEDURE_TYPE_LABELS,
  SCHEDULE_TYPE_LABELS,
  useProcedures,
} from "@/lib/procedures-context";
import { utils, write } from "xlsx";

// Helper: show error as Alert AND log to console
function showError(title: string, message: string, err?: unknown) {
  console.error(`[Export] ${title}:`, err ?? message);
  Alert.alert(title, message, [{ text: "OK" }]);
}

type ExportPeriod = "current_month" | "last_3_months" | "current_year" | "all" | "custom";
type ProcedureTypeFilter = "all" | "cirugia" | "procedimiento" | "interconsulta";

interface PeriodOption {
  key: ExportPeriod;
  label: string;
  description: string;
}

const PERIOD_OPTIONS: PeriodOption[] = [
  { key: "current_month", label: "Mes actual", description: "Solo el mes en curso" },
  { key: "last_3_months", label: "Últimos 3 meses", description: "Los últimos 3 meses" },
  { key: "current_year", label: "Año actual", description: `Todo el año ${new Date().getFullYear()}` },
  { key: "all", label: "Todos", description: "Todos los procedimientos" },
  { key: "custom", label: "Personalizado", description: "Selecciona un rango de fechas" },
];

function formatDate(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
}

function buildExcelData(procedures: LocalProcedure[], includeNotes: boolean = true) {
  const headers = [
    "Fecha",
    "Hora",
    "Nombre Paciente",
    "RUT Paciente",
    "N° Prestación",
    "Diagnóstico",
    "Procedimiento",
    "Código",
    "Tipo",
    "Horario",
    "Clínica",
    "Previsión",
    ...(includeNotes ? ["Notas"] : []),
    "Boleta Realizada",
    "Pagado",
  ];

  const PROVISION_LABELS: Record<string, string> = {
    fonasa: "FONASA",
    cruz_blanca: "Cruz Blanca",
    nueva_masvida: "Nueva Masvida",
    consalud: "Consalud",
    vida_tres: "Vida Tres",
    colmena: "Colmena",
    particular: "Particular",
  };

  const rows = procedures.map((p) => [
    formatDate(p.date),
    formatTime(p.date),
    p.patientName,
    p.patientRut,
    p.prestacionNumber ?? "",
    p.diagnosis ?? "",
    p.procedureName ?? "",
    p.procedureCode ?? "",
    PROCEDURE_TYPE_LABELS[p.type],
    SCHEDULE_TYPE_LABELS[p.schedule],
    p.clinic,
    p.provision ? PROVISION_LABELS[p.provision] : "",
    ...(includeNotes ? [p.notes ?? ""] : []),
    p.invoiceIssued ? "Sí" : "No",
    p.isPaid ? "Sí" : "No",
  ]);

  return [headers, ...rows];
}

function buildPdfHtml(procedures: LocalProcedure[], periodLabel: string, includeNotes: boolean = true): string {
  const PROVISION_LABELS: Record<string, string> = {
    fonasa: "FONASA",
    cruz_blanca: "Cruz Blanca",
    nueva_masvida: "Nueva Masvida",
    consalud: "Consalud",
    vida_tres: "Vida Tres",
    colmena: "Colmena",
    particular: "Particular",
  };

  const now = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const rows = procedures
    .map(
      (p) => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>${formatTime(p.date)}</td>
      <td>${p.patientName}</td>
      <td>${p.patientRut}</td>
      <td>${p.prestacionNumber ?? ""}</td>
      <td>${p.diagnosis ?? ""}</td>
      <td>${p.procedureName ?? ""}</td>
      <td>${p.procedureCode ?? ""}</td>
      <td>${PROCEDURE_TYPE_LABELS[p.type]}</td>
      <td>${SCHEDULE_TYPE_LABELS[p.schedule]}</td>
      <td>${p.clinic}</td>
      <td>${p.provision ? PROVISION_LABELS[p.provision] : ""}</td>
      ${includeNotes ? `<td>${p.notes ?? ""}</td>` : ""}
      <td>${p.invoiceIssued ? "Sí" : "No"}</td>
      <td>${p.isPaid ? "Sí" : "No"}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
    h1 { text-align: center; color: #0a7ea4; margin-bottom: 10px; }
    .info { text-align: center; color: #666; font-size: 12px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background-color: #0a7ea4; color: white; padding: 10px; text-align: left; font-size: 11px; }
    td { padding: 8px; border-bottom: 1px solid #ddd; font-size: 10px; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #999; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <h1>ArchivaMED - Reporte de Procedimientos</h1>
  <div class="info">
    <p><strong>Período:</strong> ${periodLabel}</p>
    <p><strong>Generado:</strong> ${now}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Fecha</th>
        <th>Hora</th>
        <th>Paciente</th>
        <th>RUT</th>
        <th>Prestación</th>
        <th>Diagnóstico</th>
        <th>Procedimiento</th>
        <th>Código</th>
        <th>Tipo</th>
        <th>Horario</th>
        <th>Clínica</th>
        <th>Previsión</th>
        ${includeNotes ? "<th>Notas</th>" : ""}
        <th>Boleta</th>
        <th>Pagado</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="footer">ArchivaMED &nbsp;|&nbsp; ${procedures.length} procedimientos exportados</div>
</body>
</html>`;
}

export default function ExportScreen() {
  const colors = useColors();
  const { procedures } = useProcedures();
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>("current_month");
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);
  const [typeFilter, setTypeFilter] = useState<ProcedureTypeFilter>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [includeNotes, setIncludeNotes] = useState<boolean>(true);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const filteredProcedures = useMemo(() => {
    let result = procedures;

    // Apply period filter
    switch (selectedPeriod) {
      case "current_month":
        result = result.filter((p) => {
          const d = new Date(p.date);
          return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
        });
        break;
      case "last_3_months": {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        result = result.filter((p) => new Date(p.date) >= threeMonthsAgo);
        break;
      }
      case "current_year":
        result = result.filter((p) => new Date(p.date).getFullYear() === currentYear);
        break;
      case "custom":
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          result = result.filter((p) => {
            const d = new Date(p.date);
            return d >= start && d <= end;
          });
        }
        break;
      case "all":
      default:
        break;
    }

    // Apply type filter
    if (typeFilter !== "all") {
      result = result.filter((p) => p.type === typeFilter);
    }

    return result;
  }, [procedures, selectedPeriod, currentYear, currentMonth, typeFilter, customStartDate, customEndDate, now, includeNotes]);

  const periodLabel = useMemo(() => {
    let label = "";
    switch (selectedPeriod) {
      case "current_month":
        label = `${MONTHS_ES[currentMonth - 1]} ${currentYear}`;
        break;
      case "last_3_months":
        label = "Últimos 3 meses";
        break;
      case "current_year":
        label = `Año ${currentYear}`;
        break;
      case "custom":
        label = customStartDate && customEndDate ? `${customStartDate} a ${customEndDate}` : "Personalizado";
        break;
      case "all":
      default:
        label = "Todos los procedimientos";
    }
    if (typeFilter !== "all") {
      const typeLabels: Record<ProcedureTypeFilter, string> = {
        all: "Todos",
        cirugia: "Cirugías",
        procedimiento: "Procedimientos",
        interconsulta: "Interconsultas",
      };
      label += ` - ${typeLabels[typeFilter]}`;
    }
    return label;
  }, [selectedPeriod, currentYear, currentMonth, typeFilter, customStartDate, customEndDate]);

  const handleExportExcel = async () => {
    if (filteredProcedures.length === 0) {
      Alert.alert("Sin datos", "No hay procedimientos en el período seleccionado. Seleccione un período diferente o agregue procedimientos primero.");
      return;
    }

    setIsExporting("excel");
    try {
      const data = buildExcelData(filteredProcedures, includeNotes);
      const ws = utils.aoa_to_sheet(data);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Procedimientos");

      const wbout = write(wb, { bookType: "xlsx", type: "base64" });

      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const fileUri = `${FileSystem.documentDirectory}ArchivaMED_${safeLabel}_${Date.now()}.xlsx`;

      await FileSystem.writeAsStringAsync(fileUri, wbout, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          dialogTitle: "Exportar a Excel",
          UTI: "com.microsoft.excel.xlsx",
        });
      } else {
        Alert.alert(
          "Archivo generado",
          `El archivo Excel fue guardado en el almacenamiento de la app.\n\nRuta: ${fileUri}`,
          [{ text: "OK" }]
        );
      }
    } catch (e: unknown) {
      showError(
        "Error al exportar Excel",
        "No se pudo generar el archivo. Verifique que tenga espacio disponible e intente nuevamente.",
        e
      );
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportPdf = async () => {
    if (filteredProcedures.length === 0) {
      Alert.alert("Sin datos", "No hay procedimientos en el período seleccionado. Seleccione un período diferente o agregue procedimientos primero.");
      return;
    }

    setIsExporting("pdf");
    try {
      const html = buildPdfHtml(filteredProcedures, periodLabel, includeNotes);

      // printToFileAsync saves to cache dir — share directly from that URI
      const { uri } = await Print.printToFileAsync({ html });

      const sharingAvailable = await Sharing.isAvailableAsync();
      if (sharingAvailable) {
        // Share directly from the cache URI — no need to move the file
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: "Exportar reporte PDF",
          UTI: "com.adobe.pdf",
        });
      } else {
        // Fallback: move to documentDirectory and inform user
        const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_\-]/g, "_");
        const destUri = `${FileSystem.documentDirectory}ArchivaMED_${safeLabel}_${Date.now()}.pdf`;
        await FileSystem.moveAsync({ from: uri, to: destUri });
        Alert.alert(
          "PDF generado",
          `El reporte PDF fue guardado en el almacenamiento de la app.\n\nRuta: ${destUri}`,
          [{ text: "OK" }]
        );
      }
    } catch (e: unknown) {
      showError(
        "Error al exportar PDF",
        "No se pudo generar el reporte PDF. Intente nuevamente.",
        e
      );
    } finally {
      setIsExporting(null);
    }
  };

  const handlePrint = async () => {
    if (filteredProcedures.length === 0) {
      Alert.alert("Sin datos", "No hay procedimientos en el período seleccionado. Seleccione un período diferente o agregue procedimientos primero.");
      return;
    }

    try {
      const html = buildPdfHtml(filteredProcedures, periodLabel, includeNotes);
      if (Platform.OS === "web") {
        await Print.printAsync({});
      } else {
        await Print.printAsync({ html });
      }
    } catch (e: unknown) {
      showError("Error al imprimir", "No se pudo abrir el diálogo de impresión. Intente nuevamente.", e);
    }
  };

  const stats = useMemo(
    () => ({
      total: filteredProcedures.length,
      cirugias: filteredProcedures.filter((p) => p.type === "cirugia").length,
      procedimientos: filteredProcedures.filter((p) => p.type === "procedimiento").length,
      interconsultas: filteredProcedures.filter((p) => p.type === "interconsulta").length,
    }),
    [filteredProcedures]
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <Text style={styles.headerTitle}>Exportar</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Period Selection */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Período a exportar</Text>
          {PERIOD_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSelectedPeriod(opt.key)}
              style={[
                styles.periodOption,
                { borderColor: selectedPeriod === opt.key ? colors.primary : colors.border },
                selectedPeriod === opt.key && { backgroundColor: colors.primary + "10" },
              ]}
            >
              <View style={styles.periodOptionContent}>
                <Text style={[styles.periodOptionLabel, { color: colors.foreground }]}>
                  {opt.label}
                </Text>
                <Text style={[styles.periodOptionDesc, { color: colors.muted }]}>
                  {opt.description}
                </Text>
              </View>
              <View
                style={[
                  styles.radioOuter,
                  { borderColor: selectedPeriod === opt.key ? colors.primary : colors.border },
                ]}
              >
                {selectedPeriod === opt.key && (
                  <View style={[styles.radioInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Custom Date Range (if custom period selected) */}
        {selectedPeriod === "custom" && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>Rango personalizado</Text>
            <View style={styles.dateInputRow}>
              <View style={styles.dateInputContainer}>
                <Text style={[styles.dateLabel, { color: colors.muted }]}>Desde</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted + "80"}
                  value={customStartDate}
                  onChangeText={setCustomStartDate}
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                />
              </View>
              <View style={styles.dateInputContainer}>
                <Text style={[styles.dateLabel, { color: colors.muted }]}>Hasta</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.muted + "80"}
                  value={customEndDate}
                  onChangeText={setCustomEndDate}
                  style={[
                    styles.dateInput,
                    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                />
              </View>
            </View>
          </View>
        )}

        {/* Type Filter */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Filtrar por tipo</Text>
          {[
            { key: "all" as ProcedureTypeFilter, label: "Todos" },
            { key: "cirugia" as ProcedureTypeFilter, label: "Cirugías" },
            { key: "procedimiento" as ProcedureTypeFilter, label: "Procedimientos" },
            { key: "interconsulta" as ProcedureTypeFilter, label: "Interconsultas" },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setTypeFilter(opt.key)}
              style={[
                styles.typeOption,
                { borderColor: typeFilter === opt.key ? colors.primary : colors.border },
                typeFilter === opt.key && { backgroundColor: colors.primary + "10" },
              ]}
            >
              <Text style={[styles.typeOptionLabel, { color: colors.foreground }]}>
                {opt.label}
              </Text>
              <View
                style={[
                  styles.checkboxOuter,
                  { borderColor: typeFilter === opt.key ? colors.primary : colors.border },
                ]}
              >
                {typeFilter === opt.key && (
                  <View style={[styles.checkboxInner, { backgroundColor: colors.primary }]} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Resumen del período</Text>
          <Text style={[styles.periodLabelText, { color: colors.foreground }]}>{periodLabel}</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Total</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.error }]}>{stats.cirugias}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Cirugías</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.warning }]}>{stats.procedimientos}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Procedim.</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.interconsultas}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Interconsult.</Text>
            </View>
          </View>
        </View>

        {/* Export Options */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Opciones de exportación</Text>
          <TouchableOpacity
            onPress={() => setIncludeNotes(!includeNotes)}
            style={[styles.optionRow, { borderColor: colors.border }]}
          >
            <Text style={[styles.optionLabel, { color: colors.foreground }]}>Notas (detalle de protocolos)</Text>
            <View
              style={[
                styles.toggleSwitch,
                { backgroundColor: includeNotes ? colors.primary : colors.border },
              ]}
            >
              <View
                style={[
                  styles.toggleThumb,
                  { transform: [{ translateX: includeNotes ? 20 : 0 }] },
                ]}
              />
            </View>
          </TouchableOpacity>
          <Text style={[styles.optionHint, { color: colors.muted }]}>
            {includeNotes ? "Las notas se incluirán en la exportación" : "Las notas se excluirán para reducir el tamaño del archivo"}
          </Text>
        </View>

        {/* Export Buttons */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Exportar datos</Text>

          <TouchableOpacity
            onPress={handleExportExcel}
            disabled={isExporting !== null}
            style={[
              styles.exportButton,
              { backgroundColor: colors.primary, opacity: isExporting === "excel" ? 0.6 : 1 },
            ]}
          >
            {isExporting === "excel" ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <IconSymbol name="tablecells" size={20} color="white" />
            )}
            <Text style={styles.exportButtonText}>
              {isExporting === "excel" ? "Generando..." : "Exportar a Excel"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={isExporting !== null}
            style={[
              styles.exportButton,
              { backgroundColor: colors.primary, opacity: isExporting === "pdf" ? 0.6 : 1 },
            ]}
          >
            {isExporting === "pdf" ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <IconSymbol name="doc.fill" size={20} color="white" />
            )}
            <Text style={styles.exportButtonText}>
              {isExporting === "pdf" ? "Generando..." : "Exportar a PDF"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handlePrint}
            disabled={isExporting !== null}
            style={[
              styles.exportButton,
              { backgroundColor: colors.primary, opacity: isExporting ? 0.6 : 1 },
            ]}
          >
            <IconSymbol name="printer.fill" size={20} color="white" />
            <Text style={styles.exportButtonText}>Imprimir</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
    paddingBottom: 40,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  periodOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  periodOptionContent: {
    flex: 1,
  },
  periodOptionLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 4,
  },
  periodOptionDesc: {
    fontSize: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dateInputRow: {
    flexDirection: "row",
    gap: 12,
  },
  dateInputContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
  },
  dateInput: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  typeOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  typeOptionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  checkboxOuter: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  periodLabelText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  exportButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  optionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: "500",
  },
  toggleSwitch: {
    width: 50,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  optionHint: {
    fontSize: 12,
    marginTop: 8,
    marginHorizontal: 12,
  },
});
