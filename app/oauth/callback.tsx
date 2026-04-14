import { ThemedView } from "@/components/themed-view";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OAuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"redirecting" | "done">("redirecting");

  useEffect(() => {
    const timer = setTimeout(() => {
      setStatus("done");
      router.replace("/(tabs)");
    }, 750);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <SafeAreaView className="flex-1" edges={["top", "bottom", "left", "right"]}>
      <ThemedView className="flex-1 items-center justify-center gap-4 p-5">
        <Text className="text-base leading-6 text-center text-foreground">
          Esta versión funciona solo en el dispositivo y no usa OAuth ni backend.
        </Text>
        <Text className="text-base leading-6 text-center text-foreground">
          {status === "redirecting" ? "Volviendo al inicio..." : "Redirigiendo..."}
        </Text>
      </ThemedView>
    </SafeAreaView>
  );
}
