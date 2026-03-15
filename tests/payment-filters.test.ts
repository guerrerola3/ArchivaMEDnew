import { describe, it, expect } from "vitest";

describe("Payment Filters", () => {
  // Mock procedures data
  const mockProcedures = [
    {
      localId: "1",
      patientName: "Juan Pérez",
      date: new Date("2026-03-01"),
      isPaid: true,
      invoiceIssued: true,
      type: "cirugia" as const,
      schedule: "habil" as const,
      patientRut: "12345678-9",
      diagnosis: "Test",
      procedureName: "Cirugía",
      procedureCode: "001",
      clinic: "Clínica A",
      prestacionNumber: "123",
      notes: "Notes",
    },
    {
      localId: "2",
      patientName: "María García",
      date: new Date("2026-03-02"),
      isPaid: false,
      invoiceIssued: true,
      type: "procedimiento" as const,
      schedule: "habil" as const,
      patientRut: "87654321-0",
      diagnosis: "Test 2",
      procedureName: "Procedimiento",
      procedureCode: "002",
      clinic: "Clínica B",
      prestacionNumber: "124",
      notes: "Notes 2",
    },
    {
      localId: "3",
      patientName: "Carlos López",
      date: new Date("2026-03-03"),
      isPaid: false,
      invoiceIssued: false,
      type: "interconsulta" as const,
      schedule: "inhabil" as const,
      patientRut: "11111111-1",
      diagnosis: "Test 3",
      procedureName: "Interconsulta",
      procedureCode: "003",
      clinic: "Clínica C",
      prestacionNumber: "125",
      notes: "Notes 3",
    },
  ];

  it("should filter paid procedures", () => {
    const paidProcedures = mockProcedures.filter((p) => p.isPaid);
    expect(paidProcedures).toHaveLength(1);
    expect(paidProcedures[0].patientName).toBe("Juan Pérez");
  });

  it("should filter unpaid procedures", () => {
    const unpaidProcedures = mockProcedures.filter((p) => !p.isPaid);
    expect(unpaidProcedures).toHaveLength(2);
    expect(unpaidProcedures[0].patientName).toBe("María García");
    expect(unpaidProcedures[1].patientName).toBe("Carlos López");
  });

  it("should filter procedures with invoice issued", () => {
    const invoicedProcedures = mockProcedures.filter((p) => p.invoiceIssued);
    expect(invoicedProcedures).toHaveLength(2);
    expect(invoicedProcedures[0].patientName).toBe("Juan Pérez");
    expect(invoicedProcedures[1].patientName).toBe("María García");
  });

  it("should filter procedures without invoice issued", () => {
    const notInvoicedProcedures = mockProcedures.filter((p) => !p.invoiceIssued);
    expect(notInvoicedProcedures).toHaveLength(1);
    expect(notInvoicedProcedures[0].patientName).toBe("Carlos López");
  });

  it("should count unpaid procedures for badge", () => {
    const unpaidCount = mockProcedures.filter((p) => !p.isPaid).length;
    expect(unpaidCount).toBe(2);
    expect(unpaidCount > 0).toBe(true);
  });

  it("should format badge text correctly", () => {
    const unpaidCount = 15;
    const badgeText = unpaidCount > 9 ? "9+" : unpaidCount;
    expect(badgeText).toBe("9+");

    const unpaidCount2 = 5;
    const badgeText2 = unpaidCount2 > 9 ? "9+" : unpaidCount2;
    expect(badgeText2).toBe(5);
  });

  it("should combine type and payment filters", () => {
    // Filter by type procedimiento and unpaid
    let result = mockProcedures.filter((p) => p.type === "procedimiento");
    result = result.filter((p) => !p.isPaid);

    expect(result).toHaveLength(1);
    expect(result[0].patientName).toBe("María García");
  });
});
