import { Platform } from "react-native";
import { recognizeTextFromImage } from "@/lib/local-ocr";

export type ExtractedProcedureData = {
  patientName?: string | null;
  patientRut?: string | null;
  date?: string | null;
  prestacionNumber?: string | null;
  diagnosis?: string | null;
  procedureName?: string | null;
  procedureCode?: string | null;
  type?: "cirugia" | "procedimiento" | "interconsulta" | null;
  schedule?: "habil" | "inhabil" | null;
  clinic?: string | null;
  provision?: string | null;
  notes?: string | null;
};

export type LocalExtractionResult = {
  photoUrl: string | null;
  extractedData: ExtractedProcedureData;
  warnings: string[];
  rawText?: string;
};

const COMMON_CLINICS = [
  "clinica alemana",
  "clinica las condes",
  "clinica santa maria",
  "hospital fach",
  "hospital del trabajador",
];

function inferSchedule(date: Date): "habil" | "inhabil" {
  const day = date.getDay();
  const hour = date.getHours();
  return day >= 1 && day <= 5 && hour >= 8 && hour < 17 ? "habil" : "inhabil";
}

function normalizeRutCandidate(value: string): string | null {
  const match = value.match(/\b\d{1,2}\.?\d{3}\.?\d{3}-?[0-9kK]\b|\b\d{7,8}[0-9kK]\b/);
  if (!match) return null;
  const cleaned = match[0].replace(/[^0-9kK]/g, "");
  const body = cleaned.slice(0, -1).padStart(8, "0");
  const verifier = cleaned.slice(-1).toUpperCase();
  return `${body.slice(0, 2)}.${body.slice(2, 5)}.${body.slice(5)}-${verifier}`;
}

function decodeBase64Payload(base64: string): string {
  if (Platform.OS === "web" && typeof atob === "function") {
    try {
      return atob(base64);
    } catch {
      return "";
    }
  }

  const BufferImpl = (globalThis as { Buffer?: { from(input: string, encoding: string): { toString(enc: string): string } } }).Buffer;
  if (!BufferImpl) return "";

  try {
    return BufferImpl.from(base64, "base64").toString("latin1");
  } catch {
    return "";
  }
}

function findDateInText(text: string): string | null {
  const match = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (!match) return null;

  const [, day, month, year] = match;
  const parsed = new Date(Number(year), Number(month) - 1, Number(day));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function findClinicInText(text: string): string | null {
  const lowerText = text.toLowerCase();
  const match = COMMON_CLINICS.find((clinic) => lowerText.includes(clinic));
  if (!match) return null;
  return match
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function findProvisionInText(text: string): string | null {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("fonasa")) return "fonasa";
  if (lowerText.includes("cruz blanca")) return "cruz_blanca";
  if (lowerText.includes("masvida")) return "nueva_masvida";
  if (lowerText.includes("consalud")) return "consalud";
  if (lowerText.includes("vida tres") || lowerText.includes("vidatres")) return "vida_tres";
  if (lowerText.includes("colmena")) return "colmena";
  if (lowerText.includes("particular") || lowerText.includes("privado")) return "particular";
  return null;
}

function findLabeledValue(text: string, labels: string[]): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const lowered = line.toLowerCase();
    for (const label of labels) {
      const normalizedLabel = label.toLowerCase();
      if (!lowered.includes(normalizedLabel)) continue;

      const parts = line.split(/[:\-]/);
      if (parts.length > 1) {
        const value = parts.slice(1).join(" ").trim();
        if (value) return value;
      }

      const inline = line
        .replace(new RegExp(normalizedLabel, "i"), "")
        .replace(/[:\-]/g, "")
        .trim();
      if (inline) return inline;
    }
  }

  return null;
}

function normalizeName(value: string | null): string | null {
  if (!value) return null;
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;

  if (cleaned.includes(",")) {
    const [lastName, firstName] = cleaned.split(",").map((part) => part.trim()).filter(Boolean);
    if (firstName && lastName) return `${firstName} ${lastName}`;
  }

  return cleaned;
}

function inferType(text: string): "cirugia" | "procedimiento" | "interconsulta" {
  const lowerText = text.toLowerCase();
  if (lowerText.includes("interconsulta")) return "interconsulta";
  if (
    lowerText.includes("cirugia") ||
    lowerText.includes("quirurg") ||
    lowerText.includes("pabellon") ||
    lowerText.includes("artrosc")
  ) {
    return "cirugia";
  }
  return "procedimiento";
}

function extractNotes(text: string): string | null {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const sectionIndex = lines.findIndex((line) =>
    /(descripci[oó]n del procedimiento|hallazgos quir[uú]rgicos|procedimiento realizado|acto quir[uú]rgico|t[eé]cnica quir[uú]rgica)/i.test(
      line,
    ),
  );

  if (sectionIndex === -1) return null;

  const collected = lines.slice(sectionIndex, sectionIndex + 5).join(" ");
  return collected || null;
}

export async function extractProcedureDataLocally(input: {
  photoUrl: string | null;
  imageUri: string | null;
  imageBase64: string;
}): Promise<LocalExtractionResult> {
  const ocrResult = await recognizeTextFromImage(input.imageUri);
  const fallbackText = decodeBase64Payload(input.imageBase64);
  const sourceText = ocrResult.text || fallbackText;
  const inferredDate = findDateInText(sourceText) ?? new Date().toISOString();
  const labeledPatientName = normalizeName(
    findLabeledValue(sourceText, ["paciente", "nombre paciente", "nombre"]) ?? null,
  );
  const labeledRut =
    normalizeRutCandidate(findLabeledValue(sourceText, ["rut paciente", "rut", "run"]) ?? "") ??
    normalizeRutCandidate(sourceText);
  const prestacionNumber =
    findLabeledValue(sourceText, [
      "n° prestación",
      "numero de prestación",
      "número de prestación",
      "n° episodio",
      "numero de episodio",
      "admisión",
      "admision",
      "episodio",
    ]) ?? null;
  const diagnosis =
    findLabeledValue(sourceText, ["diagnóstico", "diagnostico", "impresión diagnóstica"]) ?? null;
  const procedureName =
    findLabeledValue(sourceText, [
      "procedimiento realizado",
      "cirugía realizada",
      "cirugia realizada",
      "procedimiento",
      "intervención",
      "intervencion",
    ]) ?? null;
  const procedureCode =
    findLabeledValue(sourceText, ["código", "codigo", "cod."]) ?? null;
  const clinic =
    findLabeledValue(sourceText, ["clínica", "clinica", "hospital", "centro"]) ??
    findClinicInText(sourceText);
  const provision =
    findLabeledValue(sourceText, ["previsión", "prevision", "seguro", "isapre", "cobertura"]) ??
    findProvisionInText(sourceText);
  const normalizedProvision =
    provision === "fonasa" ||
    provision === "cruz_blanca" ||
    provision === "nueva_masvida" ||
    provision === "consalud" ||
    provision === "vida_tres" ||
    provision === "colmena" ||
    provision === "particular"
      ? provision
      : findProvisionInText(provision ?? "");
  const notes = extractNotes(sourceText);
  const warnings: string[] = [];

  if (ocrResult.warning) warnings.push(ocrResult.warning);
  if (!ocrResult.text) {
    warnings.push(
      "Se aplicó una extracción básica de respaldo. Revisa manualmente los campos antes de guardar.",
    );
  }

  return {
    photoUrl: input.photoUrl,
    extractedData: {
      patientName: labeledPatientName,
      patientRut: labeledRut,
      date: inferredDate,
      prestacionNumber,
      diagnosis,
      procedureName,
      procedureCode,
      type: inferType(sourceText),
      schedule: inferSchedule(new Date(inferredDate)),
      clinic,
      provision: normalizedProvision,
      notes,
    },
    warnings,
    rawText: sourceText,
  };
}
