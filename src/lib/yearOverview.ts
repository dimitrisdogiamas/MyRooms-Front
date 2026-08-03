import { addDays } from "./bookingInsights";
import { getPriceForNight, type RoomPricing } from "./roomPricing";
import type { Booking } from "@/components/BookingsList";
import type { Room } from "@/components/RoomsSelector";

export type RoomYearStats = {
  roomId: string;
  roomName: string;
  bookingsCount: number;
  occupiedNights: number;
  income: number;
  occupiedDates: string[];
};

export type YearOverview = {
  year: number;
  rooms: RoomYearStats[];
  totals: {
    rooms: number;
    bookings: number;
    occupiedNights: number;
    income: number;
  };
};

export function getYearOverview(
  bookings: Booking[],
  rooms: Room[],
  roomPrices: RoomPricing[],
  year: number,
): YearOverview {
  const yearStart = `${year}-01-01`;
  const nextYearStart = `${year + 1}-01-01`;
  const roomsStats: RoomYearStats[] = [];

  for (const room of rooms) {
    const roomBookings = bookings.filter((b) => b.room_id === room.id);

    let bookingsCount = 0;
    let occupiedNights = 0;
    let income = 0;
    const occupiedDates: string[] = [];

    for (const booking of roomBookings) {
      const start = booking.start_date.slice(0, 10);
      const end = booking.end_date.slice(0, 10);

      // No overlap with this year
      if (end <= yearStart || start >= nextYearStart) continue;

      bookingsCount += 1;

      let current = start < yearStart ? yearStart : start;
      const last = end > nextYearStart ? nextYearStart : end;

      while (current < last) {
        occupiedNights += 1;
        occupiedDates.push(current);
        income += getPriceForNight(roomPrices, room.id, current);
        current = addDays(current, 1);
      }
    }

    roomsStats.push({
      roomId: room.id,
      roomName: room.name,
      bookingsCount,
      occupiedNights,
      income,
      occupiedDates,
    });
  }

  return {
    year,
    rooms: roomsStats,
    totals: {
      rooms: roomsStats.length,
      bookings: roomsStats.reduce((sum, r) => sum + r.bookingsCount, 0),
      occupiedNights: roomsStats.reduce((sum, r) => sum + r.occupiedNights, 0),
      income: roomsStats.reduce((sum, r) => sum + r.income, 0),
    },
  };
}
