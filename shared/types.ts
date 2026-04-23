/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export * from "./_core/errors";

export type ProcedureType = "cirugia" | "procedimiento" | "interconsulta";
export type ScheduleType = "habil" | "inhabil";

export const PROCEDURE_TYPE_LABELS: Record<ProcedureType, string> = {
  cirugia: "Cirugía",
  procedimiento: "Procedimiento",
  interconsulta: "Interconsulta",
};

export const SCHEDULE_TYPE_LABELS: Record<ScheduleType, string> = {
  habil: "Hábil",
  inhabil: "Inhábil",
};

export const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];
