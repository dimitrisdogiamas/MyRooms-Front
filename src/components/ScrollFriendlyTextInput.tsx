import { useRef } from "react";
import {
  TextInput,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  View,
} from "react-native";

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  debugId?: string;
};

/**
 * Thin TextInput wrapper. The parent ScrollView handles keyboard
 * dismiss on drag via keyboardDismissMode="on-drag".
 */
export function ScrollFriendlyTextInput({
  containerStyle,
  onFocus,
  onBlur,
  style,
  autoFocus,
  debugId,
  ...rest
}: Props) {
  const ref = useRef<TextInput>(null);

  return (
    <View style={containerStyle}>
      <TextInput
        ref={ref}
        style={style}
        autoFocus={autoFocus}
        {...rest}
      />
    </View>
  );
}
