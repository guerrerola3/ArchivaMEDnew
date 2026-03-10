import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useColors } from "@/hooks/use-colors";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { LocalProcedure, ProcedureType, ScheduleType } from "@/lib/procedures-context";

export interface ProcedureFormData {
  patientName: string;
  patientRut: string;
  date: string;
  prestacionNumber: string;
  diagnosis: string;
  procedureName: string;
  procedureCode: string;
  type: ProcedureType;
  schedule: ScheduleType;
  clinic: string;
  notes: string;
  photoUrl?: string | null;
}

interface ProcedureFormProps {
  initialData?: Partial<ProcedureFormData>;
  onSubmit: (data: ProcedureFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  isLoading?: boolean;
}

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  required,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  multiline?: boolean;
  required?: boolean;
  keyboardType?: "default" | "numeric" | "email-address";
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={colors.muted + "80"}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        keyboardType={keyboardType}
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.foreground,
          },
        ]}
        returnKeyType={multiline ? "default" : "done"}
      />
    </View>
  );
}

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { key: T; label: string }[];
  value: T;
  onChange: (val: T) => void;
}) {
  const colors = useColors();
  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>{label}</Text>
      <View style={[styles.segmentedControl, { backgroundColor: colors.border + "40", borderColor: colors.border }]}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.key}
            onPress={() => onChange(opt.key)}
            style={[
              styles.segmentButton,
              value === opt.key && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                { color: value === opt.key ? "white" : colors.muted },
              ]}
            >
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
}) {
  const colors = useColors();

  // Format: DD/MM/YYYY HH:MM
  const formatForDisplay = (isoString: string) => {
    try {
      const d = new Date(isoString);
      const day = d.getDate().toString().padStart(2, "0");
      const month = (d.getMonth() + 1).toString().padStart(2, "0");
      const year = d.getFullYear();
      const hours = d.getHours().toString().padStart(2, "0");
      const mins = d.getMinutes().toString().padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } catch {
      return "";
    }
  };

  const parseFromDisplay = (text: string) => {
    // Try to parse DD/MM/YYYY or DD/MM/YYYY HH:MM
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (match) {
      const [, day, month, year, hours = "0", mins = "0"] = match;
      const d = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hours),
        parseInt(mins)
      );
      if (!isNaN(d.getTime())) {
        onChange(d.toISOString());
      }
    }
  };

  const [displayValue, setDisplayValue] = useState(formatForDisplay(value));

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.fieldLabel, { color: colors.muted }]}>
        Fecha <Text style={{ color: colors.error }}>*</Text>
      </Text>
      <TextInput
        value={displayValue}
        onChangeText={(text) => {
          setDisplayValue(text);
          parseFromDisplay(text);
        }}
        placeholder="DD/MM/AAAA HH:MM"
        placeholderTextColor={colors.muted + "80"}
        style={[
          styles.textInput,
          { backgroundColor: colors.surface, borderColor: colors.border, color: colors.foreground },
        ]}
        returnKeyType="done"
      />
      <Text style={[styles.fieldHint, { color: colors.muted }]}>Formato: DD/MM/AAAA HH:MM</Text>
    </View>
  );
}

export function ProcedureForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = "Guardar",
  isLoading = false,
}: ProcedureFormProps) {
  const colors = useColors();

  const [form, setForm] = useState<ProcedureFormData>({
    patientName: initialData?.patientName ?? "",
    patientRut: initialData?.patientRut ?? "",
    date: initialData?.date ?? new Date().toISOString(),
    prestacionNumber: initialData?.prestacionNumber ?? "",
    diagnosis: initialData?.diagnosis ?? "",
    procedureName: initialData?.procedureName ?? "",
    procedureCode: initialData?.procedureCode ?? "",
    type: initialData?.type ?? "cirugia",
    schedule: initialData?.schedule ?? "habil",
    clinic: initialData?.clinic ?? "",
    notes: initialData?.notes ?? "",
    photoUrl: initialData?.photoUrl,
  });

  const update = (field: keyof ProcedureFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!form.patientName.trim()) {
      Alert.alert("Error", "El nombre del paciente es requerido");
      return;
    }
    if (!form.patientRut.trim()) {
      Alert.alert("Error", "El RUT del paciente es requerido");
      return;
    }
    if (!form.clinic.trim()) {
      Alert.alert("Error", "La clínica es requerida");
      return;
    }
    await onSubmit(form);
  };

  const typeOptions: { key: ProcedureType; label: string }[] = [
    { key: "cirugia", label: "Cirugía" },
    { key: "procedimiento", label: "Procedim." },
    { key: "interconsulta", label: "Interconsult." },
  ];

  const scheduleOptions: { key: ScheduleType; label: string }[] = [
    { key: "habil", label: "Hábil" },
    { key: "inhabil", label: "Inhábil" },
  ];

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Section: Clasificación */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Clasificación</Text>
          <SegmentedControl
            label="Tipo de atención"
            options={typeOptions}
            value={form.type}
            onChange={(val) => update("type", val)}
          />
          <SegmentedControl
            label="Horario"
            options={scheduleOptions}
            value={form.schedule}
            onChange={(val) => update("schedule", val)}
          />
          <DateField
            label="Fecha"
            value={form.date}
            onChange={(val) => update("date", val)}
          />
          <FormField
            label="Clínica / Hospital"
            value={form.clinic}
            onChangeText={(v) => update("clinic", v)}
            required
          />
        </View>

        {/* Section: Paciente */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Datos del Paciente</Text>
          <FormField
            label="Nombre del Paciente"
            value={form.patientName}
            onChangeText={(v) => update("patientName", v)}
            required
          />
          <FormField
            label="RUT del Paciente"
            value={form.patientRut}
            onChangeText={(v) => update("patientRut", v)}
            placeholder="XX.XXX.XXX-X"
            required
          />
          <FormField
            label="N° Prestación / ID"
            value={form.prestacionNumber}
            onChangeText={(v) => update("prestacionNumber", v)}
            placeholder="Número de prestación"
          />
        </View>

        {/* Section: Procedimiento */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Procedimiento</Text>
          <FormField
            label="Diagnóstico"
            value={form.diagnosis}
            onChangeText={(v) => update("diagnosis", v)}
            multiline
            placeholder="Diagnóstico principal"
          />
          <FormField
            label="Procedimiento Realizado"
            value={form.procedureName}
            onChangeText={(v) => update("procedureName", v)}
            multiline
            placeholder="Descripción del procedimiento"
          />
          <FormField
            label="Código de Procedimiento"
            value={form.procedureCode}
            onChangeText={(v) => update("procedureCode", v)}
            placeholder="Código FONASA o similar"
          />
        </View>

        {/* Section: Notas */}
        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.primary }]}>Notas adicionales</Text>
          <FormField
            label="Observaciones"
            value={form.notes}
            onChangeText={(v) => update("notes", v)}
            multiline
            placeholder="Observaciones adicionales..."
          />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={onCancel}
            style={[styles.cancelButton, { borderColor: colors.border }]}
          >
            <Text style={[styles.cancelButtonText, { color: colors.muted }]}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            style={[styles.submitButton, { backgroundColor: colors.primary, opacity: isLoading ? 0.7 : 1 }]}
          >
            <Text style={styles.submitButtonText}>
              {isLoading ? "Guardando..." : submitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    gap: 4,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  fieldContainer: {
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldHint: {
    fontSize: 11,
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    lineHeight: 20,
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 10,
  },
  segmentedControl: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  segmentButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  submitButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "700",
  },
});
