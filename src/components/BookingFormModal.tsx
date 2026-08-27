import { useMemo, useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import type { BookingDraft } from "@/app/property/[id]/index";
import { ScrollFriendlyTextInput } from "@/components/ScrollFriendlyTextInput";
import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { addDays } from "@/lib/bookingInsights";
import {
  bookingHasMissingPrices,
  getBookingIncome,
  type RoomPricing,
} from "@/lib/roomPricing";
import { fs } from "@/lib/typography";

function formatDisplayDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function countNights(start: string, end: string): number {
  let nights = 0;
  let current = start;
  while (current < end) {
    nights += 1;
    current = addDays(current, 1);
  }
  return nights;
}

export function BookingFormModal({
  mode,
  draft,
  roomPrices = [],
  saving = false,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  draft: BookingDraft | null;
  roomPrices?: RoomPricing[];
  saving?: boolean;
  onClose: () => void;
  onSave: () => void;
}) {
  const { settings } = useSettings();
  const brand = useBrand();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isCompact = winWidth < 380;
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [bookingPrice, setBookingPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [guestInputFocused, setGuestInputFocused] = useState(false);
  const [priceInputFocused, setPriceInputFocused] = useState(false);
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifyDeparture, setNotifyDeparture] = useState(true);

  const bookingScrollRef = useRef<ScrollView>(null);
  const bookingCostPanelY = useRef(0);

  function scrollBookingToCostPanel() {
    if (!bookingCostPanelY.current) return;
    bookingScrollRef.current?.scrollTo({
      y: Math.max(0, bookingCostPanelY.current - 24),
      animated: true,
    });
  }

  const draftTotalCost = useMemo(() => {
    if (!draft) return 0;
    const nights = countNights(draft.startDate, draft.endDate);
    const parsed = Number.parseFloat(bookingPrice.replace(",", "."));
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed * nights;
    }
    return getBookingIncome(
      {
        id: "draft",
        room_id: draft.room.id,
        start_date: draft.startDate,
        end_date: draft.endDate,
      },
      roomPrices,
    );
  }, [draft, bookingPrice, roomPrices]);

  const draftDeposit = Number.parseFloat(deposit.replace(",", ".")) || 0;
  const draftRemaining = Math.max(0, draftTotalCost - draftDeposit);

  const draftHasMissingPrice = useMemo(() => {
    if (!draft) return false;
    const parsed = Number.parseFloat(bookingPrice.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) return false;
    return bookingHasMissingPrices(
      {
        id: "draft",
        room_id: draft.room.id,
        start_date: draft.startDate,
        end_date: draft.endDate,
      },
      roomPrices,
    );
  }, [draft, bookingPrice, roomPrices]);

  return (
    <Modal
      visible={draft !== null}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={Keyboard.dismiss} />
        <Pressable
          style={[
            styles.bookingModalPanel,
            {
              width: Math.min(winWidth - 40, 440),
              maxHeight: winHeight * 0.9,
            },
          ]}
          onPress={Keyboard.dismiss}
        >
          <Text style={styles.bookingModalTitle}>
            {mode === "edit" ? "Επεξεργασία κράτησης" : "Νέα κράτηση"}
          </Text>
          {draft ? (
            <ScrollView
              ref={bookingScrollRef}
              style={styles.bookingModalScroll}
              contentContainerStyle={styles.bookingModalScrollContent}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={Keyboard.dismiss}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.bookingModalDates}>
                {formatDisplayDate(draft.startDate)} →{" "}
                {formatDisplayDate(draft.endDate)}
              </Text>
              <Text style={styles.bookingModalDates}>
                {countNights(draft.startDate, draft.endDate)} διανυκτ.
              </Text>

              <ScrollFriendlyTextInput
                style={styles.bookingGuestInput}
                value={guestName}
                onChangeText={setGuestName}
                onFocus={() => setGuestInputFocused(true)}
                onBlur={() => setGuestInputFocused(false)}
                placeholder="Όνομα πελάτη"
                placeholderTextColor={brand.claySoft}
                textAlign={guestInputFocused ? "left" : "center"}
              />

              <ScrollFriendlyTextInput
                style={styles.bookingGuestInput}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setPhoneInputFocused(true)}
                onBlur={() => setPhoneInputFocused(false)}
                keyboardType="phone-pad"
                placeholder="Τηλέφωνο"
                placeholderTextColor={brand.claySoft}
                textAlign={phoneInputFocused ? "left" : "center"}
              />

              <View style={[styles.guestsBox, styles.guestsRow]}>
                <View style={styles.guestStepper}>
                  <Text style={[styles.stepperLabel, styles.guestStepperLabel]}>
                    Ενήλικες
                  </Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setAdults((v) => Math.max(1, v - 1))}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValue}>{adults}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setAdults((v) => Math.min(4, v + 1))}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>

                <View style={styles.guestStepper}>
                  <Text
                    style={[
                      styles.stepperLabel,
                      styles.guestStepperLabelChildren,
                    ]}
                  >
                    Παιδιά
                  </Text>
                  <View style={styles.stepperControls}>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setChildren((v) => Math.max(0, v - 1))}
                    >
                      <Text style={styles.stepperBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.stepperValueChildren}>{children}</Text>
                    <Pressable
                      style={styles.stepperBtn}
                      onPress={() => setChildren((v) => Math.min(4, v + 1))}
                    >
                      <Text style={styles.stepperBtnText}>+</Text>
                    </Pressable>
                  </View>
                </View>
              </View>

              <View
                style={styles.bookingCostPanel}
                onLayout={(e) => {
                  bookingCostPanelY.current = e.nativeEvent.layout.y;
                }}
              >
                <View
                  style={[
                    styles.bookingPaymentRow,
                    isCompact && styles.bookingPaymentRowStacked,
                  ]}
                >
                  <View style={styles.bookingPaymentCol}>
                    <Text style={styles.bookingPaymentLabel}>
                      Κόστος διαν/σης (€)
                    </Text>
                    <ScrollFriendlyTextInput
                      style={styles.bookingPaymentInput}
                      value={bookingPrice}
                      onChangeText={setBookingPrice}
                      onFocus={() => {
                        setPriceInputFocused(true);
                        scrollBookingToCostPanel();
                      }}
                      onBlur={() => setPriceInputFocused(false)}
                      keyboardType="decimal-pad"
                      placeholder="π.χ. 55"
                      placeholderTextColor={brand.claySoft}
                      textAlign={priceInputFocused ? "left" : "center"}
                    />
                  </View>
                  <View style={styles.bookingPaymentCol}>
                    <Text style={styles.bookingPaymentLabel}>
                      Συνολικό κόστος
                    </Text>
                    <Text style={styles.bookingPaymentRemaining}>
                      {draftTotalCost.toFixed(2)}€
                    </Text>
                  </View>
                </View>
                {draftHasMissingPrice ? (
                  <Text style={styles.bookingMissingPriceHint}>
                    (υπάρχουν μέρες χωρίς ορισμένη τιμή)
                  </Text>
                ) : null}

                <View
                  style={[
                    styles.bookingPaymentRow,
                    isCompact && styles.bookingPaymentRowStacked,
                  ]}
                >
                  <View style={styles.bookingPaymentCol}>
                    <Text style={styles.bookingPaymentLabel}>Προκαταβολή</Text>
                    <ScrollFriendlyTextInput
                      style={styles.bookingPaymentInput}
                      value={deposit}
                      onChangeText={setDeposit}
                      onFocus={scrollBookingToCostPanel}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={brand.claySoft}
                    />
                  </View>
                  <View style={styles.bookingPaymentCol}>
                    <Text style={styles.bookingPaymentLabel}>Υπόλοιπο</Text>
                    <Text style={styles.bookingPaymentRemaining}>
                      {draftRemaining.toFixed(2)}€
                    </Text>
                  </View>
                </View>
              </View>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setNotifyArrival((v) => !v)}
              >
                <View
                  style={[
                    styles.checkbox,
                    notifyArrival && styles.checkboxChecked,
                  ]}
                >
                  {notifyArrival ? (
                    <Text style={styles.checkboxTick}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.checkboxLabel}>
                  Ειδοποίηση κατά την άφιξη
                </Text>
              </Pressable>

              <Pressable
                style={styles.checkboxRow}
                onPress={() => setNotifyDeparture((v) => !v)}
              >
                <View
                  style={[
                    styles.checkbox,
                    notifyDeparture && styles.checkboxChecked,
                  ]}
                >
                  {notifyDeparture ? (
                    <Text style={styles.checkboxTick}>✓</Text>
                  ) : null}
                </View>
                <Text style={styles.checkboxLabel}>
                  Ειδοποίηση κατά την αναχώρηση
                </Text>
              </Pressable>

              <View style={styles.bookingModalActions}>
                <Pressable style={styles.bookingCancelBtn} onPress={onClose}>
                  <Text style={styles.bookingCancelText}>Άκυρο</Text>
                </Pressable>
                <Pressable
                  style={[styles.bookingSaveBtn, saving && { opacity: 0.6 }]}
                  onPress={onSave}
                  disabled={saving}
                >
                  <Text style={styles.bookingSaveText}>
                    {saving ? "..." : "Αποθήκευση"}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          ) : null}
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);

  return StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: brand.overlay,
      justifyContent: "center",
      padding: 20,
    },
    bookingModalPanel: {
      backgroundColor: brand.white,
      borderRadius: 8,
      overflow: "hidden",
      padding: 22,
      gap: 12,
      alignSelf: "center",
    },
    bookingModalScroll: {
      flexGrow: 0,
    },
    bookingModalScrollContent: {
      gap: 12,
      paddingBottom: 120,
    },
    bookingModalTitle: {
      textAlign: "center",
      fontSize: s(24),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
    },
    bookingModalDates: {
      textAlign: "center",
      fontSize: s(13),
      color: brand.claySoft,
      fontFamily: Fonts?.mono,
    },
    bookingModalCost: {
      fontSize: s(15),
      color: brand.ink,
    },
    bookingModalCostValue: {
      fontWeight: "700",
    },
    bookingMissingPriceHint: {
      color: brand.danger,
      fontSize: s(13),
      fontWeight: "600",
    },
    guestsBox: {
      backgroundColor: brand.sand,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    guestsRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    guestStepper: {
      flex: 1,
      gap: 8,
      alignItems: "center",
    },
    guestStepperLabel: {
      color: brand.primary,
      textAlign: "center",
    },
    guestStepperLabelChildren: {
      color: brand.danger,
      textAlign: "center",
    },
    bookingPriceBox: {
      backgroundColor: brand.sandDeep,
      borderRadius: 12,
      padding: 12,
      gap: 8,
    },
    bookingPriceLabel: {
      textAlign: "center",
      fontSize: s(13),
      color: brand.ink,
      fontWeight: "600",
    },
    bookingPriceHint: {
      fontSize: s(12),
      color: brand.claySoft,
      lineHeight: s(16),
    },
    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 2,
    },
    stepperLabel: {
      fontSize: s(14),
      color: brand.ink,
      fontWeight: "600",
    },
    stepperControls: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    stepperBtn: {
      width: 34,
      height: 34,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      backgroundColor: brand.white,
      alignItems: "center",
      justifyContent: "center",
    },
    stepperBtnText: {
      fontSize: s(18),
      color: brand.ink,
      fontWeight: "600",
      lineHeight: s(20),
    },
    stepperValue: {
      color: brand.primary,
      minWidth: 24,
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
    },
    stepperValueChildren: {
      color: brand.danger,
      fontSize: s(16),
      fontWeight: "700",
      textAlign: "center",
    },
    bookingGuestInputWrap: {
      borderWidth: 1.5,
      borderColor: brand.primary,
      borderRadius: 10,
      backgroundColor: brand.white,
      justifyContent: "center",
      shadowColor: brand.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 5,
      elevation: 4,
    },
    bookingGuestPlaceholder: {
      position: "absolute",
      left: 12,
      right: 12,
      textAlign: "center",
      fontSize: s(15),
      color: brand.claySoft,
      zIndex: 1,
    },
    bookingGuestInput: {
      borderWidth: 1.5,
      borderColor: brand.primary,
      borderRadius: 10,
      backgroundColor: brand.white,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: s(15),
      color: brand.ink,
      shadowColor: brand.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.22,
      shadowRadius: 5,
      elevation: 4,
    },
    checkboxRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingVertical: 4,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1.5,
      borderColor: brand.claySoft,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: brand.white,
    },
    checkboxChecked: {
      backgroundColor: brand.calendarBlue,
      borderColor: brand.calendarBlue,
    },
    checkboxTick: {
      color: brand.onAccent,
      fontSize: s(14),
      fontWeight: "700",
    },
    checkboxLabel: {
      fontSize: s(14),
      color: brand.ink,
      flex: 1,
    },
    bookingModalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
    },
    bookingCancelBtn: {
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
      backgroundColor: brand.white,
    },
    bookingCancelText: {
      color: brand.ink,
      fontWeight: "600",
    },
    bookingSaveBtn: {
      backgroundColor: brand.calendarBlue,
      borderRadius: 8,
      paddingHorizontal: 18,
      paddingVertical: 10,
    },
    bookingSaveText: {
      color: brand.onAccent,
      fontWeight: "700",
    },
    bookingCostPanel: {
      backgroundColor: brand.sand,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      padding: 12,
      gap: 10,
    },
    bookingPaymentRow: {
      flexDirection: "row",
      gap: 12,
      flexWrap: "wrap",
    },
    bookingPaymentRowStacked: {
      flexDirection: "column",
    },
    bookingPaymentCol: {
      flex: 1,
      minWidth: 120,
      gap: 4,
    },
    bookingPaymentLabel: {
      textAlign: "center",
      fontSize: s(12),
      fontWeight: "700",
      color: brand.ink,
    },
    bookingPaymentInput: {
      textAlign: "center",
      borderWidth: 1,
      borderColor: brand.sandDeep,
      borderRadius: 8,
      paddingHorizontal: 10,
      paddingVertical: 8,
      fontSize: s(14),
      color: brand.ink,
      backgroundColor: brand.white,
      width: "100%",
    },
    bookingPaymentRemaining: {
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.primary,
      paddingVertical: 8,
    },
  });
}
