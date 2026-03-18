import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";

const procedureSchema = z.object({
  patientName: z.string().min(1),
  patientRut: z.string().min(1),
  date: z.string(),
  prestacionNumber: z.string().optional().nullable(),
  diagnosis: z.string().optional().nullable(),
  procedureName: z.string().optional().nullable(),
  procedureCode: z.string().optional().nullable(),
  type: z.enum(["cirugia", "procedimiento", "interconsulta"]),
  schedule: z.enum(["habil", "inhabil"]),
  clinic: z.string().min(1),
  provision: z.enum(["fonasa", "cruz_blanca", "nueva_masvida", "consalud", "vida_tres", "colmena", "particular"]).optional().nullable(),
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  invoiceIssued: z.boolean().optional(),
  isPaid: z.boolean().optional(),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  procedures: router({
    list: protectedProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        type: z.enum(["cirugia", "procedimiento", "interconsulta"]).optional(),
        clinic: z.string().optional(),
      }).optional())
      .query(({ ctx, input }) => {
        return db.getUserProcedures(ctx.user.id, {
          startDate: input?.startDate ? new Date(input.startDate) : undefined,
          endDate: input?.endDate ? new Date(input.endDate) : undefined,
          type: input?.type,
          clinic: input?.clinic,
        });
      }),

    byPeriod: protectedProcedure
      .input(z.object({ year: z.number(), month: z.number().optional() }))
      .query(({ ctx, input }) => {
        return db.getProceduresByPeriod(ctx.user.id, input.year, input.month);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => {
        return db.getProcedureById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(procedureSchema)
      .mutation(({ ctx, input }) => {
        return db.createProcedure({
          userId: ctx.user.id,
          patientName: input.patientName,
          patientRut: input.patientRut,
          date: new Date(input.date),
          prestacionNumber: input.prestacionNumber ?? undefined,
          diagnosis: input.diagnosis ?? undefined,
          procedureName: input.procedureName ?? undefined,
          procedureCode: input.procedureCode ?? undefined,
          type: input.type,
          schedule: input.schedule,
          clinic: input.clinic,
          provision: input.provision ?? undefined,
          photoUrl: input.photoUrl ?? undefined,
          notes: input.notes ?? undefined,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(procedureSchema.partial()))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        const updateData: any = {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
        };
        // Convert boolean to number for database compatibility
        if (data.invoiceIssued !== undefined) {
          updateData.invoiceIssued = data.invoiceIssued ? 1 : 0;
        }
        if (data.isPaid !== undefined) {
          updateData.isPaid = data.isPaid ? 1 : 0;
        }
        return db.updateProcedure(id, ctx.user.id, updateData);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteProcedure(input.id, ctx.user.id);
      }),

    updatePaymentStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        invoiceIssued: z.boolean().optional(),
        isPaid: z.boolean().optional(),
      }))
      .mutation(({ ctx, input }) => {
        return db.updateProcedurePaymentStatus(
          input.id,
          ctx.user.id,
          input.invoiceIssued,
          input.isPaid
        );
      }),

    extractFromPhoto: publicProcedure
      .input(z.object({
        imageBase64: z.string(),
        mimeType: z.string().default("image/jpeg"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Upload image to storage (use user id if authenticated, else anonymous)
        const userId = ctx.user?.id ?? "anon";
        const imageBuffer = Buffer.from(input.imageBase64, "base64");
        const fileName = `procedures/${userId}/${Date.now()}.jpg`;
        const { url: photoUrl } = await storagePut(fileName, imageBuffer, input.mimeType);

        const systemMessage = `Eres un asistente médico especializado en extraer datos de protocolos operatorios y fichas clínicas chilenas.

INSTRUCCIONES CRÍTICAS:
1. NOMBRES Y APELLIDOS: En protocolos chilenos, el nombre suele estar en formato "Apellido, Nombre" o "Apellido Apellido, Nombre". IMPORTANTE: Extrae el nombre en orden natural: "Nombre Apellido(s)" (NO invertido). Si ves "García, Juan", devuelve "Juan García".
2. NÚMERO DE PRESTACIÓN: Busca campos etiquetados como "Número de Prestación", "Número de Episodio", "Episodio", "Admisión", "N° Admisión", "N° Episodio" o "ID Prestación". Todos estos son equivalentes al campo prestacionNumber.
3. FECHA: Busca en formato DD/MM/YYYY, DD-MM-YYYY o similar. Convierte a ISO 8601 (YYYY-MM-DDTHH:mm:ss.000Z). Si solo hay fecha sin hora, usa 00:00:00.
4. TIPO: Identifica si es una cirugía, procedimiento diagnóstico/terapéutico, o interconsulta.
5. HORARIO: Determina si fue en horario hábil (lunes-viernes 8:00-17:00) o inhábil basándote en la fecha/hora si está disponible.
6. DESCRIPCIÓN DEL PROCEDIMIENTO: Busca secciones tituladas "Descripción del Procedimiento", "Hallazgos Quirúrgicos", "Protocolo Quirúrgico", "Procedimiento Realizado", "Descripción de la Intervención", "Acto Quirúrgico" o "Tcnica Quirúrgica". Extrae el texto descriptivo completo (puede ser un párrafo largo con detalles de lo realizado). Este texto va en el campo "notes".

Analiza la imagen y extrae los siguientes datos en formato JSON:
- patientName: Nombre completo del paciente (en orden natural: Nombre Apellido, NO invertido)
- patientRut: RUT del paciente (formato XX.XXX.XXX-X)
- date: Fecha del procedimiento (formato ISO 8601: YYYY-MM-DDTHH:mm:ss.000Z)
- prestacionNumber: Número de prestación/episodio/admisión (busca en etiquetas alternativas como "N° Episodio", "Admisión", etc.)
- diagnosis: Diagnóstico principal
- procedureName: Nombre del procedimiento realizado
- procedureCode: Código del procedimiento o cirugía
- type: Tipo (exactamente: "cirugia", "procedimiento", o "interconsulta")
- schedule: Horario (exactamente: "habil" o "inhabil")
- clinic: Nombre de la clínica u hospital
- notes: Descripción completa del procedimiento/hallazgos quirúrgicos (texto de la sección de descripción si existe, puede ser largo)

Si no puedes leer algún campo, déjalo como null.
Responde SOLO con el JSON válido, sin texto adicional.`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: [
                { type: "text", text: "Extrae TODOS los datos de este protocolo operatorio o ficha clínica chilena. IMPORTANTE: (1) El nombre del paciente debe estar en orden natural (Nombre Apellido), NO invertido. (2) Busca cualquier campo que diga 'Número de Episodio', 'Admisión', 'N° Episodio' o similar - son equivalentes a 'Número de Prestación'. (3) En el campo 'notes', extrae la descripción completa del procedimiento/hallazgos quirúrgicos si existe. Responde SOLO con JSON válido." },
                { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
              ],
            },
          ],
          maxTokens: 2000,
        });

        const responseText = llmResult.choices?.[0]?.message?.content;
        const responseStr = typeof responseText === "string" ? responseText : JSON.stringify(responseText);

        let extractedData: Record<string, unknown> = {};
        try {
          const cleaned = responseStr.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
          extractedData = JSON.parse(cleaned);
        } catch {
          console.error("Failed to parse LLM response:", responseStr);
        }

        return { photoUrl, extractedData };
      }),
  }),
});

export type AppRouter = typeof appRouter;
