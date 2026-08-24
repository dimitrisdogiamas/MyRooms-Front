import type { ReactNode } from "react";
import {
  Keyboard,
  Pressable,
  StyleSheet,
  View,
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
      <View pointerEvents="box-none" style={styles.fill}>
        {children}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    width: "100%",
    flexGrow: 1,
  },
});
