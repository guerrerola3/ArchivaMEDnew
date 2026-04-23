import { describe, it, expect } from "vitest";
import { normalizeProvision, getProvisionLabel } from "../lib/provision-mapper";

describe("normalizeProvision", () => {
  describe("FONASA variations", () => {
    it("should normalize 'fonasa'", () => {
      expect(normalizeProvision("fonasa")).toBe("fonasa");
    });

    it("should normalize 'FONASA' (uppercase)", () => {
      expect(normalizeProvision("FONASA")).toBe("fonasa");
    });

    it("should normalize 'Fonasa' (mixed case)", () => {
      expect(normalizeProvision("Fonasa")).toBe("fonasa");
    });

    it("should normalize 'Fondo Nacional de Salud'", () => {
      expect(normalizeProvision("Fondo Nacional de Salud")).toBe("fonasa");
    });

    it("should normalize with extra spaces", () => {
      expect(normalizeProvision("  FONASA  ")).toBe("fonasa");
    });
  });

  describe("Cruz Blanca variations", () => {
    it("should normalize 'cruz blanca'", () => {
      expect(normalizeProvision("cruz blanca")).toBe("cruz_blanca");
    });

    it("should normalize 'Cruz Blanca'", () => {
      expect(normalizeProvision("Cruz Blanca")).toBe("cruz_blanca");
    });

    it("should normalize 'CRUZ BLANCA'", () => {
      expect(normalizeProvision("CRUZ BLANCA")).toBe("cruz_blanca");
    });

    it("should normalize 'Seguros Cruz Blanca'", () => {
      expect(normalizeProvision("Seguros Cruz Blanca")).toBe("cruz_blanca");
    });
  });

  describe("Nueva Masvida variations", () => {
    it("should normalize 'nueva masvida'", () => {
      expect(normalizeProvision("nueva masvida")).toBe("nueva_masvida");
    });

    it("should normalize 'Nueva Masvida'", () => {
      expect(normalizeProvision("Nueva Masvida")).toBe("nueva_masvida");
    });

    it("should normalize 'Masvida'", () => {
      expect(normalizeProvision("Masvida")).toBe("nueva_masvida");
    });

    it("should normalize 'mas vida'", () => {
      expect(normalizeProvision("mas vida")).toBe("nueva_masvida");
    });
  });

  describe("Consalud variations", () => {
    it("should normalize 'consalud'", () => {
      expect(normalizeProvision("consalud")).toBe("consalud");
    });

    it("should normalize 'Consalud'", () => {
      expect(normalizeProvision("Consalud")).toBe("consalud");
    });

    it("should normalize 'Seguros Consalud'", () => {
      expect(normalizeProvision("Seguros Consalud")).toBe("consalud");
    });
  });

  describe("Vida Tres variations", () => {
    it("should normalize 'vida tres'", () => {
      expect(normalizeProvision("vida tres")).toBe("vida_tres");
    });

    it("should normalize 'Vida Tres'", () => {
      expect(normalizeProvision("Vida Tres")).toBe("vida_tres");
    });

    it("should normalize 'VidaTres'", () => {
      expect(normalizeProvision("VidaTres")).toBe("vida_tres");
    });
  });

  describe("Colmena variations", () => {
    it("should normalize 'colmena'", () => {
      expect(normalizeProvision("colmena")).toBe("colmena");
    });

    it("should normalize 'Colmena'", () => {
      expect(normalizeProvision("Colmena")).toBe("colmena");
    });

    it("should normalize 'Seguros Colmena'", () => {
      expect(normalizeProvision("Seguros Colmena")).toBe("colmena");
    });
  });

  describe("Particular variations", () => {
    it("should normalize 'particular'", () => {
      expect(normalizeProvision("particular")).toBe("particular");
    });

    it("should normalize 'Particular'", () => {
      expect(normalizeProvision("Particular")).toBe("particular");
    });

    it("should normalize 'privado'", () => {
      expect(normalizeProvision("privado")).toBe("particular");
    });

    it("should normalize 'sin isapre'", () => {
      expect(normalizeProvision("sin isapre")).toBe("particular");
    });

    it("should normalize 'autofinanciado'", () => {
      expect(normalizeProvision("autofinanciado")).toBe("particular");
    });
  });

  describe("Edge cases", () => {
    it("should return null for null input", () => {
      expect(normalizeProvision(null)).toBe(null);
    });

    it("should return null for undefined input", () => {
      expect(normalizeProvision(undefined)).toBe(null);
    });

    it("should return null for empty string", () => {
      expect(normalizeProvision("")).toBe(null);
    });

    it("should return null for 'isapre' without specific provider", () => {
      expect(normalizeProvision("isapre")).toBe(null);
    });

    it("should return null for unknown provider", () => {
      expect(normalizeProvision("unknown provider")).toBe(null);
    });
  });
});

describe("getProvisionLabel", () => {
  it("should return correct label for fonasa", () => {
    expect(getProvisionLabel("fonasa")).toBe("FONASA");
  });

  it("should return correct label for cruz_blanca", () => {
    expect(getProvisionLabel("cruz_blanca")).toBe("Cruz Blanca");
  });

  it("should return correct label for nueva_masvida", () => {
    expect(getProvisionLabel("nueva_masvida")).toBe("Nueva Masvida");
  });

  it("should return correct label for consalud", () => {
    expect(getProvisionLabel("consalud")).toBe("Consalud");
  });

  it("should return correct label for vida_tres", () => {
    expect(getProvisionLabel("vida_tres")).toBe("Vida Tres");
  });

  it("should return correct label for colmena", () => {
    expect(getProvisionLabel("colmena")).toBe("Colmena");
  });

  it("should return correct label for particular", () => {
    expect(getProvisionLabel("particular")).toBe("Particular");
  });

  it("should return empty string for null", () => {
    expect(getProvisionLabel(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(getProvisionLabel(undefined)).toBe("");
  });
});
