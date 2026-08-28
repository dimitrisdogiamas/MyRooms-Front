import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import { Fonts, type BrandColors } from "@/constants/theme";
import { useSettings } from "@/context/SettingsProvider";
import { useBrand } from "@/hooks/use-brand";
import { addDays } from "@/lib/bookingInsights";
import { getBookingIncome, type RoomPricing } from "@/lib/roomPricing";
import { supabase } from "@/lib/supabase";
import { fs } from "@/lib/typography";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Dimensions, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, useWindowDimensions, View, ScrollView } from "react-native";
import { Keyboard } from "react-native";  
import type { BookingDraft } from "@/app/property/[id]/index";
import { ScrollFriendlyTextInput } from "./ScrollFriendlyTextInput";
import { bookingHasMissingPrices, upsertRoomPriceForStay } from "@/lib/roomPricing";
type BookingInfoModalProps = {
  visible: boolean;
  onClose: () => void;
  onChanged?: () => void;
  booking: Booking;
  pressedDate: string;
  roomPrices: RoomPricing[];
  rooms?: Room[];
};

function countNights(start: string, end: string): number {
  let nights = 0;
  let current = start.slice(0, 10);
  const endDay = end.slice(0, 10);
  while (current < endDay) {
    nights += 1;
    current = addDays(current, 1);
  }
  return nights;
}

function formatDisplayDate(iso: string): string {
  const day = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return iso;
  const [y, m, d] = day.split("-");
  return `${d}/${m}/${y}`;
}


const windowWidth = Dimensions.get("window").width;
const windowHeight = Dimensions.get("window").height;


export function BookingInfoModal({
  visible,
  onClose,
  onChanged,
  booking,
  pressedDate,
  roomPrices,
  rooms = [],
}: BookingInfoModalProps) {
  const { settings } = useSettings();
  const { width: winWidth, height: winHeight } = useWindowDimensions();
  const isCompact = winWidth < 380;
  const brand = useBrand();
  const styles = useMemo(
    () => createStyles(settings.fontScale, brand),
    [settings.fontScale, brand],
  );

  const initialAdults = booking.adults ?? 2;
  const initialChildren = booking.children ?? 0;
  const [adults, setAdults] = useState(initialAdults);
  const [children, setChildren] = useState(initialChildren);
  const [savedAdults, setSavedAdults] = useState(initialAdults);
  const [savedChildren, setSavedChildren] = useState(initialChildren);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [guestName, setGuestName] = useState("");
  const [bookingPrice, setBookingPrice] = useState("");
  const [deposit, setDeposit] = useState("");
  const [settlement, setSettlement] = useState("");
  const [phone, setPhone] = useState("");
  const [guestInputFocused, setGuestInputFocused] = useState(false);
  const [priceInputFocused, setPriceInputFocused] = useState(false);
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifyDeparture, setNotifyDeparture] = useState(true);
  const [savingBooking, setSavingBooking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);


  const pricingScrollRef = useRef<ScrollView>(null);
  const bookingScrollRef = useRef<ScrollView>(null);
  const bookingCostPanelY = useRef(0);


  function scrollPricingToAmount() {
    setTimeout(() => {
      pricingScrollRef.current?.scrollToEnd({ animated: true });
    }, 120);
  }

  function scrollBookingToCostPanel() {
    setTimeout(() => {
      bookingScrollRef.current?.scrollTo({
        y: Math.max(0, bookingCostPanelY.current - 24),
        animated: true,
      });
    }, 120);
  }

  useEffect(() => {
    const nextAdults = booking.adults ?? 2;
    const nextChildren = booking.children ?? 0;
    setAdults(nextAdults);
    setChildren(nextChildren);
    setSavedAdults(nextAdults);
    setSavedChildren(nextChildren);
  }, [booking.id, booking.adults, booking.children]);

  const nights = countNights(booking.start_date, booking.end_date);
  const remaining = countNights(pressedDate, booking.end_date);
  const cost = getBookingIncome(booking, roomPrices);
  const roomName = rooms.find((r) => r.id === booking.room_id)?.name ?? null;
  const guestsDirty = adults !== savedAdults || children !== savedChildren;

  const draftTotalCost = useMemo(() => {
    if (!bookingDraft) return 0;
    const nights = countNights(
      bookingDraft.startDate,
      bookingDraft.endDate,
    );

    const parsed = Number.parseFloat(bookingPrice.replace(",", "."));
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed * nights;
    }

    return getBookingIncome(
      {
        id: "draft",
        room_id: bookingDraft.room.id,
        start_date: bookingDraft.startDate,
        end_date: bookingDraft.endDate,

      },
      roomPrices,
    );
  }, [bookingDraft, bookingPrice, roomPrices]);

  const draftDeposit = Number.parseFloat(deposit.replace(",", ".")) || 0;
    const draftRemaining = Math.max(0, draftTotalCost - draftDeposit);
  
    const draftHasMissingPrice = useMemo(() => {
      if (!bookingDraft) return false;
      const parsed = Number.parseFloat(bookingPrice.replace(",", "."));
      if (Number.isFinite(parsed) && parsed > 0) return false;
      return bookingHasMissingPrices(
        {
          id: "draft",
          room_id: bookingDraft.room.id,
          start_date: bookingDraft.startDate,
          end_date: bookingDraft.endDate,
        },
        roomPrices,
      );
    }, [bookingDraft, bookingPrice, roomPrices]);
  
  
  
  async function confirmBooking() {
      if (!bookingDraft || savingBooking) return;
  
      const draftBooking = {
        id: "draft",
        room_id: bookingDraft.room.id,
        start_date: bookingDraft.startDate,
        end_date: bookingDraft.endDate,
      };
      const parsedPrice = Number.parseFloat(bookingPrice.replace(",", "."));
      const hasUserPrice = Number.isFinite(parsedPrice) && parsedPrice >= 0;
      const depositValue = Number.parseFloat(deposit.replace(",", ".")) || 0;
      const settlementParsed = Number.parseFloat(settlement.replace(",", "."));
      const settlementValue =
        Number.isFinite(settlementParsed) && settlementParsed >= 0
          ? settlementParsed
          : 0;
      const phoneValue = phone.trim() || null;
  
      if (bookingHasMissingPrices(draftBooking, roomPrices) && !hasUserPrice) {
        Alert.alert(
          "Σφάλμα",
          "Συμπλήρωσε τιμή ανά διανυκτέρευση για τις νύχτες χωρίς τιμή.",
        );
        return;
      }
  
      setSavingBooking(true);
      const paymentFields = {
        deposit: depositValue,
        settlement: settlementValue,
        phone: phoneValue,
      };
      const base = {
        room_id: bookingDraft.room.id,
        start_date: bookingDraft.startDate,
        end_date: bookingDraft.endDate,
        ...paymentFields,
      };
  
      let { error } = await supabase.from("bookings").update(
        {
          guest_name: guestName.trim() || null,
          phone: phoneValue,
          deposit: depositValue,
          notify_arrival: notifyArrival,
          notify_departure: notifyDeparture,
          settlement: settlementValue,
          adults,
          children,
        },
      ).eq("id", booking.id);
  
      if (!error && hasUserPrice) {
        try {
          await upsertRoomPriceForStay(
            bookingDraft.room.id,
            bookingDraft.startDate,
            bookingDraft.endDate,
            parsedPrice,
          );
        } catch (priceErr) {
          setSavingBooking(false);
          const priceMessage =
            priceErr &&
            typeof priceErr === "object" &&
            "message" in priceErr &&
            typeof (priceErr as { message: unknown }).message === "string"
              ? (priceErr as { message: string }).message
              : priceErr instanceof Error
                ? priceErr.message
                : String(priceErr);
          Alert.alert(
            "Σφάλμα",
            "Η κράτηση αποθηκεύτηκε, αλλά απέτυχε η ενημέρωση τιμής: " +
              priceMessage,
          );
          closeBookingDraft();
          setRefreshKey((prev) => prev + 1);
          return;
        }
      }
  
      setSavingBooking(false);
  
      if (error) {
        Alert.alert("Σφάλμα", "Αποτυχία αποθήκευσης κράτησης: " + error.message);
        return;
      }
  
      closeBookingDraft();
      setRefreshKey((prev) => prev + 1);
    }


  async function saveGuests() {
    if (saving) return;
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ adults, children })
      .eq("id", booking.id);
    setSaving(false);

    if (error) {
      Alert.alert("Σφάλμα", "Αποτυχία ενημέρωσης ατόμων: " + error.message);
      return;
    }

    setSavedAdults(adults);
    setSavedChildren(children);
    onChanged?.();
  }

  function confirmDelete() {
    Alert.alert("Διαγραφή κράτησης", "Να διαγραφεί οριστικά αυτή η κράτηση;", [
      { text: "Άκυρο", style: "cancel" },
      {
        text: "Διαγραφή",
        style: "destructive",
        onPress: () => {
          void deleteBooking();
        },
      },
    ]);
  }

  async function deleteBooking() {
    if (deleting) return;
    setDeleting(true);
    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", booking.id);
    setDeleting(false);

    if (error) {
      Alert.alert("Σφάλμα", "Αποτυχία διαγραφής: " + error.message);
      return;
    }

    onChanged?.();
    onClose();
  }


  function closeBookingDraft() {
    setBookingDraft(null);
    setGuestName("");
    setAdults(2);
    setChildren(2);
    setBookingPrice("");
    setDeposit("");
    setSettlement("");
    setPhone("");
    setGuestInputFocused(false);
    setPriceInputFocused(false);
    setPhoneInputFocused(false);
    setNotifyArrival(true);
    setNotifyDeparture(true);
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", gap: 78 }}>
            <Pressable onPress={() => {
              const room = rooms.find((r) => r.id === booking.room_id);
              if (!room) return;
              setGuestName(booking.guest_name || "");
              setPhone(booking.phone || "");
              setBookingPrice("");
              setDeposit(booking.deposit != null ? String(booking.deposit) : "");
              setSettlement(booking.settlement != null ? String(booking.settlement) : "");
              setNotifyArrival(true);
              setNotifyDeparture(true);
              setBookingDraft({
                room,
                startDate: booking.start_date,
                endDate: booking.end_date,
              });

            }}>
              <Text style={{ justifyContent: "flex-start" }}>✏️</Text>
              <Modal
                visible={!!bookingDraft}
                animationType="fade"
                transparent
                onRequestClose={() => closeBookingDraft()}
              >
                <KeyboardAvoidingView
                  style={styles.modalOverlay}
                  behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                  <Pressable
                    style={[
                      styles.bookingModalPanel,
                      {
                        width: Math.min(winWidth - 40, 440),
                        maxHeight: winHeight * 0.9,

                      }
                    ]}
                    onPress={Keyboard.dismiss}
                  >
                    <Text style={styles.bookingModalTitle}>Επεξεργασία κράτησης </Text>
                    {bookingDraft ? (
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
                          {formatDisplayDate(bookingDraft.startDate)} -{" "}
                          {formatDisplayDate(bookingDraft.endDate)}
                        </Text>
                        
                        <Text style={styles.bookingModalDates}>
                          {countNights(bookingDraft.startDate, bookingDraft.endDate)} διανυκτερεύσεις
                        </Text>


                        <ScrollFriendlyTextInput
                          style={styles.bookingGuestInput}
                          value={guestName}
                          onChangeText={setGuestName}
                          onFocus={() => setGuestInputFocused(true)}
                          onBlur={() => setGuestInputFocused(false)}
                          placeholder="Όνομα επισκέπτη"
                          placeholderTextColor={brand.claySoft}
                          textAlign={guestInputFocused? "left" : "center"}
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
                    <Text
                      style={[styles.stepperLabel, styles.guestStepperLabel]}
                    >
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
                      style={[styles.stepperLabel, styles.guestStepperLabelChildren]}
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
                                              <Text style={styles.bookingPaymentLabel}>
                                                Προκαταβολή
                                              </Text>
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
                                          <Pressable
                                            style={styles.bookingCancelBtn}
                                            onPress={closeBookingDraft}
                                          >
                                            <Text style={styles.bookingCancelText}>Άκυρο</Text>
                                          </Pressable>
                                          <Pressable
                                            style={[
                                              styles.bookingSaveBtn,
                                              savingBooking && { opacity: 0.6 },
                                            ]}
                                            onPress={confirmBooking}
                                            disabled={savingBooking}
                                          >
                                            <Text style={styles.bookingSaveText}>
                                              {savingBooking ? "..." : "Αποθήκευση"}
                                            </Text>
                                          </Pressable>
                                        </View>
                                      </ScrollView>
                                    ) : null}
                  </Pressable>

              </KeyboardAvoidingView>
              </Modal>
              </Pressable>
          <Text style={styles.title}>Κράτηση</Text>
          </View>
            {roomName ? <Text style={styles.subtitle}>{roomName}</Text> : null}
          <View style={styles.card}>
            <Text style={styles.line}>{booking.guest_name?.trim() || "—"}</Text>

            <View style={[styles.guestsBox, styles.guestsRow]}>
              <View style={styles.guestStepper}>
                <Text style={[styles.stepperLabel, styles.guestStepperLabel]}>
                  Ενήλικες
                </Text>
                <View style={styles.stepperControls}>
                  <Text style={styles.stepperValue}>{adults}</Text>
                </View>
              </View>

              <View style={styles.guestStepper}>
                <Text style={[styles.stepperLabel, styles.guestStepperLabel]}>
                  Παιδιά
                </Text>
                <Text style={styles.stepperValue}>{children}</Text>
              </View>
            </View>

            {guestsDirty ? (
              <Pressable
                style={[styles.saveGuestsBtn, saving && styles.btnDisabled]}
                onPress={saveGuests}
                disabled={saving}
              >
                <Text style={styles.saveGuestsText}>
                  {saving ? "Αποθήκευση…" : "Αποθήκευση ατόμων"}
                </Text>
              </Pressable>
            ) : null}

            <Text style={styles.line}>
              Από {formatDisplayDate(booking.start_date)} έως{" "}
              {formatDisplayDate(booking.end_date)}
            </Text>
            <Text style={styles.line}>{nights} διανυκτερεύσεις</Text>
            <Text style={styles.cost}>Κόστος: {cost.toFixed(2)}€</Text>
            {booking.deposit != null && Number(booking.deposit) > 0 ? (
              <Text style={styles.line}>
                Προκαταβολή: {Number(booking.deposit).toFixed(2)}€
              </Text>
            ) : null}
            {booking.settlement != null && Number(booking.settlement) > 0 ? (
              <Text style={styles.line}>
                Εξόφληση: {Number(booking.settlement).toFixed(2)}€
              </Text>
            ) : null}
            {booking.phone ? (
              <Text style={styles.line}>Τηλ: {booking.phone}</Text>
            ) : null}
          </View>

          <Pressable
            style={[styles.deleteBtn, deleting && styles.btnDisabled]}
            onPress={confirmDelete}
            disabled={deleting}
          >
            <Text style={styles.deleteText}>
              {deleting ? "Διαγραφή…" : "Διαγραφή κράτησης"}
            </Text>
          </Pressable>

          <Pressable style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Κλείσιμο</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const CALENDAR_WEEK_GAP = 3;

function createStyles(scale: number, brand: BrandColors) {
  const s = (n: number) => fs(n, scale);
   const weekGap = CALENDAR_WEEK_GAP;
    const calendarWidthRatio = 0.92;
    const contentPad = 32;
    const calendarPad = weekGap;
    const calendarWidth =
      (Dimensions.get("window").width - contentPad) * calendarWidthRatio;
    const daySize = Math.floor(
      (calendarWidth - calendarPad * 2 - weekGap * 6) / 7,
    );
  
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: brand.overlay,
      justifyContent: "center",
      padding: 16,
    },
    panel: {
      backgroundColor: brand.white,
      borderRadius: 24,
      padding: 18,
      gap: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
    },
    title: {
      fontSize: s(24),
      fontWeight: "700",
      color: brand.ink,
      fontFamily: Fonts?.serif,
      textAlign: "center",
    },
    subtitle: {
      fontSize: s(15),
      color: brand.claySoft,
      textAlign: "center",
      marginTop: -6,
    },
    card: {
      backgroundColor: brand.sandDeep,
      borderRadius: 16,
      padding: 16,
      gap: 8,
    },
    line: {
      textAlign: "center",
      fontSize: s(14),
      color: brand.ink,
    },
    cost: {
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.primary,
      marginTop: 4,
    },
    guestsBox: {
      backgroundColor: brand.sand,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: brand.sandDeep,
      marginVertical: 4,
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
      textAlign: "center",
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
      minWidth: 24,
      textAlign: "center",
      fontSize: s(16),
      fontWeight: "700",
      color: brand.ink,
    },
    saveGuestsBtn: {
      backgroundColor: brand.primary,
      borderRadius: 12,
      paddingVertical: 10,
      alignItems: "center",
      marginTop: 4,
    },
    saveGuestsText: {
      color: brand.onAccent,
      fontWeight: "700",
      fontSize: s(14),
    },
    deleteBtn: {
      borderWidth: 1,
      borderColor: brand.danger,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
      backgroundColor: brand.white,
    },
    deleteText: {
      color: brand.danger,
      fontWeight: "700",
      fontSize: s(15),
    },
    btnDisabled: {
      opacity: 0.6,
    },
    closeBtn: {
      borderWidth: 1,
      borderColor: brand.ink,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: "center",
    },
    closeText: {
      color: brand.ink,
      fontWeight: "700",
      fontSize: s(15),
    },


    // styles for modal 
      modalOverlay: {
      flex: 1,
      backgroundColor: brand.overlay,
      justifyContent: "center",
      padding: 20,
    },
        modalPanel: {
          backgroundColor: brand.white,
          borderRadius: 8,
          overflow: "hidden",
          padding: 22,
          gap: 12,
          maxHeight: "85%",
        },
        pricingModalPanel: {
          width: windowWidth - 40,
          height: windowHeight * 0.85,
          backgroundColor: brand.white,
          borderRadius: 8,
          overflow: "hidden",
          padding: 22,
          alignSelf: "center",
        },
        pricingModalScroll: {
          flex: 1,
        },
        pricingModalScrollContent: {
          gap: 10,
          paddingBottom: 120,
        },
        modalDate: {
          textAlign: "center",
          fontSize: s(28),
          fontWeight: "700",
          color: brand.ink,
        },
        modalSubtitle: {
          textAlign: "center",
          fontSize: s(15),
          color: brand.claySoft,
          marginBottom: 4,
        },
        optionRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          backgroundColor: brand.sand,
          borderRadius: 14,
          paddingVertical: 16,
          paddingHorizontal: 14,
          borderWidth: 2,
          borderColor: "transparent",
        },
        optionRowActive: {
          borderColor: brand.primary,
          backgroundColor: brand.sandDeep,
        },
        optionEmoji: {
          fontSize: s(22),
        },
        optionLabel: {
          fontSize: s(16),
          fontWeight: "600",
          color: brand.ink,
          flex: 1,
        },
        modalConfirm: {
          marginTop: 4,
          paddingVertical: 14,
          borderRadius: 8,
          backgroundColor: brand.primary,
          alignItems: "center",
        },
        modalConfirmText: {
          color: brand.onAccent,
          fontWeight: "700",
          fontSize: s(16),
        },
        modalCancel: {
          paddingVertical: 14,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: brand.sandDeep,
          alignItems: "center",
          backgroundColor: brand.white,
        },
        modalCancelText: {
          color: brand.ink,
          fontWeight: "700",
          fontSize: s(16),
        },
        priceRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          backgroundColor: brand.sand,
          borderRadius: 12,
          padding: 10,
        },
        priceRowText: {
          flex: 1,
          flexShrink: 1,
          fontSize: s(13),
          color: brand.ink,
          fontWeight: "600",
        },
        priceDelete: {
          flexShrink: 0,
          zIndex: 2,
          borderWidth: 1,
          borderColor: brand.danger,
          borderRadius: 8,
          paddingHorizontal: 8,
          paddingVertical: 6,
          minHeight: 32,
          justifyContent: "center",
        },
        priceDeleteText: {
          color: brand.danger,
          fontWeight: "700",
          fontSize: s(12),
        },
        priceSectionTitle: {
          marginTop: 4,
          textAlign: "center",
          fontSize: s(15),
          fontWeight: "700",
          color: brand.ink,
        },
        priceDateRow: {
          flexDirection: "row",
          gap: 8,
        },
        priceDateField: {
          flex: 1,
          position: "relative",
          justifyContent: "center",
        },
        priceInput: {
          borderWidth: 1,
          borderColor: brand.sandDeep,
          borderRadius: 10,
          paddingHorizontal: 12,
          paddingVertical: 10,
          paddingRight: 36,
          fontSize: s(14),
          color: brand.ink,
          backgroundColor: brand.sand,
        },
        priceCalendarBtn: {
          position: "absolute",
          right: 8,
          height: "100%",
          justifyContent: "center",
        },
        priceActions: {
          flexDirection: "row",
          gap: 8,
          marginTop: 4,
        },
        priceActionBtn: {
          flex: 1,
          marginTop: 0,
        },
        dayCell: {
          width: daySize,
          height: daySize,
          borderRadius: 5,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          padding: 0,
          alignSelf: "center",
        },
        dayCellIdle: {
          backgroundColor: brand.sand,
        },
        dayCellSelected: {
          borderWidth: 1.5,
          borderColor: brand.ink,
        },
        daySplitTriangle: {
          position: "absolute",
          top: 0,
          left: 0,
          width: 0,
          height: 0,
          borderTopWidth: daySize,
          borderRightWidth: daySize,
          borderTopColor: brand.calendarTurnover,
          borderRightColor: "transparent",
        },
        dayArrivalTriangle: {
          position: "absolute",
          bottom: 0,
          right: 0,
          width: 0,
          height: 0,
          borderBottomWidth: daySize,
          borderLeftWidth: daySize,
          borderBottomColor: brand.calendarBlue,
          borderLeftColor: "transparent",
        },
        dayNumber: {
          fontSize: s(14),
          lineHeight: s(16),
          fontWeight: "600",
          zIndex: 1,
        },
        dayPrice: {
          fontSize: s(10),
          lineHeight: s(11),
          marginTop: 0,
          zIndex: 1,
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
        bookingsButton: {
          alignItems: "center",
          textAlign: "center",
          backgroundColor: brand.roomSection,
          borderRadius: 8,
          paddingHorizontal: 18,
          paddingVertical: 10,
        },
    
        bookingSaveText: {
          color: brand.onAccent,
          fontWeight: "700",
        },
        bookingsList: {
          marginTop: 12,
        },
        bookingListTitle: {
          fontSize: s(15),
          fontWeight: "700",
          color: brand.onAccent,
          marginBottom: 6,
          textAlign: "center",
        },
        yearMenu: {
          position: "relative",
          zIndex: 30,
          width: 102,
        },
        yearDropdown: {
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          marginTop: 4,
          backgroundColor: brand.white,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: brand.ink,
          zIndex: 40,
          elevation: 8,
          overflow: "hidden",
        },
        yearDropdownItem: {
          minHeight: 36,
          paddingVertical: 8,
          paddingHorizontal: 10,
          alignItems: "center",
          justifyContent: "center",
        },
        yearDropdownItemActive: {
          backgroundColor: brand.sand,
        },
        yearDropdownItemText: {
          color: brand.ink,
          fontWeight: "700",
          fontSize: s(13),
          textAlign: "center",
        },
        yearDropdownItemTextActive: {
          color: brand.primary,
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
