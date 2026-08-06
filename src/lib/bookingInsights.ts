export type Booking = {
  id: string,
  room_id: string,
  start_date: string,
  end_date: string,
  departure_note?: string | null,
}


export type Room = {
  id: string,
  name: string,
  property_id?: string,
}


export type Turnover = {
  roomId: string,
  roomName: string,
  date: string,
  note?: string | null,
}


export type SheetDay = {
  roomId: string,
  roomName: string,
  from: string,
  to: string,
  nights: number,
  date: string,
}

export type Sheets = {
  roomId: string,
  roomName: string,
  date: string,
  reason: 'note' | 'gap' | 'turnover' | 'available',
}
export type AvailableRoom = {
  roomId: string,
  roomName: string,
  propertyId: string,
  isTurnoverArrival: boolean,
}


export function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}


export function nightsBetween(from: string, to: string): number {
  const fromDate = new Date(from + 'T12:00:00');
  const toDate = new Date(to + 'T12:00:00');
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}


export function getTurnovers(bookings: Booking[], rooms: Room[]): Turnover[] {
  const turnovers: Turnover[] = [];
  for (const room of rooms) {
    const roomBookings = bookings
      .filter((booking) => booking.room_id === room.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    for (let i = 0; i < roomBookings.length -1 ; i++) {
      const current = roomBookings[i];
      const next = roomBookings[i + 1];
      if (current.end_date === next.start_date) {
        turnovers.push({
          roomId: room.id,
          roomName: room.name,
          date: current.end_date,
          note: current.departure_note,
        })
      }
    }
  }
  return turnovers;
}


export function getGaps(bookings: Booking[], rooms: Room[]): SheetDay[]{
  const Gaps: SheetDay[] = [];
  for (const room of rooms) {
    const roomBookings = bookings
      .filter((booking) => booking.room_id === room.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));
    for (let i = 0; i < roomBookings.length - 1; i++) {
      const current = roomBookings[i];
      const next = roomBookings[i + 1];
      const from = addDays(current.end_date, 1);
      const to = addDays(next.start_date, -1);
      const nights = nightsBetween(from, to);
      if (nights < 1) continue;

      Gaps.push({
        roomId: room.id,
        roomName: room.name,
        from,
        to,
        nights,
        date: current.end_date,
      });
    }
  }
  return Gaps;
}


export function getSheetDays(bookings: Booking[], rooms: Room[]): Sheets[] {
  const sheetDays: Sheets[] = [];
  for (const room of rooms) {
    const roomBookings = bookings
      .filter((booking) => booking.room_id === room.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    for (const booking of roomBookings) {
      if (booking.departure_note?.includes('Αλλαγή σεντονιών') && booking.end_date) {
        sheetDays.push({
          roomId: room.id,
          roomName: room.name,
          date: booking.end_date,
          reason: 'note',
        });
      }
    }

  }
  return sheetDays;
}


export function getAvailableRooms(
  bookings: Booking[],
  rooms: Room[],
  arrivals: string,
  departures: string,
): AvailableRoom[] {
  const availableRooms: AvailableRoom[] = [];

  for (const room of rooms) {
    const roomBookings = bookings.filter(
      (booking) => booking.room_id === room.id,
    );

    const hasOverlap = roomBookings.some(
      (booking) =>
        booking.start_date < departures && booking.end_date > arrivals,
    );
    if (hasOverlap) continue;

    const isTurnoverArrival = roomBookings.some(
      (b) => b.end_date === arrivals,
    );

    availableRooms.push({
      roomId: room.id,
      roomName: room.name,
      propertyId: room.property_id ?? '',
      isTurnoverArrival,
    });
  }

  return availableRooms.sort(
    (a, b) => Number(b.isTurnoverArrival) - Number(a.isTurnoverArrival),
  );
}
