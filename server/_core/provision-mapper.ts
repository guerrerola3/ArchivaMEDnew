/**
 * Utility to normalize and map health insurance provider names (Previsión) to standard codes.
 * Handles various spellings, abbreviations, and variations used in Chilean medical documents.
 */

export type ProvisionCode = "fonasa" | "cruz_blanca" | "nueva_masvida" | "consalud" | "vida_tres" | "colmena" | "particular";

/**
 * Maps various spellings and variations of health insurance provider names to standard codes.
 * Handles case-insensitive matching and common abbreviations.
 */
export function normalizeProvision(input: string | null | undefined): ProvisionCode | null {
  if (!input) return null;

  // Normalize: trim, lowercase, remove extra spaces
  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");

  // FONASA variations
  if (
    normalized.includes("fonasa") ||
    normalized.includes("fondo nacional de salud") ||
    normalized.includes("fondo nacional")
  ) {
    return "fonasa";
  }

  // Cruz Blanca variations
  if (
    normalized.includes("cruz blanca") ||
    normalized.includes("cruzblanca") ||
    normalized.includes("cruz-blanca") ||
    normalized.includes("seguros cruz blanca")
  ) {
    return "cruz_blanca";
  }

  // Nueva Masvida variations
  if (
    normalized.includes("nueva masvida") ||
    normalized.includes("nuevamasvida") ||
    normalized.includes("nueva-masvida") ||
    normalized.includes("masvida") ||
    normalized.includes("mas vida")
  ) {
    return "nueva_masvida";
  }

  // Consalud variations
  if (
    normalized.includes("consalud") ||
    normalized.includes("con salud") ||
    normalized.includes("seguros consalud")
  ) {
    return "consalud";
  }

  // Vida Tres variations
  if (
    normalized.includes("vida tres") ||
    normalized.includes("vidatres") ||
    normalized.includes("vida-tres") ||
    normalized.includes("vitatres")
  ) {
    return "vida_tres";
  }

  // Colmena variations
  if (
    normalized.includes("colmena") ||
    normalized.includes("seguros colmena")
  ) {
    return "colmena";
  }

  // Particular variations
  if (
    normalized.includes("particular") ||
    normalized.includes("privado") ||
    normalized.includes("sin isapre") ||
    normalized.includes("sin cobertura") ||
    normalized.includes("autofinanciado")
  ) {
    return "particular";
  }

  // If we see "isapre" but can't identify which one, return null
  // (could be an unknown isapre or unclear text)
  if (normalized.includes("isapre")) {
    return null;
  }

  return null;
}

/**
 * Get human-readable label for a provision code
 */
export function getProvisionLabel(code: ProvisionCode | null | undefined): string {
  if (!code) return "";

  const labels: Record<ProvisionCode, string> = {
    fonasa: "FONASA",
    cruz_blanca: "Cruz Blanca",
    nueva_masvida: "Nueva Masvida",
    consalud: "Consalud",
    vida_tres: "Vida Tres",
    colmena: "Colmena",
    particular: "Particular",
  };

  return labels[code] || "";
}
