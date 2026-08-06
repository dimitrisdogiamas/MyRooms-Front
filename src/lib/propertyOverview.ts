import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";
import { addDays } from "@/lib/bookingInsights";
import { getPriceForNight, type RoomPricing } from "@/lib/roomPricing";

export type PropertyYearOverview = {
  year: number;
  guests: number;
  bookings: number;
  occupiedNights: number;
  revenue: number;
};

export type PropertyOverview = {
  years: PropertyYearOverview[];
  totals: {
    guests: number;
    bookings: number;
    occupiedNights: number;
    revenue: number;
  };
};

export function getPropertyYearOverview(
  bookings: Booking[],
  rooms: Room[],
  roomPrices: RoomPricing[],
  year: number,
): PropertyYearOverview {
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;

  let bookingsCount = 0;
  let occupiedNights = 0;
  let revenue = 0;
  const guestNames = new Set<string>();

  for (const room of rooms) {
    const roomBookings = bookings.filter((b) => b.room_id === room.id);

    for (const booking of roomBookings) {
      const start = booking.start_date.slice(0, 10);
      const end = booking.end_date.slice(0, 10);

      if (end <= yearStart || start >= nextYearStart) continue;

      bookingsCount += 1;
      const guest = booking.guest_name?.trim();
      if (guest) guestNames.add(guest);

      let current = start < yearStart ? yearStart : start;
      const last = end > nextYearStart ? nextYearStart : end;

      while (current < last) {
        occupiedNights += 1;
        revenue += getPriceForNight(roomPrices, room.id, current);
        current = addDays(current, 1);
      }
    }
  }

  return {
    year,
    guests: guestNames.size,
    bookings: bookingsCount,
    occupiedNights,
    revenue,
  };
}

/** Overview across every year that has bookings (plus current year). */
export function getPropertyOverview(
  bookings: Booking[],
  rooms: Room[],
  roomPrices: RoomPricing[],
): PropertyOverview {
  const years = new Set<number>();
  years.add(new Date().getFullYear());

  for (const booking of bookings) {
    const startY = Number(booking.start_date.slice(0, 4));
    const endY = Number(booking.end_date.slice(0, 4));
    for (let y = startY; y <= endY; y++) years.add(y);
  }

  const yearStats = [...years]
    .sort((a, b) => b - a)
    .map((year) =>
      getPropertyYearOverview(bookings, rooms, roomPrices, year),
    );

  const allGuests = new Set<string>();
  for (const booking of bookings) {
    const guest = booking.guest_name?.trim();
    if (guest) allGuests.add(guest);
  }

  return {
    years: yearStats,
    totals: {
      guests: allGuests.size,
      bookings: yearStats.reduce((sum, y) => sum + y.bookings, 0),
      occupiedNights: yearStats.reduce((sum, y) => sum + y.occupiedNights, 0),
      revenue: yearStats.reduce((sum, y) => sum + y.revenue, 0),
    },
  };
}
