import { createClient } from "jsr:@supabase/supabase-js@2";

const APP_NAME = "Mel&Dim";
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100; // Expo accepts at most 100 messages per request

type Booking = {
  id: string;
  room_id: string;
  property_id: string;
  start_date: string;
  end_date: string;
  departure_note: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Europe/Athens calendar date (not UTC), e.g. "2026-10-11"
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Athens",
  });

  // 1. Only bookings that start or end today (not the whole table)
  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, room_id, property_id, start_date, end_date, departure_note")
    .or(`start_date.eq.${today},end_date.eq.${today}`)
    .returns<Booking[]>();

  if (bookingsError) return json({ bookingsError }, 500);
  if (!bookings?.length) return new Response("No bookings today");

  // 2. Only the rooms and properties involved today
  const roomIds = [...new Set(bookings.map((b) => b.room_id))];
  const propertyIds = [...new Set(bookings.map((b) => b.property_id))];

  const [roomsRes, propertiesRes] = await Promise.all([
    supabase.from("rooms").select("id, name").in("id", roomIds),
    supabase.from("properties").select("id, name, user_id").in("id", propertyIds),
  ]);

  if (roomsRes.error || propertiesRes.error) {
    return json(
      { roomsError: roomsRes.error, propertiesError: propertiesRes.error },
      500,
    );
  }

  const roomNameById = new Map(
    (roomsRes.data ?? []).map((r) => [r.id as string, r.name as string]),
  );
  const propertyById = new Map(
    (propertiesRes.data ?? []).map((p) => [p.id as string, p]),
  );

  // Owners with several properties get the property name in each line
  const propertyCountByUser = new Map<string, number>();
  for (const p of propertiesRes.data ?? []) {
    propertyCountByUser.set(p.user_id, (propertyCountByUser.get(p.user_id) ?? 0) + 1);
  }

  // 3. Build the messages PER OWNER
  const bookingsByRoom = new Map<string, Booking[]>();
  for (const b of bookings) {
    const list = bookingsByRoom.get(b.room_id) ?? [];
    list.push(b);
    bookingsByRoom.set(b.room_id, list);
  }

  const messagesByUser = new Map<string, string[]>();
  const addMessage = (userId: string, message: string) => {
    const list = messagesByUser.get(userId) ?? [];
    list.push(message);
    messagesByUser.set(userId, list);
  };

  for (const [roomId, roomBookings] of bookingsByRoom) {
    const property = propertyById.get(roomBookings[0].property_id);
    if (!property?.user_id) continue; // property without owner: skip

    const roomName = roomNameById.get(roomId) ?? "Δωμάτιο";
    const label = (propertyCountByUser.get(property.user_id) ?? 0) > 1
      ? `${property.name} – ${roomName}`
      : roomName;

    const hasCheckout = roomBookings.some((b) => b.end_date === today);
    const hasCheckin = roomBookings.some((b) => b.start_date === today);

    // Changeover: one guest leaves and another arrives in the same room today
    if (hasCheckout && hasCheckin) {
      addMessage(property.user_id, `Αλλαγή σήμερα: ${label}`);
    }

    const needsSheets = roomBookings.some(
      (b) =>
        b.end_date === today &&
        b.departure_note?.includes("Αλλαγή σεντονιών"),
    );
    if (needsSheets) {
      addMessage(property.user_id, `Σεντόνια σήμερα: ${label}`);
    }
  }

  if (messagesByUser.size === 0) return new Response("No alerts today");

  // 4. Tokens only for the owners who have alerts
  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("token, user_id")
    .in("user_id", [...messagesByUser.keys()]);

  if (tokensError) return json({ tokensError }, 500);
  if (!tokens?.length) return new Response("No devices for owners with alerts");

  const pushMessages = tokens.map((t) => ({
    to: t.token as string,
    title: APP_NAME,
    body: messagesByUser.get(t.user_id)!.join("\n"),
    sound: "default",
  }));

  // 5. Send in batches; collect tokens of uninstalled apps / dead devices
  const invalidTokens: string[] = [];

  for (let i = 0; i < pushMessages.length; i += EXPO_BATCH_SIZE) {
    const batch = pushMessages.slice(i, i + EXPO_BATCH_SIZE);

    const pushRes = await fetch(EXPO_PUSH_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(batch),
    });

    if (!pushRes.ok) {
      return new Response(`Push failed: ${await pushRes.text()}`, { status: 502 });
    }

    // Expo returns one ticket per message, in the same order
    const { data: tickets } = await pushRes.json();
    tickets?.forEach((ticket: { status: string; details?: { error?: string } }, idx: number) => {
      if (ticket.status === "error" && ticket.details?.error === "DeviceNotRegistered") {
        invalidTokens.push(batch[idx].to);
      }
    });
  }

  // 6. Clean up dead tokens so we stop sending to them
  if (invalidTokens.length) {
    await supabase.from("push_tokens").delete().in("token", invalidTokens);
  }

  return new Response(
    `Sent alerts to ${messagesByUser.size} owners on ${pushMessages.length} devices` +
      (invalidTokens.length ? `, removed ${invalidTokens.length} dead tokens` : ""),
  );
});