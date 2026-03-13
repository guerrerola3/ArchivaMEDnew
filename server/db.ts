import { and, desc, eq, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, procedures, InsertProcedure, Procedure } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================================
// PROCEDURES CRUD
// ============================================================

export async function getUserProcedures(
  userId: number,
  filters?: {
    startDate?: Date;
    endDate?: Date;
    type?: "cirugia" | "procedimiento" | "interconsulta";
    clinic?: string;
  }
): Promise<Procedure[]> {
  const db = await getDb();
  if (!db) return [];

  const conditions = [eq(procedures.userId, userId)];

  if (filters?.startDate) {
    conditions.push(gte(procedures.date, filters.startDate));
  }
  if (filters?.endDate) {
    conditions.push(lte(procedures.date, filters.endDate));
  }
  if (filters?.type) {
    conditions.push(eq(procedures.type, filters.type));
  }
  if (filters?.clinic) {
    conditions.push(eq(procedures.clinic, filters.clinic));
  }

  return db
    .select()
    .from(procedures)
    .where(and(...conditions))
    .orderBy(desc(procedures.date));
}

export async function getProcedureById(id: number, userId: number): Promise<Procedure | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db
    .select()
    .from(procedures)
    .where(and(eq(procedures.id, id), eq(procedures.userId, userId)))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createProcedure(data: InsertProcedure): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(procedures).values(data);
  return (result as any)[0]?.insertId ?? 0;
}

export async function updateProcedure(
  id: number,
  userId: number,
  data: Partial<InsertProcedure>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(procedures)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(procedures.id, id), eq(procedures.userId, userId)));
}

export async function deleteProcedure(id: number, userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(procedures)
    .where(and(eq(procedures.id, id), eq(procedures.userId, userId)));
}

export async function getProceduresByPeriod(
  userId: number,
  year: number,
  month?: number
): Promise<Procedure[]> {
  const db = await getDb();
  if (!db) return [];

  let startDate: Date;
  let endDate: Date;

  if (month !== undefined) {
    startDate = new Date(year, month - 1, 1);
    endDate = new Date(year, month, 0, 23, 59, 59);
  } else {
    startDate = new Date(year, 0, 1);
    endDate = new Date(year, 11, 31, 23, 59, 59);
  }

  return db
    .select()
    .from(procedures)
    .where(
      and(
        eq(procedures.userId, userId),
        gte(procedures.date, startDate),
        lte(procedures.date, endDate)
      )
    )
    .orderBy(desc(procedures.date));
}

export async function updateProcedurePaymentStatus(
  id: number,
  userId: number,
  invoiceIssued?: boolean,
  isPaid?: boolean
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const updateData: Record<string, unknown> = { updatedAt: new Date() };
  if (invoiceIssued !== undefined) updateData.invoiceIssued = invoiceIssued ? 1 : 0;
  if (isPaid !== undefined) updateData.isPaid = isPaid ? 1 : 0;

  await db
    .update(procedures)
    .set(updateData)
    .where(and(eq(procedures.id, id), eq(procedures.userId, userId)));
}
