// Fallback for using MaterialIcons on Android and web.

import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

/**
 * Add your SF Symbols to Material Icons mappings here.
 * - see Material Icons in the [Icons Directory](https://icons.expo.fyi).
 * - see SF Symbols in the [SF Symbols](https://developer.apple.com/sf-symbols/) app.
 */
const MAPPING = {
  "house.fill": "home",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "list.bullet.clipboard.fill": "assignment",
  "square.and.arrow.up.fill": "ios-share",
  "camera.fill": "camera-alt",
  "plus.circle.fill": "add-circle",
  "pencil": "edit",
  "trash.fill": "delete",
  "calendar": "calendar-today",
  "stethoscope": "medical-services",
  "doc.text.fill": "description",
  "arrow.left": "arrow-back",
  "checkmark.circle.fill": "check-circle",
  "xmark.circle.fill": "cancel",
  "photo.fill": "photo",
  "magnifyingglass": "search",
  "person.fill": "person",
  "building.2.fill": "business",
  "clock.fill": "schedule",
  "tag.fill": "label",
  "chart.bar.fill": "bar-chart",
  "arrow.clockwise": "refresh",
  "tablecells.fill": "table-chart",
  "doc.richtext.fill": "picture-as-pdf",
  "printer.fill": "print",
  "chevron.down": "expand-more",
  "chevron.up": "expand-less",
  "ellipsis.circle": "more-horiz",
  "exclamationmark.triangle.fill": "warning",
  "info.circle.fill": "info",
  "checkmark": "check",
  "xmark": "close",
  "star.fill": "star",
  "bandage.fill": "healing",
  "waveform.path.ecg": "monitor-heart",
} as IconMapping;

/**
 * An icon component that uses native SF Symbols on iOS, and Material Icons on Android and web.
 * This ensures a consistent look across platforms, and optimal resource usage.
 * Icon `name`s are based on SF Symbols and require manual mapping to Material Icons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
