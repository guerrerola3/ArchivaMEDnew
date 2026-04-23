import { Platform } from "react-native";

type RecognitionResult = {
  text: string;
  engine: "@react-native-ml-kit/text-recognition" | "fallback";
  warning?: string;
};

function normalizeOcrText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n")
    .trim();
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
    const textRecognitionModule = require("@react-native-ml-kit/text-recognition");
    const recognize =
      textRecognitionModule?.default?.recognize ??
      textRecognitionModule?.recognize;

    if (typeof recognize !== "function") {
      return {
        text: "",
        engine: "fallback",
        warning: "La librería de OCR nativo no expone recognize().",
      };
    }

    const rawResult = await recognize(imageUri);
    const text = normalizeOcrText(
      typeof rawResult?.text === "string" ? rawResult.text : "",
    );

    if (!text) {
      return {
        text: "",
        engine: "fallback",
        warning: "OCR nativo no detectó texto legible en la imagen.",
      };
    }

    return {
      text,
      engine: "@react-native-ml-kit/text-recognition",
    };
  } catch {
    return {
      text: "",
      engine: "fallback",
      warning:
        "OCR nativo no está disponible en esta build. Genera una development build de iOS y vuelve a intentar.",
    };
  }
}
