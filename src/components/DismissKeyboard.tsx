import type { ReactNode } from "react";
import {
  Keyboard,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type DismissKeyboardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Tap outside TextInputs (on this wrapper) hides the keyboard. */
export function DismissKeyboard({ children, style }: DismissKeyboardProps) {
  return (
    <Pressable style={style} onPress={Keyboard.dismiss} accessible={false}>
      {children}
    </Pressable>
  );
}
