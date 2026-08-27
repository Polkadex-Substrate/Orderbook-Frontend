import { ApiPromise } from "@polkadot/api";
import { getNonce } from "@orderbook/core/helpers/getNonce";

type WithdrawPayload = {
  asset: string | "PDEX";
  amount: string | number;
};

export const createWithdrawSigningPayload = (
  payload: WithdrawPayload,
  api: ApiPromise,
  isExtensionSigner: boolean
) => {
  if (isExtensionSigner) {
    /*
     * THE STRING THE EXTENSION SIGNS MUST EQUAL THE BACKEND'S OWN
     * `serde_json::to_string(&WithdrawPayloadCallByUser)`, byte for byte.
     * The server verifies the extension signature by re-serialising the parsed
     * payload and checking the signature over that string - so field ORDER
     * must match the Rust struct (asset_id, amount, timestamp,
     * destination_network), and `amount` must be a STRING, because the struct
     * field is `String` and an unquoted number fails the parse before
     * verification is even attempted.
     *
     * String(payload.amount) and NOT Number(...).toString(): a Number round
     * trip turns small amounts into scientific notation ("1.5e-8"), which the
     * backend's decimal parser rejects. The user's typed digits pass through
     * untouched.
     */
    return {
      asset_id: { asset: payload.asset },
      amount: String(payload.amount),
      timestamp: getNonce(),
      destination_network: null,
    };
  }
  const data = {
    asset_id:
      payload.asset === "PDEX" ? { polkadex: null } : { asset: payload.asset },
    amount: payload.amount,
    timestamp: getNonce(),
    destination_network: null,
  };
  return data;
};
