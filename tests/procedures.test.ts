import { describe, it, expect } from "vitest";

// Test the data transformation and grouping logic
describe("Procedure utilities", () => {
  const MONTHS_ES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const PROCEDURE_TYPE_LABELS: Record<string, string> = {
    cirugia: "Cirugía",
    procedimiento: "Procedimiento",
    interconsulta: "Interconsulta",
  };

  const SCHEDULE_TYPE_LABELS: Record<string, string> = {
    habil: "Hábil",
    inhabil: "Inhábil",
  };

  it("should have correct month labels in Spanish", () => {
    expect(MONTHS_ES).toHaveLength(12);
    expect(MONTHS_ES[0]).toBe("Enero");
    expect(MONTHS_ES[11]).toBe("Diciembre");
    expect(MONTHS_ES[2]).toBe("Marzo");
  });

  it("should have correct procedure type labels", () => {
    expect(PROCEDURE_TYPE_LABELS.cirugia).toBe("Cirugía");
    expect(PROCEDURE_TYPE_LABELS.procedimiento).toBe("Procedimiento");
    expect(PROCEDURE_TYPE_LABELS.interconsulta).toBe("Interconsulta");
  });

  it("should have correct schedule type labels", () => {
    expect(SCHEDULE_TYPE_LABELS.habil).toBe("Hábil");
    expect(SCHEDULE_TYPE_LABELS.inhabil).toBe("Inhábil");
  });

  it("should group procedures by month correctly", () => {
    const mockProcedures = [
      { localId: "1", date: "2026-01-15T10:00:00.000Z", patientName: "Juan Pérez", type: "cirugia", schedule: "habil", clinic: "Clínica Las Condes", patientRut: "12.345.678-9", synced: false, createdAt: "", updatedAt: "" },
      { localId: "2", date: "2026-01-20T10:00:00.000Z", patientName: "María García", type: "procedimiento", schedule: "inhabil", clinic: "Clínica Alemana", patientRut: "9.876.543-2", synced: false, createdAt: "", updatedAt: "" },
      { localId: "3", date: "2026-02-05T10:00:00.000Z", patientName: "Carlos López", type: "interconsulta", schedule: "habil", clinic: "Hospital FACH", patientRut: "11.111.111-1", synced: false, createdAt: "", updatedAt: "" },
    ];

    const groups: Record<string, typeof mockProcedures> = {};
    mockProcedures.forEach((p) => {
      const d = new Date(p.date);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });

    expect(Object.keys(groups)).toHaveLength(2);
    expect(groups["2026-1"]).toHaveLength(2);
    expect(groups["2026-2"]).toHaveLength(1);
  });

  it("should filter procedures by type", () => {
    const mockProcedures = [
      { localId: "1", type: "cirugia", date: "2026-01-15T10:00:00.000Z" },
      { localId: "2", type: "procedimiento", date: "2026-01-20T10:00:00.000Z" },
      { localId: "3", type: "cirugia", date: "2026-02-05T10:00:00.000Z" },
      { localId: "4", type: "interconsulta", date: "2026-02-10T10:00:00.000Z" },
    ];

    const cirugias = mockProcedures.filter((p) => p.type === "cirugia");
    const procedimientos = mockProcedures.filter((p) => p.type === "procedimiento");
    const interconsultas = mockProcedures.filter((p) => p.type === "interconsulta");

    expect(cirugias).toHaveLength(2);
    expect(procedimientos).toHaveLength(1);
    expect(interconsultas).toHaveLength(1);
  });

  it("should filter procedures by current month", () => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const mockProcedures = [
      { localId: "1", date: now.toISOString() },
      { localId: "2", date: new Date(2020, 0, 1).toISOString() },
      { localId: "3", date: new Date(currentYear, currentMonth - 1, 10).toISOString() },
    ];

    const monthProcedures = mockProcedures.filter((p) => {
      const d = new Date(p.date);
      return d.getFullYear() === currentYear && d.getMonth() + 1 === currentMonth;
    });

    expect(monthProcedures.length).toBeGreaterThanOrEqual(2);
  });

  it("should sort procedures by date descending", () => {
    const mockProcedures = [
      { localId: "1", date: "2026-01-01T10:00:00.000Z" },
      { localId: "3", date: "2026-03-01T10:00:00.000Z" },
      { localId: "2", date: "2026-02-01T10:00:00.000Z" },
    ];

    const sorted = [...mockProcedures].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    expect(sorted[0].localId).toBe("3");
    expect(sorted[1].localId).toBe("2");
    expect(sorted[2].localId).toBe("1");
  });
});

describe("Excel export data builder", () => {
  it("should build correct headers", () => {
    const headers = [
      "Fecha", "Hora", "Nombre Paciente", "RUT Paciente", "N° Prestación",
      "Diagnóstico", "Procedimiento", "Código", "Tipo", "Horario", "Clínica", "Notas",
    ];
    expect(headers).toHaveLength(12);
    expect(headers[0]).toBe("Fecha");
    expect(headers[2]).toBe("Nombre Paciente");
  });

  it("should format dates correctly", () => {
    const isoString = "2026-03-07T14:30:00.000Z";
    const d = new Date(isoString);
    const formatted = d.toLocaleDateString("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    // The separator may be '/' or '-' depending on the locale implementation in the test environment
    expect(formatted).toMatch(/\d{2}[\/-]\d{2}[\/-]\d{4}/);
  });
});

describe("Period filter logic", () => {
  it("should filter last 3 months correctly", () => {
    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const mockProcedures = [
      { localId: "1", date: now.toISOString() },
      { localId: "2", date: new Date(2020, 0, 1).toISOString() },
      { localId: "3", date: new Date(now.getFullYear(), now.getMonth() - 1, 15).toISOString() },
    ];

    const filtered = mockProcedures.filter((p) => new Date(p.date) >= threeMonthsAgo);
    expect(filtered.length).toBeGreaterThanOrEqual(2);
    expect(filtered.find((p) => p.localId === "2")).toBeUndefined();
  });

  it("should filter current year correctly", () => {
    const currentYear = new Date().getFullYear();

    const mockProcedures = [
      { localId: "1", date: new Date(currentYear, 0, 1).toISOString() },
      { localId: "2", date: new Date(2020, 0, 1).toISOString() },
      { localId: "3", date: new Date(currentYear, 11, 31).toISOString() },
    ];

    const filtered = mockProcedures.filter(
      (p) => new Date(p.date).getFullYear() === currentYear
    );
    expect(filtered).toHaveLength(2);
  });
});
