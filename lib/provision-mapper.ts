export type ProvisionCode =
  | "fonasa"
  | "cruz_blanca"
  | "nueva_masvida"
  | "consalud"
  | "vida_tres"
  | "colmena"
  | "particular";

export function normalizeProvision(input: string | null | undefined): ProvisionCode | null {
  if (!input) return null;

  const normalized = input.trim().toLowerCase().replace(/\s+/g, " ");

  if (
    normalized.includes("fonasa") ||
    normalized.includes("fondo nacional de salud") ||
    normalized.includes("fondo nacional")
  ) {
    return "fonasa";
  }

  if (
    normalized.includes("cruz blanca") ||
    normalized.includes("cruzblanca") ||
    normalized.includes("cruz-blanca") ||
    normalized.includes("seguros cruz blanca")
  ) {
    return "cruz_blanca";
  }

  if (
    normalized.includes("nueva masvida") ||
    normalized.includes("nuevamasvida") ||
    normalized.includes("nueva-masvida") ||
    normalized.includes("masvida") ||
    normalized.includes("mas vida")
  ) {
    return "nueva_masvida";
  }

  if (
    normalized.includes("consalud") ||
    normalized.includes("con salud") ||
    normalized.includes("seguros consalud")
  ) {
    return "consalud";
  }

  if (
    normalized.includes("vida tres") ||
    normalized.includes("vidatres") ||
    normalized.includes("vida-tres") ||
    normalized.includes("vitatres")
  ) {
    return "vida_tres";
  }

  if (normalized.includes("colmena") || normalized.includes("seguros colmena")) {
    return "colmena";
  }

  if (
    normalized.includes("particular") ||
    normalized.includes("privado") ||
    normalized.includes("sin isapre") ||
    normalized.includes("sin cobertura") ||
    normalized.includes("autofinanciado")
  ) {
    return "particular";
  }

  if (normalized.includes("isapre")) {
    return null;
  }

  return null;
}

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

  return labels[code];
}
