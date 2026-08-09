import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import { addDays } from "@/lib/bookingInsights";
import type { Expense } from "@/lib/expenses";
import { getPriceForNight, type RoomPricing } from "@/lib/roomPricing";

export type PropertyYearOverview = {
  year: number;
  adults: number;
  children: number;
  bookings: number;
  pricedNights: number;
  zeroPriceNights: number;
  occupiedNights: number;
  revenue: number;
  expenses: number;
};

export type PropertyOverview = {
  years: PropertyYearOverview[];
  totals: {
    adults: number;
    children: number;
    bookings: number;
    pricedNights: number;
    zeroPriceNights: number;
    occupiedNights: number;
    revenue: number;
    expenses: number;
  };
};

function expenseYear(expense: Expense): number {
  return Number(String(expense.date).slice(0, 4));
}

export function getPropertyYearOverview(
  bookings: Booking[],
  rooms: Room[],
  roomPrices: RoomPricing[],
  year: number,
  expenses: Expense[] = [],
): PropertyYearOverview {
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;

  let bookingsCount = 0;
  let adults = 0;
  let children = 0;
  let pricedNights = 0;
  let zeroPriceNights = 0;
  let revenue = 0;

  for (const room of rooms) {
    const roomBookings = bookings.filter((b) => b.room_id === room.id);

    for (const booking of roomBookings) {
      const start = booking.start_date.slice(0, 10);
      const end = booking.end_date.slice(0, 10);

      if (end <= yearStart || start >= nextYearStart) continue;

      bookingsCount += 1;
      adults += booking.adults ?? 2;
      children += booking.children ?? 0;

      let current = start < yearStart ? yearStart : start;
      const last = end > nextYearStart ? nextYearStart : end;

      while (current < last) {
        const price = getPriceForNight(roomPrices, room.id, current);
        revenue += price;
        if (price > 0) pricedNights += 1;
        else zeroPriceNights += 1;
        current = addDays(current, 1);
      }
    }
  }

  const yearExpenses = expenses
    .filter((e) => expenseYear(e) === year)
    .reduce((sum, e) => sum + Number(e.amount), 0);

  return {
    year,
    adults,
    children,
    bookings: bookingsCount,
    pricedNights,
    zeroPriceNights,
    occupiedNights: pricedNights + zeroPriceNights,
    revenue,
    expenses: yearExpenses,
  };
}

/** Overview across every year that has bookings (plus current year). */
export function getPropertyOverview(
  bookings: Booking[],
  rooms: Room[],
  roomPrices: RoomPricing[],
  expenses: Expense[] = [],
): PropertyOverview {
  const years = new Set<number>();
  years.add(new Date().getFullYear());

  for (const booking of bookings) {
    const startY = Number(booking.start_date.slice(0, 4));
    const endY = Number(booking.end_date.slice(0, 4));
    for (let y = startY; y <= endY; y++) years.add(y);
  }

  for (const expense of expenses) {
    const y = expenseYear(expense);
    if (Number.isFinite(y)) years.add(y);
  }

  const yearStats = [...years]
    .sort((a, b) => b - a)
    .map((year) =>
      getPropertyYearOverview(bookings, rooms, roomPrices, year, expenses),
    );

  return {
    years: yearStats,
    totals: {
      adults: yearStats.reduce((sum, y) => sum + y.adults, 0),
      children: yearStats.reduce((sum, y) => sum + y.children, 0),
      bookings: yearStats.reduce((sum, y) => sum + y.bookings, 0),
      pricedNights: yearStats.reduce((sum, y) => sum + y.pricedNights, 0),
      zeroPriceNights: yearStats.reduce((sum, y) => sum + y.zeroPriceNights, 0),
      occupiedNights: yearStats.reduce((sum, y) => sum + y.occupiedNights, 0),
      revenue: yearStats.reduce((sum, y) => sum + y.revenue, 0),
      expenses: yearStats.reduce((sum, y) => sum + y.expenses, 0),
    },
  };
}
