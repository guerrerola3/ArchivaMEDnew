import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import type { LocalProcedure } from "@/lib/procedures-context";

const LEGACY_STORAGE_KEY = "traumalog_procedures";
const META_MIGRATION_KEY = "procedures_asyncstorage_migrated";
const db = SQLite.openDatabaseSync("archivamed.db");

type ProcedureRow = {
  localId: string;
  synced: number;
  patientName: string;
  patientRut: string;
  date: string;
  prestacionNumber: string | null;
  diagnosis: string | null;
  procedureName: string | null;
  procedureCode: string | null;
  type: LocalProcedure["type"];
  schedule: LocalProcedure["schedule"];
  clinic: string;
  provision: string | null;
  photoUrl: string | null;
  notes: string | null;
  invoiceIssued: number;
  isPaid: number;
  createdAt: string;
  updatedAt: string;
};

function rowToProcedure(row: ProcedureRow): LocalProcedure {
  return {
    localId: row.localId,
    synced: row.synced === 1,
    patientName: row.patientName,
    patientRut: row.patientRut,
    date: row.date,
    prestacionNumber: row.prestacionNumber,
    diagnosis: row.diagnosis,
    procedureName: row.procedureName,
    procedureCode: row.procedureCode,
    type: row.type,
    schedule: row.schedule,
    clinic: row.clinic,
    provision: row.provision,
    photoUrl: row.photoUrl,
    notes: row.notes,
    invoiceIssued: row.invoiceIssued === 1,
    isPaid: row.isPaid === 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function markMigrationDone() {
  await db.runAsync(
    "INSERT OR REPLACE INTO app_meta (key, value) VALUES (?, ?)",
    META_MIGRATION_KEY,
    "1",
  );
}

async function hasCompletedMigration(): Promise<boolean> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM app_meta WHERE key = ?",
    META_MIGRATION_KEY,
  );
  return row?.value === "1";
}

async function migrateFromLegacyAsyncStorage() {
  if (await hasCompletedMigration()) return;

  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacy) {
    await markMigrationDone();
    return;
  }

  try {
    const procedures = JSON.parse(legacy) as LocalProcedure[];
    await db.withTransactionAsync(async () => {
      for (const procedure of procedures) {
        await upsertProcedure(procedure);
      }
    });
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to migrate procedures from AsyncStorage:", error);
  } finally {
    await markMigrationDone();
  }
}

export async function initializeProceduresDb() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS procedures (
      localId TEXT PRIMARY KEY NOT NULL,
      synced INTEGER NOT NULL DEFAULT 1,
      patientName TEXT NOT NULL,
      patientRut TEXT NOT NULL,
      date TEXT NOT NULL,
      prestacionNumber TEXT,
      diagnosis TEXT,
      procedureName TEXT,
      procedureCode TEXT,
      type TEXT NOT NULL,
      schedule TEXT NOT NULL,
      clinic TEXT NOT NULL,
      provision TEXT,
      photoUrl TEXT,
      notes TEXT,
      invoiceIssued INTEGER NOT NULL DEFAULT 0,
      isPaid INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS app_meta (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_procedures_date ON procedures(date DESC);
  `);

  await migrateFromLegacyAsyncStorage();
}

export async function listProcedures(): Promise<LocalProcedure[]> {
  const rows = await db.getAllAsync<ProcedureRow>(
    "SELECT * FROM procedures ORDER BY date DESC",
  );
  return rows.map(rowToProcedure);
}

export async function upsertProcedure(procedure: LocalProcedure): Promise<void> {
  await db.runAsync(
    `INSERT OR REPLACE INTO procedures (
      localId, synced, patientName, patientRut, date, prestacionNumber, diagnosis,
      procedureName, procedureCode, type, schedule, clinic, provision, photoUrl,
      notes, invoiceIssued, isPaid, createdAt, updatedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    procedure.localId,
    procedure.synced ? 1 : 0,
    procedure.patientName,
    procedure.patientRut,
    procedure.date,
    procedure.prestacionNumber ?? null,
    procedure.diagnosis ?? null,
    procedure.procedureName ?? null,
    procedure.procedureCode ?? null,
    procedure.type,
    procedure.schedule,
    procedure.clinic,
    procedure.provision ?? null,
    procedure.photoUrl ?? null,
    procedure.notes ?? null,
    procedure.invoiceIssued ? 1 : 0,
    procedure.isPaid ? 1 : 0,
    procedure.createdAt,
    procedure.updatedAt,
  );
}

export async function deleteProcedureById(localId: string): Promise<void> {
  await db.runAsync("DELETE FROM procedures WHERE localId = ?", localId);
}
