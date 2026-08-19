import { useRef, useState, useCallback } from "react";
import {
  View,
  TextInput,
  Keyboard,
  type TextInputProps,
  type StyleProp,
  type ViewStyle,
  type GestureResponderEvent,
} from "react-native";

type Props = TextInputProps & {
  containerStyle?: StyleProp<ViewStyle>;
  debugId?: string;
};

/**
 * TextInput wrapper that never steals drag gestures from a parent ScrollView.
 * A tap (touch-down → touch-up without significant move) focuses the input.
 * Drags always propagate to the ScrollView regardless of focus state.
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
  const [focused, setFocused] = useState(Boolean(autoFocus));
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    touchStart.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }, []);

  const handleTouchEnd = useCallback((e: GestureResponderEvent) => {
    if (!touchStart.current) return;
    const dx = Math.abs(e.nativeEvent.pageX - touchStart.current.x);
    const dy = Math.abs(e.nativeEvent.pageY - touchStart.current.y);
    touchStart.current = null;
    if (dx < 10 && dy < 10) {
      ref.current?.focus();
    }
    // #region agent log
    if (debugId) {
      console.log("[expense-scroll-debug]", { hypothesisId: "H7", location: "ScrollFriendlyTextInput.tsx:tap", message: "Touch end", data: { debugId, dx, dy, willFocus: dx < 10 && dy < 10 } });
      fetch("http://127.0.0.1:7309/ingest/28dbb2f3-4f54-40b9-be09-c96975b72407",{method:"POST",headers:{"Content-Type":"application/json","X-Debug-Session-Id":"e41cc8"},body:JSON.stringify({sessionId:"e41cc8",runId:"H7",hypothesisId:"H7",location:"ScrollFriendlyTextInput.tsx:tap",message:"Touch end",data:{debugId,dx,dy,willFocus:dx<10&&dy<10},timestamp:Date.now()})}).catch(()=>{});
    }
    // #endregion
  }, [debugId]);

  return (
    <View style={containerStyle} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <TextInput
        ref={ref}
        style={style}
        autoFocus={autoFocus}
        {...rest}
        pointerEvents="none"
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
      />
    </View>
  );
}
