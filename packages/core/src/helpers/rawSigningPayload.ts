import type {
  Signer,
  SignerPayloadRaw,
  SignerResult,
} from "@polkadot/types/types";

/**
 * The payload handed to an extension's `signer.signRaw`.
 *
 * THE BUG THIS FIXES: ALL ORDER PLACEMENT FAILED ON ENKRYPT.
 *
 *     8546: type is not bytes: signer_signRaw
 *
 * Every order type, every attempt, no wallet popup, immediate "Something went
 * wrong". The API returned 200 throughout - the failure was client-side, before
 * the wallet was ever asked to sign.
 *
 * The cause is a missing field. Four call sites did this:
 *
 *     await signer.signRaw({ address, data });
 *
 * `SignerPayloadRaw` requires `type: 'bytes' | 'payload'`. Omitted, it arrives
 * as `undefined`. polkadot-js's extension tolerates that and assumes bytes;
 * Enkrypt validates it and throws the message above, naming the exact check it
 * failed. Since polkadot-js is what everyone develops against, the omission was
 * invisible for as long as nobody used the other officially recommended wallet.
 *
 * WHY TYPESCRIPT DID NOT CATCH A MISSING REQUIRED FIELD
 * `getSigner` was typed `(address: string) => any`. One `any` at the provider
 * boundary erased the contract for every call site downstream. That is the more
 * important lesson than the missing field: the field was one line, the `any`
 * hid it across four hooks and an entire wallet.
 *
 * WHY `bytes` AND NOT `payload`
 * `payload` means "this is a SCALE-encoded extrinsic payload, decode and display
 * it". These calls sign an arbitrary JSON string or an order id - not an
 * extrinsic - so `bytes` is the truthful description. Sending `payload` would
 * make wallets try to decode the JSON as an extrinsic and fail differently.
 *
 * Note this is a DIFFERENT path from Funding to Trading transfers, which sign a
 * real `deposit` extrinsic through `signAndSend` and worked fine throughout -
 * which is why the report could say transfers work and orders do not.
 *
 * Import-free except for the type, so the shape is testable without a wallet.
 */

/**
 * Build a raw signing payload with the type field the spec requires.
 *
 * Use this rather than an object literal at the call site. Four call sites each
 * wrote their own and all four forgot the same field; one definition cannot
 * disagree with itself.
 */
export const rawSignerPayload = (
  address: string,
  data: string
): SignerPayloadRaw => ({
  address,
  data,
  // NEVER omit or vary this. Enkrypt rejects anything that is not "bytes" for
  // signRaw, and every payload we sign this way is opaque bytes.
  type: "bytes",
});

/**
 * Sign a raw payload, or fail with something a user can act on.
 *
 * `signRaw` is OPTIONAL on polkadot's `Signer` interface. Typing `getSigner`
 * properly is what revealed that - under the previous `any`, a wallet exposing a
 * signer without `signRaw` would have thrown "signer.signRaw is not a function"
 * into a toast, which tells the user nothing and looks identical to the bug this
 * module fixes.
 *
 * Off-chain order payloads cannot be signed any other way, so a wallet lacking
 * this method genuinely cannot trade here, and saying so plainly is the only
 * honest outcome.
 */
export const signRawOrThrow = async (
  signer: Signer | undefined,
  address: string,
  data: string
): Promise<SignerResult> => {
  if (!signer) {
    throw new Error(
      "No signer found for this account. Reconnect your wallet and try again."
    );
  }
  if (!signer.signRaw) {
    throw new Error(
      "This wallet cannot sign order payloads. Try Enkrypt or the Polkadot.js extension."
    );
  }
  return signer.signRaw(rawSignerPayload(address, data));
};
