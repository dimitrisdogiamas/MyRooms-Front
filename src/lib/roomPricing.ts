import { addDays } from "./bookingInsights";

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

export function getPriceForNight(
  prices: RoomPricing[],
  roomId: string,
  date: string,
): number {
  const day = toDateOnly(date);
  const period = prices.find(
    (p) =>
      p.room_id === roomId &&
      toDateOnly(p.start_date) <= day &&
      toDateOnly(p.end_date) >= day,
  );
  return period?.price_per_night || 0;
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
