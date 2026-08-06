/**
 * Interpret the reply from a user-action mutation (place order, cancel, withdraw,
 * cancel all).
 *
 * WHY THIS EXISTS
 * These mutations are typed `place_order?: string | null` - an opaque string. The
 * AWS Lambda backend put a JSON envelope in it:
 *
 *   {"is_success": true, "body": "..."}
 *
 * so every call site did `JSON.parse(result.data.place_order)`. The Rust backend
 * that replaced it returns a plain identifier instead - a hash or order id. That
 * is not JSON, and parsing a value like `0xabc123` fails with
 *
 *   Unexpected non-whitespace character after JSON at position 1
 *
 * because `0` parses as a complete number and `x` is then unexpected. The order
 * had already been accepted and matched on the engine by that point; only the
 * reading of the reply blew up. Combined with the catch that swallowed anything
 * without an `.errors` array, that produced a "success" notification, no order in
 * the list, and - once the swallow was fixed - a raw JSON parse error in the UI.
 *
 * This accepts BOTH envelopes so the frontend works against either backend, and
 * treats failure as something the server has to state explicitly.
 *
 * Import-free so it can be unit tested directly.
 */

export type UserActionOutcome = {
  ok: boolean;
  /** Present when there is something worth telling the user. */
  message?: string;
};

const LEGACY_ENVELOPE_FALLBACK = "The server rejected the request.";

export const interpretUserActionResponse = (
  payload: string | null | undefined,
  errors?: readonly { message?: string }[] | null
): UserActionOutcome => {
  // GraphQL errors outrank the payload. The Rust backend reports failure this
  // way rather than in the payload, and a partial response can carry both.
  const errorMessages = (errors ?? [])
    .map((e) => e?.message)
    .filter((m): m is string => Boolean(m && m.trim()));
  if (errorMessages.length > 0) {
    return { ok: false, message: errorMessages.join("; ") };
  }

  if (payload === null || payload === undefined || !String(payload).trim()) {
    return { ok: false, message: "No valid response from server." };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    // NOT JSON. This is the Rust backend's opaque identifier - the case that
    // used to throw. No GraphQL errors and a non-empty payload means the action
    // was accepted, so this is the success path, not a failure.
    return { ok: true };
  }

  // Legacy Lambda envelope. Honour it exactly: `is_success: false` is the
  // server explicitly refusing, and `body` carries the reason.
  if (
    parsed !== null &&
    typeof parsed === "object" &&
    typeof (parsed as { is_success?: unknown }).is_success === "boolean"
  ) {
    const { is_success: isSuccess, body } = parsed as {
      is_success: boolean;
      body?: unknown;
    };
    if (isSuccess) return { ok: true };

    const reason =
      typeof body === "string" && body.trim() ? body : LEGACY_ENVELOPE_FALLBACK;
    return { ok: false, message: reason };
  }

  // Valid JSON but not the legacy envelope - a structured id, a number, an
  // object of order details. The server answered, so the action was accepted.
  return { ok: true };
};
