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

function buildExcelData(procedures: LocalProcedure[]) {
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
    "Notas",
  ];

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
    p.notes ?? "",
  ]);

  return [headers, ...rows];
}

function buildPdfHtml(procedures: LocalProcedure[], periodLabel: string): string {
  const now = new Date().toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const stats = {
    total: procedures.length,
    cirugias: procedures.filter((p) => p.type === "cirugia").length,
    procedimientos: procedures.filter((p) => p.type === "procedimiento").length,
    interconsultas: procedures.filter((p) => p.type === "interconsulta").length,
    habiles: procedures.filter((p) => p.schedule === "habil").length,
    inhabiles: procedures.filter((p) => p.schedule === "inhabil").length,
  };

  const rows = procedures
    .map(
      (p) => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.patientName}</td>
      <td>${p.patientRut}</td>
      <td>${p.prestacionNumber ?? "-"}</td>
      <td>${p.diagnosis ?? "-"}</td>
      <td>${p.procedureName ?? "-"}</td>
      <td>${p.procedureCode ?? "-"}</td>
      <td class="badge-${p.type}">${PROCEDURE_TYPE_LABELS[p.type]}</td>
      <td class="badge-${p.schedule}">${SCHEDULE_TYPE_LABELS[p.schedule]}</td>
      <td>${p.clinic}</td>
    </tr>
  `
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TraumaLog - Reporte de Procedimientos</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 10px; color: #1C2833; background: #fff; }
    .header { background: #1A5276; color: white; padding: 20px 24px; margin-bottom: 16px; }
    .header h1 { font-size: 20px; font-weight: 700; }
    .header p { font-size: 12px; opacity: 0.85; margin-top: 4px; }
    .summary { display: flex; gap: 12px; padding: 0 24px 16px; flex-wrap: wrap; }
    .stat-box { background: #F4F6F7; border-radius: 8px; padding: 10px 14px; min-width: 100px; }
    .stat-box .value { font-size: 22px; font-weight: 700; color: #1A5276; }
    .stat-box .label { font-size: 10px; color: #5D6D7E; margin-top: 2px; }
    .table-container { padding: 0 24px 24px; overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; }
    th { background: #1A5276; color: white; padding: 8px 6px; text-align: left; font-weight: 600; white-space: nowrap; }
    td { padding: 7px 6px; border-bottom: 1px solid #E5E7EB; vertical-align: top; }
    tr:nth-child(even) td { background: #F9FAFB; }
    .badge-cirugia { color: #C0392B; font-weight: 600; }
    .badge-procedimiento { color: #1A5276; font-weight: 600; }
    .badge-interconsulta { color: #1E8449; font-weight: 600; }
    .badge-habil { color: #1E8449; font-weight: 600; }
    .badge-inhabil { color: #D68910; font-weight: 600; }
    .footer { text-align: center; color: #5D6D7E; font-size: 9px; padding: 12px; border-top: 1px solid #E5E7EB; }
    @media print { body { font-size: 9px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>TraumaLog — Reporte de Procedimientos</h1>
    <p>Período: ${periodLabel} &nbsp;|&nbsp; Generado el ${now}</p>
  </div>

  <div class="summary">
    <div class="stat-box"><div class="value">${stats.total}</div><div class="label">Total</div></div>
    <div class="stat-box"><div class="value">${stats.cirugias}</div><div class="label">Cirugías</div></div>
    <div class="stat-box"><div class="value">${stats.procedimientos}</div><div class="label">Procedimientos</div></div>
    <div class="stat-box"><div class="value">${stats.interconsultas}</div><div class="label">Interconsultas</div></div>
    <div class="stat-box"><div class="value">${stats.habiles}</div><div class="label">Hábiles</div></div>
    <div class="stat-box"><div class="value">${stats.inhabiles}</div><div class="label">Inhábiles</div></div>
  </div>

  <div class="table-container">
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Paciente</th>
          <th>RUT</th>
          <th>N° Prestación</th>
          <th>Diagnóstico</th>
          <th>Procedimiento</th>
          <th>Código</th>
          <th>Tipo</th>
          <th>Horario</th>
          <th>Clínica</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>

  <div class="footer">TraumaLog &nbsp;|&nbsp; ${procedures.length} procedimientos exportados</div>
</body>
</html>`;
}

export default function ExportScreen() {
  const colors = useColors();
  const { procedures } = useProcedures();
  const [selectedPeriod, setSelectedPeriod] = useState<ExportPeriod>("current_month");
  const [isExporting, setIsExporting] = useState<"excel" | "pdf" | null>(null);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const filteredProcedures = useMemo(() => {
    switch (selectedPeriod) {
      case "current_month":
        return procedures.filter((p) => {
          const d = new Date(p.date);
          return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
        });
      case "last_3_months": {
        const threeMonthsAgo = new Date(now);
        threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
        return procedures.filter((p) => new Date(p.date) >= threeMonthsAgo);
      }
      case "current_year":
        return procedures.filter((p) => new Date(p.date).getFullYear() === currentYear);
      case "all":
      default:
        return procedures;
    }
  }, [procedures, selectedPeriod, currentYear, currentMonth]);

  const periodLabel = useMemo(() => {
    switch (selectedPeriod) {
      case "current_month":
        return `${MONTHS_ES[currentMonth - 1]} ${currentYear}`;
      case "last_3_months":
        return "Últimos 3 meses";
      case "current_year":
        return `Año ${currentYear}`;
      case "all":
        return "Todos los procedimientos";
      default:
        return "";
    }
  }, [selectedPeriod, currentYear, currentMonth]);

  const handleExportExcel = async () => {
    if (filteredProcedures.length === 0) {
      Alert.alert("Sin datos", "No hay procedimientos en el período seleccionado. Seleccione un período diferente o agregue procedimientos primero.");
      return;
    }

    setIsExporting("excel");
    try {
      // Build workbook
      const data = buildExcelData(filteredProcedures);
      const ws = utils.aoa_to_sheet(data);
      ws["!cols"] = [
        { wch: 12 }, { wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 14 },
        { wch: 30 }, { wch: 30 }, { wch: 12 }, { wch: 16 }, { wch: 10 },
        { wch: 22 }, { wch: 30 },
      ];
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Procedimientos");

      const summaryData = [
        ["RESUMEN - " + periodLabel],
        [""],
        ["Total procedimientos", filteredProcedures.length],
        ["Cirugías", filteredProcedures.filter((p) => p.type === "cirugia").length],
        ["Procedimientos", filteredProcedures.filter((p) => p.type === "procedimiento").length],
        ["Interconsultas", filteredProcedures.filter((p) => p.type === "interconsulta").length],
        [""],
        ["Horario hábil", filteredProcedures.filter((p) => p.schedule === "habil").length],
        ["Horario inhábil", filteredProcedures.filter((p) => p.schedule === "inhabil").length],
      ];
      const wsSummary = utils.aoa_to_sheet(summaryData);
      wsSummary["!cols"] = [{ wch: 25 }, { wch: 10 }];
      utils.book_append_sheet(wb, wsSummary, "Resumen");

      // Write to base64 and save to documentDirectory
      const xlsxBase64 = write(wb, { type: "base64", bookType: "xlsx" });
      const safeLabel = periodLabel.replace(/[^a-zA-Z0-9_\-]/g, "_");
      const fileName = `TraumaLog_${safeLabel}_${Date.now()}.xlsx`;
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;

      await FileSystem.writeAsStringAsync(fileUri, xlsxBase64, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Share the file — shareAsync works directly with the file URI on iOS/Android
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
      const html = buildPdfHtml(filteredProcedures, periodLabel);

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
        const destUri = `${FileSystem.documentDirectory}TraumaLog_${safeLabel}_${Date.now()}.pdf`;
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
      const html = buildPdfHtml(filteredProcedures, periodLabel);
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
              <Text style={[styles.statValue, { color: colors.primary }]}>{stats.procedimientos}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Procedim.</Text>
            </View>
            <View style={[styles.statItem, { backgroundColor: colors.background }]}>
              <Text style={[styles.statValue, { color: colors.success }]}>{stats.interconsultas}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>Interconsult.</Text>
            </View>
          </View>
        </View>

        {/* Export Actions */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Formato de exportación</Text>

          {/* Excel */}
          <TouchableOpacity
            onPress={handleExportExcel}
            disabled={isExporting !== null}
            style={[
              styles.exportButton,
              { backgroundColor: "#217346", opacity: isExporting !== null ? 0.6 : 1 },
            ]}
          >
            {isExporting === "excel" ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <IconSymbol name="tablecells.fill" size={22} color="white" />
            )}
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonTitle}>Exportar a Excel</Text>
              <Text style={styles.exportButtonSubtitle}>
                Archivo .xlsx con hoja de datos y resumen
              </Text>
            </View>
            <IconSymbol name="square.and.arrow.up.fill" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* PDF */}
          <TouchableOpacity
            onPress={handleExportPdf}
            disabled={isExporting !== null}
            style={[
              styles.exportButton,
              { backgroundColor: "#C0392B", opacity: isExporting !== null ? 0.6 : 1 },
            ]}
          >
            {isExporting === "pdf" ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <IconSymbol name="doc.richtext.fill" size={22} color="white" />
            )}
            <View style={styles.exportButtonContent}>
              <Text style={styles.exportButtonTitle}>Exportar a PDF</Text>
              <Text style={styles.exportButtonSubtitle}>
                Reporte completo con estadísticas y tabla
              </Text>
            </View>
            <IconSymbol name="square.and.arrow.up.fill" size={18} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>

          {/* Print */}
          {Platform.OS !== "web" && (
            <TouchableOpacity
              onPress={handlePrint}
              disabled={isExporting !== null}
              style={[
                styles.exportButton,
                { backgroundColor: colors.foreground, opacity: isExporting !== null ? 0.6 : 1 },
              ]}
            >
              <IconSymbol name="printer.fill" size={22} color="white" />
              <View style={styles.exportButtonContent}>
                <Text style={styles.exportButtonTitle}>Imprimir</Text>
                <Text style={styles.exportButtonSubtitle}>
                  Enviar a impresora o guardar como PDF
                </Text>
              </View>
              <IconSymbol name="chevron.right" size={18} color="rgba(255,255,255,0.8)" />
            </TouchableOpacity>
          )}
        </View>

        {filteredProcedures.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <IconSymbol name="doc.text.fill" size={40} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>Sin datos</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              No hay procedimientos en el período seleccionado
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "white",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  periodOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    marginBottom: 8,
  },
  periodOptionContent: {
    flex: 1,
  },
  periodOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  periodOptionDesc: {
    fontSize: 12,
    marginTop: 2,
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
  periodLabelText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
  },
  statItem: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  statValue: {
    fontSize: 22,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 2,
    textAlign: "center",
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    gap: 12,
    marginBottom: 10,
  },
  exportButtonContent: {
    flex: 1,
  },
  exportButtonTitle: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
  exportButtonSubtitle: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 11,
    marginTop: 2,
  },
  emptyState: {
    borderRadius: 14,
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
  },
});
