import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  deleteProcedureById,
  initializeProceduresDb,
  listProcedures,
  upsertProcedure,
} from "@/lib/procedures-db";

export type ProcedureType = "cirugia" | "procedimiento" | "interconsulta";
export type ScheduleType = "habil" | "inhabil";
// Provision es ahora un campo de texto libre (string)

export interface LocalProcedure {
  localId: string;
  synced: boolean;
  patientName: string;
  patientRut: string;
  date: string;
  prestacionNumber?: string | null;
  diagnosis?: string | null;
  procedureName?: string | null;
  procedureCode?: string | null;
  type: ProcedureType;
  schedule: ScheduleType;
  clinic: string;
  provision?: string | null;
  photoUrl?: string | null;
  notes?: string | null;
  invoiceIssued?: boolean;
  isPaid?: boolean;
  createdAt: string;
  updatedAt: string;
}

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

interface ProceduresContextType {
  procedures: LocalProcedure[];
  isLoading: boolean;
  addProcedure: (data: Omit<LocalProcedure, "localId" | "synced" | "createdAt" | "updatedAt">) => Promise<string>;
  updateProcedure: (localId: string, data: Partial<LocalProcedure>) => Promise<void>;
  deleteProcedure: (localId: string) => Promise<void>;
  getProceduresByMonth: (year: number, month: number) => LocalProcedure[];
  getProceduresByYear: (year: number) => LocalProcedure[];
  getAvailableMonths: () => { year: number; month: number }[];
  syncWithServer: () => Promise<void>;
  refreshFromServer: () => Promise<void>;
}

const ProceduresContext = createContext<ProceduresContextType | null>(null);

function generateId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function ProceduresProvider({ children }: { children: React.ReactNode }) {
  const [procedures, setProcedures] = useState<LocalProcedure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFromDatabase = useCallback(async () => {
    try {
      await initializeProceduresDb();
      const stored = await listProcedures();
      setProcedures(stored);
    } catch (e) {
      console.error("Failed to load procedures from SQLite:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFromDatabase();
  }, [loadFromDatabase]);

  const addProcedure = useCallback(
    async (data: Omit<LocalProcedure, "localId" | "synced" | "createdAt" | "updatedAt">): Promise<string> => {
      const localId = generateId();
      const now = new Date().toISOString();
      const newProc: LocalProcedure = {
        ...data,
        localId,
        synced: true,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newProc, ...procedures].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setProcedures(updated);
      await upsertProcedure(newProc);

      return localId;
    },
    [procedures]
  );

  const updateProcedure = useCallback(
    async (localId: string, data: Partial<LocalProcedure>): Promise<void> => {
      const updated = procedures.map((p) =>
        p.localId === localId ? { ...p, ...data, synced: true, updatedAt: new Date().toISOString() } : p
      );
      setProcedures(updated);
      const procedure = updated.find((p) => p.localId === localId);
      if (procedure) {
        await upsertProcedure(procedure);
      }
    },
    [procedures]
  );

  const deleteProcedure = useCallback(
    async (localId: string): Promise<void> => {
      const updated = procedures.filter((p) => p.localId !== localId);
      setProcedures(updated);
      await deleteProcedureById(localId);
    },
    [procedures]
  );

  const getProceduresByMonth = useCallback(
    (year: number, month: number): LocalProcedure[] => {
      return procedures.filter((p) => {
        const d = new Date(p.date);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
    },
    [procedures]
  );

  const getProceduresByYear = useCallback(
    (year: number): LocalProcedure[] => {
      return procedures.filter((p) => new Date(p.date).getFullYear() === year);
    },
    [procedures]
  );

  const getAvailableMonths = useCallback((): { year: number; month: number }[] => {
    const set = new Set<string>();
    procedures.forEach((p) => {
      const d = new Date(p.date);
      set.add(`${d.getFullYear()}-${d.getMonth() + 1}`);
    });
    return Array.from(set)
      .map((s) => {
        const [y, m] = s.split("-").map(Number);
        return { year: y, month: m };
      })
      .sort((a, b) => b.year - a.year || b.month - a.month);
  }, [procedures]);

  const syncWithServer = useCallback(async () => {
    await loadFromDatabase();
  }, [loadFromDatabase]);

  const refreshFromServer = useCallback(async () => {
    await loadFromDatabase();
  }, [loadFromDatabase]);

  return (
    <ProceduresContext.Provider
      value={{
        procedures,
        isLoading,
        addProcedure,
        updateProcedure,
        deleteProcedure,
        getProceduresByMonth,
        getProceduresByYear,
        getAvailableMonths,
        syncWithServer,
        refreshFromServer,
      }}
    >
      {children}
    </ProceduresContext.Provider>
  );
}

export function useProcedures() {
  const ctx = useContext(ProceduresContext);
  if (!ctx) throw new Error("useProcedures must be used within ProceduresProvider");
  return ctx;
}
