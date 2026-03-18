import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { trpc } from "./trpc";
import { useAuth } from "@/hooks/use-auth";

export type ProcedureType = "cirugia" | "procedimiento" | "interconsulta";
export type ScheduleType = "habil" | "inhabil";
// Provision es ahora un campo de texto libre (string)

export interface LocalProcedure {
  localId: string;
  serverId?: number;
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

const STORAGE_KEY = "traumalog_procedures";

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
  const { isAuthenticated } = useAuth();

  const createMutation = trpc.procedures.create.useMutation();
  const updateMutation = trpc.procedures.update.useMutation();
  const deleteMutation = trpc.procedures.delete.useMutation();
  const listQuery = trpc.procedures.list.useQuery(undefined, {
    enabled: isAuthenticated,
    retry: false,
  });

  // Load from local storage on mount
  useEffect(() => {
    loadFromStorage();
  }, []);

  // Sync from server when authenticated
  useEffect(() => {
    if (isAuthenticated && listQuery.data) {
      mergeServerData(listQuery.data);
    }
  }, [isAuthenticated, listQuery.data]);

  async function loadFromStorage() {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        setProcedures(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load procedures from storage:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function saveToStorage(data: LocalProcedure[]) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Failed to save procedures to storage:", e);
    }
  }

  function mergeServerData(serverData: any[]) {
    setProcedures((prev) => {
      const serverMapped: LocalProcedure[] = serverData.map((sp) => ({
        localId: `server_${sp.id}`,
        serverId: sp.id,
        synced: true,
        patientName: sp.patientName,
        patientRut: sp.patientRut,
        date: sp.date instanceof Date ? sp.date.toISOString() : sp.date,
        prestacionNumber: sp.prestacionNumber,
        diagnosis: sp.diagnosis,
        procedureName: sp.procedureName,
        procedureCode: sp.procedureCode,
        type: sp.type as ProcedureType,
        schedule: sp.schedule as ScheduleType,
        clinic: sp.clinic,
        photoUrl: sp.photoUrl,
        notes: sp.notes,
        invoiceIssued: sp.invoiceIssued === 1 || sp.invoiceIssued === true,
        isPaid: sp.isPaid === 1 || sp.isPaid === true,
        createdAt: sp.createdAt instanceof Date ? sp.createdAt.toISOString() : sp.createdAt,
        updatedAt: sp.updatedAt instanceof Date ? sp.updatedAt.toISOString() : sp.updatedAt,
      }));

      // Keep local unsynced items + merge server data
      const localOnly = prev.filter((p) => !p.synced && !p.serverId);
      const merged = [...serverMapped, ...localOnly];

      // Sort by date descending
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      saveToStorage(merged);
      return merged;
    });
  }

  const addProcedure = useCallback(
    async (data: Omit<LocalProcedure, "localId" | "synced" | "createdAt" | "updatedAt">): Promise<string> => {
      const localId = generateId();
      const now = new Date().toISOString();
      const newProc: LocalProcedure = {
        ...data,
        localId,
        synced: false,
        createdAt: now,
        updatedAt: now,
      };

      const updated = [newProc, ...procedures].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setProcedures(updated);
      await saveToStorage(updated);

      // Try to sync with server
      if (isAuthenticated) {
        try {
          const serverId = await createMutation.mutateAsync({
            patientName: data.patientName,
            patientRut: data.patientRut,
            date: data.date,
            prestacionNumber: data.prestacionNumber,
            diagnosis: data.diagnosis,
            procedureName: data.procedureName,
            procedureCode: data.procedureCode,
            type: data.type,
            schedule: data.schedule,
            clinic: data.clinic,
            photoUrl: data.photoUrl,
            notes: data.notes,
            invoiceIssued: data.invoiceIssued,
            isPaid: data.isPaid,
          });

          const synced = updated.map((p) =>
            p.localId === localId
              ? { ...p, serverId: serverId as number, synced: true, localId: `server_${serverId}` }
              : p
          );
          setProcedures(synced);
          await saveToStorage(synced);
        } catch (e) {
          console.warn("Failed to sync new procedure:", e);
        }
      }

      return localId;
    },
    [procedures, isAuthenticated, createMutation]
  );

  const updateProcedure = useCallback(
    async (localId: string, data: Partial<LocalProcedure>): Promise<void> => {
      const updated = procedures.map((p) =>
        p.localId === localId
          ? { ...p, ...data, synced: false, updatedAt: new Date().toISOString() }
          : p
      );
      setProcedures(updated);
      await saveToStorage(updated);

      const proc = updated.find((p) => p.localId === localId);
      if (isAuthenticated && proc?.serverId) {
        try {
          await updateMutation.mutateAsync({
            id: proc.serverId,
            ...data,
          });
          const synced = updated.map((p) =>
            p.localId === localId ? { ...p, synced: true } : p
          );
          setProcedures(synced);
          await saveToStorage(synced);
        } catch (e) {
          console.warn("Failed to sync updated procedure:", e);
        }
      }
    },
    [procedures, isAuthenticated, updateMutation]
  );

  const deleteProcedure = useCallback(
    async (localId: string): Promise<void> => {
      const proc = procedures.find((p) => p.localId === localId);
      const updated = procedures.filter((p) => p.localId !== localId);
      setProcedures(updated);
      await saveToStorage(updated);

      if (isAuthenticated && proc?.serverId) {
        try {
          await deleteMutation.mutateAsync({ id: proc.serverId });
        } catch (e) {
          console.warn("Failed to sync delete:", e);
        }
      }
    },
    [procedures, isAuthenticated, deleteMutation]
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
    if (!isAuthenticated) return;
    await listQuery.refetch();
  }, [isAuthenticated, listQuery]);

  const refreshFromServer = useCallback(async () => {
    if (!isAuthenticated) return;
    await listQuery.refetch();
  }, [isAuthenticated, listQuery]);

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
