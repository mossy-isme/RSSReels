import { useState } from "react";
import { StyleSheet, View, type ColorValue } from "react-native";

import { ThemedText, type ThemedTextProps } from "@/components/themed-text";

type Props = ThemedTextProps & {
  highlightColor: ColorValue;
  highlightRadius?: number;
  highlightPaddingX?: number;
  highlightPaddingY?: number;
};

type Size = { width: number; height: number };

/**
 * Text with a single background box that is only as wide as its longest
 * rendered line. A plain wrapped <Text> fills the full available width,
 * so its background would stretch past the text.
 */
export function HighlightedText({
  highlightColor,
  highlightRadius = 0,
  highlightPaddingX = 0,
  highlightPaddingY = 0,
  numberOfLines,
  onTextLayout,
  ...textProps
}: Props) {
  const [size, setSize] = useState<Size | null>(null);

  return (
    <View
      style={[
        styles.container,
        {
          paddingHorizontal: highlightPaddingX,
          paddingVertical: highlightPaddingY,
        },
      ]}
    >
      {size ? (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: size.width + highlightPaddingX * 2,
            height: size.height + highlightPaddingY * 2,
            backgroundColor: highlightColor,
            borderRadius: highlightRadius,
          }}
        />
      ) : null}
      <ThemedText
        {...textProps}
        numberOfLines={numberOfLines}
        onTextLayout={(event) => {
          const lines = numberOfLines
            ? event.nativeEvent.lines.slice(0, numberOfLines)
            : event.nativeEvent.lines;
          const last = lines[lines.length - 1];
          setSize(
            last
              ? {
                  width: Math.max(...lines.map((line) => line.x + line.width)),
                  height: last.y + last.height,
                }
              : null,
          );
          onTextLayout?.(event);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: "stretch",
  },
});
