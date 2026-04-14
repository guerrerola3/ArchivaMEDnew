import { Platform } from "react-native";

type RecognitionResult = {
  text: string;
  engine: "expo-text-recognition" | "fallback";
  warning?: string;
};

function collectTextFragments(value: unknown, output: string[]) {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length > 0) output.push(trimmed);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectTextFragments(entry, output));
    return;
  }

  if (!value || typeof value !== "object") return;

  for (const [key, nested] of Object.entries(value)) {
    if (key === "value" || key === "text" || key === "result" || key === "lines" || key === "blocks") {
      collectTextFragments(nested, output);
    }
  }
}

function normalizeRecognitionPayload(payload: unknown): string {
  const fragments: string[] = [];
  collectTextFragments(payload, fragments);
  return Array.from(new Set(fragments)).join("\n");
}

export async function recognizeTextFromImage(imageUri: string | null): Promise<RecognitionResult> {
  if (!imageUri || Platform.OS === "web") {
    return {
      text: "",
      engine: "fallback",
      warning: "OCR nativo no está disponible en web.",
    };
  }

  try {
    const textRecognitionModule = require("expo-text-recognition");
    const recognize =
      textRecognitionModule?.recognize ??
      textRecognitionModule?.default?.recognize;

    if (typeof recognize !== "function") {
      return {
        text: "",
        engine: "fallback",
        warning: "La librería de OCR nativo no expone recognize().",
      };
    }

    const rawResult = await recognize(imageUri);
    const text = normalizeRecognitionPayload(rawResult);

    if (!text) {
      return {
        text: "",
        engine: "fallback",
        warning: "OCR nativo no detectó texto legible en la imagen.",
      };
    }

    return {
      text,
      engine: "expo-text-recognition",
    };
  } catch (error) {
    return {
      text: "",
      engine: "fallback",
      warning:
        "OCR nativo no está instalado o falló en este dispositivo. Se usará extracción local básica.",
    };
  }
}
