import { invokeLLM } from "./server/_core/llm";
import * as dotenv from "dotenv";

dotenv.config();

async function test() {
  console.log("🚀 Iniciando prueba de LLM...");
  console.log("API URL:", process.env.BUILT_IN_FORGE_API_URL || "https://forge.manus.im");
  console.log("API KEY (primeros 5):", process.env.BUILT_IN_FORGE_API_KEY?.substring(0, 5) || "MISSING");

  try {
    const result = await invokeLLM({
      messages: [
        { role: "user", content: "Hola, responde con la palabra 'OK' si puedes leerme." }
      ],
      maxTokens: 10
    });
    console.log("✅ Respuesta recibida:", JSON.stringify(result.choices[0].message.content));
  } catch (error) {
    console.error("❌ Error en la prueba de LLM:", error);
  }
}

test();
