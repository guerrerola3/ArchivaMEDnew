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
  photoUrl: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
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
          photoUrl: input.photoUrl ?? undefined,
          notes: input.notes ?? undefined,
        });
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number() }).merge(procedureSchema.partial()))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return db.updateProcedure(id, ctx.user.id, {
          ...data,
          date: data.date ? new Date(data.date) : undefined,
        });
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => {
        return db.deleteProcedure(input.id, ctx.user.id);
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
Analiza la imagen y extrae los siguientes datos en formato JSON:
- patientName: Nombre completo del paciente
- patientRut: RUT del paciente (formato XX.XXX.XXX-X)
- date: Fecha del procedimiento (formato ISO 8601: YYYY-MM-DDTHH:mm:ss.000Z)
- prestacionNumber: Número de prestación o ID del procedimiento
- diagnosis: Diagnóstico principal
- procedureName: Nombre del procedimiento realizado
- procedureCode: Código del procedimiento o cirugía
- type: Tipo (exactamente: "cirugia", "procedimiento", o "interconsulta")
- schedule: Horario (exactamente: "habil" o "inhabil")
- clinic: Nombre de la clínica u hospital
- notes: Observaciones adicionales

Si no puedes leer algún campo, déjalo como null.
Responde SOLO con el JSON, sin texto adicional.`;

        const llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: [
                { type: "text", text: "Extrae los datos de este protocolo operatorio:" },
                { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
              ],
            },
          ],
          maxTokens: 1000,
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
