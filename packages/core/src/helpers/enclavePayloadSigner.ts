import { Codec } from "@polkadot/types/types";
import { KeyringPair } from "@polkadot/keyring/types";
import { u8aToHex } from "@polkadot/util";
import { ApiPromise } from "@polkadot/api";

export type SignatureEnumSr25519 = {
  Sr25519: string;
};
export const signPayload = (
  api: ApiPromise,
  userKeyring: KeyringPair,
  payload: Codec
): SignatureEnumSr25519 => {
  const signatureU8 = userKeyring.sign(payload.toU8a(), { withType: true });
  const signature = u8aToHex(signatureU8);
  const multiSignature: any = api.createType("MultiSignature", signature);
  return {
    Sr25519: multiSignature.toJSON().sr25519.slice(2),
  };
};
