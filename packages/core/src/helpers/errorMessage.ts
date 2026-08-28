/**
 * Getting a usable message out of whatever was thrown.
 *
 * THE BUG THIS FIXES, CAUGHT BY OUR OWN INSTRUMENT.
 * ORDERBOOK-TESTNET-N: "Toast error had no usable title - upstream error lost",
 * three events, one user, /trading/WETH-USDT, with
 *
 *     titleType: "undefined"    titleValue: "undefined"
 *
 * That is the tester's Enkrypt session, at the minute they were placing orders.
 * Their console showed the real cause - `8546: type is not bytes:
 * signer_signRaw` - but the toast said "Something went wrong", because the
 * mutation error handlers did this:
 *
 *     onError: (error: Error) => onHandleError?.(error.message)
 *
 * The `: Error` annotation is a claim, not a check. react-query hands the
 * handler whatever was thrown, and an injected wallet signer is entitled to
 * throw a plain object - `{ code: 8546, message: "..." }` is the JSON-RPC
 * convention - or a string. `.message` on those is undefined, so the real
 * failure was discarded at the last step before the user could read it.
 *
 * The cost was days: the diagnosis needed a tester who thought to open the
 * console. A wallet incompatibility should be legible from the toast.
 *
 * WHY A SHARED HELPER
 * Three call sites wrote the same wrong thing (`useCreateOrder`,
 * `useCancelOrder`, `useCancelAllOrders`) while two others - `useDeposit` and
 * `useWithdraw` - had already learned to check `instanceof Error`. Five
 * handlers, two behaviours, one of them silently lossy. That divergence is the
 * argument for one definition.
 *
 * Import-free and pure, so every throwable shape can be pinned in tests.
 */

/** Longest message we will put in a toast before truncating. */
export const MAX_ERROR_MESSAGE = 300;

const clean = (value: string): string => {
  const trimmed = value.trim();
  if (trimmed.length <= MAX_ERROR_MESSAGE) return trimmed;
  return `${trimmed.slice(0, MAX_ERROR_MESSAGE - 1)}…`;
};

/**
 * The best human-readable message for anything a `throw` can produce, or an
 * empty string when there is genuinely nothing to say.
 *
 * Returning "" rather than a fallback like "Something went wrong" is
 * deliberate: the CALLER decides the fallback, and `toastTitle` already owns
 * that decision. A fallback baked in here would make "we had nothing" and "the
 * error said 'Something went wrong'" indistinguishable, which is how the
 * original bug hid.
 */
export const errorMessage = (error: unknown): string => {
  try {
    return extract(error);
  } catch {
    /*
     * THIS FUNCTION MUST NOT THROW. It runs inside error handlers - the last
     * step before a user is told what went wrong - so an exception here
     * replaces a bad message with no message and an unhandled rejection.
     *
     * Not theoretical: a test threw a hostile getter at it and it fell over.
     * Reading `.message` off an arbitrary thrown value invokes whatever code
     * that object wants, and thrown values are exactly the objects least likely
     * to be well behaved.
     */
    return "";
  }
};

const extract = (error: unknown): string => {
  if (error === null || error === undefined) return "";

  if (typeof error === "string") return clean(error);

  if (error instanceof Error) {
    const message = clean(error.message ?? "");
    if (message) return message;
    // An Error with an empty message still has a name worth showing:
    // "NotFoundError" beats silence.
    return error.name ? clean(error.name) : "";
  }

  if (typeof error === "object") {
    const e = error as Record<string, unknown>;

    // JSON-RPC / injected-wallet shape: { code, message }. This is the one
    // that was being dropped, and it is the most informative of the lot.
    if (typeof e.message === "string" && e.message.trim()) {
      const code =
        typeof e.code === "number" || typeof e.code === "string"
          ? `${e.code}: `
          : "";
      return clean(`${code}${e.message}`);
    }

    // Some libraries nest the real error one level down.
    if (e.error) {
      const nested = errorMessage(e.error);
      if (nested) return nested;
    }

    // GraphQL: { errors: [{ message }] }.
    if (Array.isArray(e.errors)) {
      const first = e.errors.find(
        (item) =>
          item && typeof (item as { message?: unknown }).message === "string"
      ) as { message?: string } | undefined;
      if (first?.message?.trim()) return clean(first.message);
    }

    // Deliberately NOT String(object) - that yields "[object Object]", which is
    // worse than the fallback because it looks like a real message.
    return "";
  }

  // Numbers, booleans, symbols. Rare, but a thrown code is still information.
  return clean(String(error));
};
