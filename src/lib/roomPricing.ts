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

export function getPriceForNight(
  prices: RoomPricing[],
  roomId: string,
  date: string,
): number {
  const period = prices.find(
    (p) =>
      p.room_id === roomId &&
      p.start_date <= date &&
      p.end_date >= date,
  );
  return period?.price_per_night || 0;
}

export function getBookingIncome(
  booking: PricingBooking,
  prices: RoomPricing[],
): number {
  let total = 0;
  let current = booking.start_date;

  while (current < booking.end_date) {
    total += getPriceForNight(prices, booking.room_id, current);
    current = addDays(current, 1);
  }

  return total;
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
