import { useRef, useState } from "react";
import {
  Pressable,
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * TextInput that lets parent ScrollViews receive drag gestures when not focused.
 * Tap focuses; while focused it behaves like a normal input.
 */
export function ScrollFriendlyTextInput({
  containerStyle,
  onFocus,
  onBlur,
  style,
  autoFocus,
  ...rest
}: Props) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(Boolean(autoFocus));

  return (
    <Pressable
      style={containerStyle}
      onPress={() => ref.current?.focus()}
      accessibilityRole="none"
    >
      <TextInput
        ref={ref}
        style={style}
        autoFocus={autoFocus}
        {...rest}
        pointerEvents={focused ? "auto" : "none"}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
    </Pressable>
  );
}
