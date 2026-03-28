import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  health: publicProcedure.query(() => ({ status: "ok" })),

  extractFromPhoto: publicProcedure
    .input(z.object({
      imageBase64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      localOcrText: z.string().nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user?.id ?? "anon";
      const imageBuffer = Buffer.from(input.imageBase64, "base64");
      const fileName = `procedures/${userId}/${Date.now()}.jpg`;
      const { url: photoUrl } = await storagePut(fileName, imageBuffer, input.mimeType);

      const systemMessage = `Eres un asistente médico especializado en extraer datos de protocolos operatorios y fichas clínicas chilenas.

INSTRUCCIONES CRÍTICAS:
1. NOMBRES Y APELLIDOS: En protocolos chilenos, el nombre suele estar en formato "Apellido, Nombre" o "Apellido Apellido, Nombre". IMPORTANTE: Extrae el nombre en orden natural: "Nombre Apellido(s)" (NO invertido). Si ves "García, Juan", devuelve "Juan García".
2. NÚMERO DE PRESTACIÓN: Busca campos etiquetados como "Número de Prestación", "Número de Episodio", "Episodio", "Admisión", "Admisión Nº", "N° Admisión", "N° Episodio" o "ID Prestación". Todos estos son equivalentes al campo prestacionNumber.
3. FECHA: Busca en formato DD/MM/YYYY, DD-MM-YYYY o similar. Convierte a ISO 8601 (YYYY-MM-DDTHH:mm:ss.000Z). Si solo hay fecha sin hora, usa 00:00:00.
4. TIPO: Identifica si es una cirugía, procedimiento diagnóstico/terapéutico, o interconsulta.
5. HORARIO: Determina si fue en horario hábil (lunes-viernes 8:00-20:00) o inhábil basándote en la fecha/hora si está disponible.
6. DESCRIPCIÓN DEL PROCEDIMIENTO: Busca secciones tituladas "Descripción del Procedimiento", "Hallazgos Quirúrgicos", "Protocolo Quirúrgico", "Procedimiento Realizado", "Descripción de la Intervención", "Acto Quirúrgico", "Detalle operatorio" o "Técnica Quirúrgica". Extrae el texto descriptivo completo (puede ser un párrafo largo con detalles de lo realizado). Este texto va en el campo "notes".

Analiza la imagen y el texto OCR proporcionado (si existe) y extrae los siguientes datos en formato JSON:
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
Responde exclusivamente en JSON válido.
NO incluyas explicaciones.
NO incluyas markdown.
NO uses json.
Responde SOLO con el JSON válido, sin texto adicional.

El JSON debe tener EXACTAMENTE esta estructura:

{
  "patientName": string | null,
  "patientRut": string | null,
  "date": string | null,
  "prestacionNumber": string | null,
  "diagnosis": string | null,
  "procedureName": string | null,
  "procedureCode": string | null,
  "type": "cirugia" | "procedimiento" | "interconsulta" | null,
  "schedule": "habil" | "inhabil" | null,
  "clinic": string | null,
  "notes": string | null
}`;

      console.log("[OCR] Invoking LLM for extraction...");
      let llmResult;
      try {
        llmResult = await invokeLLM({
          messages: [
            { role: "system", content: systemMessage },
            {
              role: "user",
              content: [
                { type: "text", text: `Extrae TODOS los datos de este protocolo operatorio o ficha clínica chilena. IMPORTANTE: (1) El nombre del paciente debe estar en orden natural (Nombre Apellido), NO invertido. (2) Busca cualquier campo que diga 'Número de Episodio', 'Admisión', 'N° Episodio' o similar - son equivalentes a 'Número de Prestación'. (3) En el campo 'notes', extrae la descripción completa del procedimiento/hallazgos quirúrgicos si existe. Responde SOLO con JSON válido.${input.localOcrText ? `\n\nTEXTO OCR LOCAL (como referencia, si la imagen es ilegible):\n${input.localOcrText}` : ""}` },
                { type: "image_url", image_url: { url: `data:${input.mimeType};base64,${input.imageBase64}`, detail: "high" } },
              ],
            },
          ],
          maxTokens: 2000,
        });
      } catch (error) {
        console.error("[OCR] LLM invocation failed:", error);
        throw new Error(`Error al contactar el motor de IA: ${error instanceof Error ? error.message : String(error)}`);
      }

      const content = llmResult.choices[0].message.content;
      console.log("[OCR] LLM Raw Response:", content);

      if (typeof content !== "string") {
        console.error("[OCR] Invalid LLM response format:", typeof content);
        throw new Error("El motor de IA devolvió un formato inválido.");
      }

      try {
        const cleanContent = content.replace(/```json|```/g, "").trim();
        const extractedData = JSON.parse(cleanContent);
        console.log("[OCR] Successfully extracted data:", JSON.stringify(extractedData, null, 2));
        return {
          photoUrl,
          extractedData,
        };
      } catch (e) {
        console.error("[OCR] Failed to parse LLM response as JSON:", content);
        throw new Error("No se pudo procesar la respuesta de la IA como datos válidos.");
      }
    }),
});

export type AppRouter = typeof appRouter;
