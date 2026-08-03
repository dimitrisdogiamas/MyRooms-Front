import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: rooms, error: roomsError } = await supabase
    .from("rooms")
    .select("id, name");

  const { data: bookings, error: bookingsError } = await supabase
    .from("bookings")
    .select("id, room_id, start_date, end_date, departure_note");

  const { data: tokens, error: tokensError } = await supabase
    .from("push_tokens")
    .select("token");

  if (roomsError || bookingsError || tokensError) {
    return new Response(
      JSON.stringify({ roomsError, bookingsError, tokensError }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  if (!rooms?.length) {
    return new Response("No rooms");
  }
  if (!tokens?.length) {
    return new Response("No push tokens");
  }

  // Europe/Athens calendar date (not UTC)
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "Europe/Athens",
  });

  const messages: string[] = [];
  const bookingRows = bookings ?? [];

  for (const room of rooms) {
    const sorted = bookingRows
      .filter((b) => b.room_id === room.id)
      .sort((a, b) => a.start_date.localeCompare(b.start_date));

    for (let i = 0; i < sorted.length - 1; i++) {
      if (
        sorted[i].end_date === sorted[i + 1].start_date &&
        sorted[i].end_date === today
      ) {
        messages.push(`Αλλαγή σήμερα: ${room.name}`);
      }
    }

    for (const b of sorted) {
      if (
        b.departure_note?.includes("Αλλαγή σεντονιών") &&
        b.end_date === today
      ) {
        messages.push(`Σεντόνια σήμερα: ${room.name}`);
      }
    }
  }

  if (messages.length === 0) {
    return new Response("No alerts today");
  }

  const body = tokens.map((t) => ({
    to: t.token,
    title: "Mel&Dim",
    body: messages.join("\n"),
    sound: "default",
  }));

  const pushRes = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!pushRes.ok) {
    const errText = await pushRes.text();
    return new Response(`Push failed: ${errText}`, { status: 502 });
  }

  return new Response(
    `Sent ${messages.length} alerts to ${tokens.length} devices`,
  );
});
