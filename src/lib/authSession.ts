import * as QueryParams from "expo-auth-session/build/QueryParams";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type SessionFromUrlResult = "ok" | "noop";

/** Create a Supabase session from an auth redirect / deep-link URL. */
export async function createSessionFromUrl(
  url: string,
): Promise<SessionFromUrlResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  const accessToken = params.access_token;
  const refreshToken = params.refresh_token;
  const code = params.code;
  const tokenHash = params.token_hash;
  const type = params.type;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    return "ok";
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    if (error) throw error;
    return "ok";
  }

  // Android often strips URL hash (#access_token=...), so this path may never run.
  if (!accessToken) return "noop";

  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? "",
  });
  if (error) throw error;
  return "ok";
}
