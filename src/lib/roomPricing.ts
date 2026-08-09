import { addDays } from "./bookingInsights";
import { supabase } from "./supabase";

export type RoomPricing = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
};

export type PricingBooking = {
  id: string;
  room_id: string;
  start_date: string;
  end_date: string;
};

export type NightPrice = {
  date: string;
  price: number;
};

function toDateOnly(value: string): string {
  return value.slice(0, 10);
}

function periodLengthDays(start: string, end: string): number {
  let n = 0;
  let current = toDateOnly(start);
  const last = toDateOnly(end);
  while (current <= last) {
    n += 1;
    current = addDays(current, 1);
  }
  return n;
}

export function getPriceForNight(
  prices: RoomPricing[],
  roomId: string,
  date: string,
): number {
  const day = toDateOnly(date);
  const matches = prices.filter(
    (p) =>
      p.room_id === roomId &&
      toDateOnly(p.start_date) <= day &&
      toDateOnly(p.end_date) >= day,
  );
  if (matches.length === 0) return 0;
  // Prefer the most specific (shortest) period when ranges overlap
  matches.sort(
    (a, b) =>
      periodLengthDays(a.start_date, a.end_date) -
      periodLengthDays(b.start_date, b.end_date),
  );
  return matches[0]?.price_per_night || 0;
}

export function getBookingNightPrices(
  booking: PricingBooking,
  prices: RoomPricing[],
): NightPrice[] {
  const nights: NightPrice[] = [];
  let current = toDateOnly(booking.start_date);
  const end = toDateOnly(booking.end_date);

  while (current < end) {
    nights.push({
      date: current,
      price: getPriceForNight(prices, booking.room_id, current),
    });
    current = addDays(current, 1);
  }

  return nights;
}

export function getBookingIncome(
  booking: PricingBooking,
  prices: RoomPricing[],
): number {
  return getBookingNightPrices(booking, prices).reduce(
    (total, night) => total + night.price,
    0,
  );
}

export function getRoomIncome(
  bookings: PricingBooking[],
  prices: RoomPricing[],
  roomId: string,
): number {
  return bookings
    .filter((b) => b.room_id === roomId)
    .reduce((acc, booking) => acc + getBookingIncome(booking, prices), 0);
}

/** True if any night in the stay has no price (0). */
export function bookingHasMissingPrices(
  booking: PricingBooking,
  prices: RoomPricing[],
): boolean {
  const nights = getBookingNightPrices(booking, prices);
  if (nights.length === 0) return true;
  return nights.some((n) => n.price <= 0);
}

/**
 * If every night has the same positive price, return it; otherwise null.
 */
export function getUniformNightPrice(
  booking: PricingBooking,
  prices: RoomPricing[],
): number | null {
  const nights = getBookingNightPrices(booking, prices);
  if (nights.length === 0) return null;
  const first = nights[0].price;
  if (first <= 0) return null;
  return nights.every((n) => n.price === first) ? first : null;
}

type PriceRowInsert = {
  room_id: string;
  start_date: string;
  end_date: string;
  price_per_night: number;
};

function collapseDayPrices(
  roomId: string,
  dayPrices: Map<string, number>,
): PriceRowInsert[] {
  const days = [...dayPrices.keys()].sort();
  if (days.length === 0) return [];

  const result: PriceRowInsert[] = [];
  let runStart = days[0];
  let runEnd = days[0];
  let runPrice = dayPrices.get(days[0])!;

  for (let i = 1; i < days.length; i++) {
    const day = days[i];
    const price = dayPrices.get(day)!;
    if (day === addDays(runEnd, 1) && price === runPrice) {
      runEnd = day;
      continue;
    }
    result.push({
      room_id: roomId,
      start_date: runStart,
      end_date: runEnd,
      price_per_night: runPrice,
    });
    runStart = day;
    runEnd = day;
    runPrice = price;
  }

  result.push({
    room_id: roomId,
    start_date: runStart,
    end_date: runEnd,
    price_per_night: runPrice,
  });
  return result;
}

/**
 * Applies a price to an inclusive date range, splitting overlapping periods.
 * When protectBookingNights is true, nights covered by existing bookings keep
 * their current price (so a season range won't wipe a booking modal price).
 */
export async function applyRoomPriceRange(
  roomId: string,
  rangeStart: string,
  rangeEndInclusive: string,
  pricePerNight: number,
  options?: { protectBookingNights?: boolean },
): Promise<void> {
  const start = toDateOnly(rangeStart);
  const end = toDateOnly(rangeEndInclusive);
  if (end < start || !Number.isFinite(pricePerNight) || pricePerNight <= 0) {
    return;
  }

  const protect = options?.protectBookingNights ?? false;

  const { data: existing, error: fetchError } = await supabase
    .from("rooms_prices")
    .select("id, start_date, end_date, price_per_night")
    .eq("room_id", roomId)
    .lte("start_date", end)
    .gte("end_date", start);

  if (fetchError) throw fetchError;

  const rows = (existing ?? []).map((row) => ({
    id: row.id as string,
    room_id: roomId,
    start_date: toDateOnly(String(row.start_date)),
    end_date: toDateOnly(String(row.end_date)),
    price_per_night: Number(row.price_per_night),
  }));

  const protectedNights = new Set<string>();
  if (protect) {
    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select("start_date, end_date")
      .eq("room_id", roomId)
      .lt("start_date", addDays(end, 1))
      .gt("end_date", start);

    if (bookingsError) throw bookingsError;

    for (const booking of bookings ?? []) {
      let day = toDateOnly(String(booking.start_date));
      const checkout = toDateOnly(String(booking.end_date));
      while (day < checkout) {
        if (day >= start && day <= end) protectedNights.add(day);
        day = addDays(day, 1);
      }
    }
  }

  const dayPrices = new Map<string, number>();
  let cursor = start;
  while (cursor <= end) {
    if (protectedNights.has(cursor)) {
      const current = getPriceForNight(rows, roomId, cursor);
      dayPrices.set(cursor, current > 0 ? current : pricePerNight);
    } else {
      dayPrices.set(cursor, pricePerNight);
    }
    cursor = addDays(cursor, 1);
  }

  const toDelete = rows.map((row) => row.id);
  const toInsert: PriceRowInsert[] = [];

  for (const row of rows) {
    if (row.start_date < start) {
      toInsert.push({
        room_id: roomId,
        start_date: row.start_date,
        end_date: addDays(start, -1),
        price_per_night: row.price_per_night,
      });
    }
    if (row.end_date > end) {
      toInsert.push({
        room_id: roomId,
        start_date: addDays(end, 1),
        end_date: row.end_date,
        price_per_night: row.price_per_night,
      });
    }
  }

  toInsert.push(...collapseDayPrices(roomId, dayPrices));

  if (toDelete.length > 0) {
    const { data: deleted, error: deleteError } = await supabase
      .from("rooms_prices")
      .delete()
      .in("id", toDelete)
      .select("id");
    if (deleteError) throw deleteError;
    if ((deleted ?? []).length !== toDelete.length) {
      throw new Error(
        "Δεν επιτρέπεται διαγραφή παλιών τιμών (RLS). Πρόσθεσε DELETE policy στο rooms_prices.",
      );
    }
  }

  const { error: insertError } = await supabase
    .from("rooms_prices")
    .insert(toInsert);
  if (insertError) throw insertError;
}

/**
 * Sets price only for stay nights [start, checkout).
 * Overwrites any existing prices on those nights (booking modal).
 */
export async function upsertRoomPriceForStay(
  roomId: string,
  stayStart: string,
  stayCheckout: string,
  pricePerNight: number,
): Promise<void> {
  const lastNight = addDays(toDateOnly(stayCheckout), -1);
  await applyRoomPriceRange(roomId, stayStart, lastNight, pricePerNight, {
    protectBookingNights: false,
  });
}

/**
 * Deletes a rooms_prices row, but keeps the price on nights that belong to
 * existing bookings (so clearing a season range doesn't wipe booking prices).
 */
export async function deleteRoomPriceProtectingBookings(
  priceId: string,
): Promise<void> {
  const { data: row, error: fetchError } = await supabase
    .from("rooms_prices")
    .select("id, room_id, start_date, end_date, price_per_night")
    .eq("id", priceId)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!row) return;

  const roomId = row.room_id as string;
  const start = toDateOnly(String(row.start_date));
  const end = toDateOnly(String(row.end_date));
  const price = Number(row.price_per_night);

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("start_date, end_date")
    .eq("room_id", roomId)
    .lt("start_date", addDays(end, 1))
    .gt("end_date", start);

  if (bookingsError) throw bookingsError;

  const keepDays = new Map<string, number>();
  for (const booking of bookings ?? []) {
    let day = toDateOnly(String(booking.start_date));
    const checkout = toDateOnly(String(booking.end_date));
    while (day < checkout) {
      if (day >= start && day <= end && price > 0) {
        keepDays.set(day, price);
      }
      day = addDays(day, 1);
    }
  }

  const { error: deleteError } = await supabase
    .from("rooms_prices")
    .delete()
    .eq("id", priceId);
  if (deleteError) throw deleteError;

  if (keepDays.size === 0) return;

  const { data: remaining, error: remainingError } = await supabase
    .from("rooms_prices")
    .select("id, room_id, start_date, end_date, price_per_night")
    .eq("room_id", roomId)
    .lte("start_date", end)
    .gte("end_date", start);

  if (remainingError) throw remainingError;

  const remainingRows = (remaining ?? []).map((r) => ({
    id: r.id as string,
    room_id: roomId,
    start_date: toDateOnly(String(r.start_date)),
    end_date: toDateOnly(String(r.end_date)),
    price_per_night: Number(r.price_per_night),
  }));

  const toRestore = new Map<string, number>();
  for (const [day, nightPrice] of keepDays) {
    if (getPriceForNight(remainingRows, roomId, day) <= 0) {
      toRestore.set(day, nightPrice);
    }
  }

  if (toRestore.size === 0) return;

  const { error: insertError } = await supabase
    .from("rooms_prices")
    .insert(collapseDayPrices(roomId, toRestore));
  if (insertError) throw insertError;
}
