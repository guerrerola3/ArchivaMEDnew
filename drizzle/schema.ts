import { int, mysqlEnum, mysqlTable, text, timestamp, tinyint, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// TODO: Add your tables here

/**
 * Tabla principal de procedimientos médicos.
 * Almacena cirugías, procedimientos e interconsultas del traumatólogo.
 */
export const procedures = mysqlTable("procedures", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  // Datos del paciente
  patientName: varchar("patientName", { length: 255 }).notNull(),
  patientRut: varchar("patientRut", { length: 20 }).notNull(),

  // Datos del procedimiento
  date: timestamp("date").notNull(),
  prestacionNumber: varchar("prestacionNumber", { length: 100 }),
  diagnosis: text("diagnosis"),
  procedureName: text("procedureName"),
  procedureCode: varchar("procedureCode", { length: 100 }),

  // Clasificación
  type: mysqlEnum("type", ["cirugia", "procedimiento", "interconsulta"]).notNull().default("cirugia"),
  schedule: mysqlEnum("schedule", ["habil", "inhabil"]).notNull().default("habil"),

  // Lugar
  clinic: varchar("clinic", { length: 255 }).notNull(),

  // Imagen del protocolo
  photoUrl: text("photoUrl"),

  // Notas adicionales
  notes: text("notes"),

  // Estado de pago y facturación
  invoiceIssued: tinyint("invoiceIssued").notNull().default(0),
  isPaid: tinyint("isPaid").notNull().default(0),

  // Metadatos
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Procedure = typeof procedures.$inferSelect;
export type InsertProcedure = typeof procedures.$inferInsert;
