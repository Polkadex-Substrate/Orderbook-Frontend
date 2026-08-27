import type { Signer } from "@polkadot/types/types";

import { rawSignerPayload, signRawOrThrow } from "./rawSigningPayload";

/*
 * Jest globals, matching the rest of this package.
 *
 * THE REPORT: every order type failed on Enkrypt with
 *
 *     8546: type is not bytes: signer_signRaw
 *
 * No wallet popup, API returning 200, balances untouched. The failure was a
 * missing `type` field on the payload, which polkadot-js tolerates and Enkrypt
 * rejects. So the test that matters is trivial and the reason it matters is not:
 * this field was omitted at four separate call sites and no type error was
 * raised, because `getSigner` returned `any`.
 */

const ADDRESS = "esqhqZeKJn1SyV2sMzEijog9zwucPQ5gLhS4CYfsVBgBr6nma";

describe("rawSignerPayload - the field whose absence broke all trading", () => {
  it("always sets type to bytes", () => {
    expect(rawSignerPayload(ADDRESS, "anything").type).toBe("bytes");
  });

  it("sets it for every kind of data we actually sign", () => {
    // The four real call sites: an order payload, an order id, a market name,
    // and a withdraw payload. All opaque bytes as far as the wallet is
    // concerned, none of them an extrinsic.
    const samples = [
      JSON.stringify({ PlaceOrder: { price: "0.3", qty: "5" } }),
      "a3f1c9de", // order id, 0x stripped
      "PDEX-3496813586714279103", // market
      JSON.stringify({ Withdraw: { asset: "PDEX", amount: "1" } }),
    ];
    for (const data of samples) {
      const payload = rawSignerPayload(ADDRESS, data);
      expect({ data, type: payload.type }).toEqual({ data, type: "bytes" });
    }
  });

  it("passes address and data through untouched", () => {
    // The signature covers `data` byte for byte; altering it here would produce
    // a signature the engine rejects, which is a worse failure than not signing
    // at all because it looks like a valid attempt.
    const data = JSON.stringify({ a: 1, b: "two" });
    expect(rawSignerPayload(ADDRESS, data)).toEqual({
      address: ADDRESS,
      data,
      type: "bytes",
    });
  });

  it("never returns 'payload' as the type", () => {
    // `payload` tells the wallet to decode SCALE and show an extrinsic. These
    // are JSON strings and ids. Getting this wrong fails in a different, more
    // confusing way than omitting it.
    expect(rawSignerPayload(ADDRESS, "{}").type).not.toBe("payload");
  });

  it("carries exactly the three fields the spec defines", () => {
    // Extra keys are silently ignored by some wallets and rejected by others,
    // which is how a payload works in development and fails in the field.
    expect(Object.keys(rawSignerPayload(ADDRESS, "x")).sort()).toEqual([
      "address",
      "data",
      "type",
    ]);
  });
});

describe("signRawOrThrow - what the wallet actually receives", () => {
  it("hands the signer a payload with type bytes", async () => {
    // The end-to-end property. A test on rawSignerPayload alone would not catch
    // a call site that built its own literal, which is exactly what happened at
    // four sites.
    const calls: unknown[] = [];
    const signer = {
      signRaw: async (payload: unknown) => {
        calls.push(payload);
        return { id: 1, signature: "0xdeadbeef" as const };
      },
    } as unknown as Signer;

    await signRawOrThrow(signer, ADDRESS, "{}");
    expect(calls).toEqual([{ address: ADDRESS, data: "{}", type: "bytes" }]);
  });

  it("returns the signer's result untouched", async () => {
    const signer = {
      signRaw: async () => ({ id: 7, signature: "0xabc" as const }),
    } as unknown as Signer;
    await expect(signRawOrThrow(signer, ADDRESS, "x")).resolves.toEqual({
      id: 7,
      signature: "0xabc",
    });
  });

  it("explains a missing signer instead of throwing a TypeError", async () => {
    // Previously this reached the user as an unhandled property access on
    // undefined, which reads as a crash rather than as "reconnect your wallet".
    await expect(signRawOrThrow(undefined, ADDRESS, "x")).rejects.toThrow(
      /Reconnect your wallet/i
    );
  });

  it("explains a wallet that cannot sign raw payloads", async () => {
    // `signRaw` is OPTIONAL on polkadot's Signer interface - which only became
    // visible once `getSigner` stopped returning `any`. Without this guard the
    // user would get "signer.signRaw is not a function".
    const noRaw = {} as unknown as Signer;
    await expect(signRawOrThrow(noRaw, ADDRESS, "x")).rejects.toThrow(
      /cannot sign order payloads/i
    );
  });

  it("names wallets that do work, so the error is actionable", async () => {
    const noRaw = {} as unknown as Signer;
    await expect(signRawOrThrow(noRaw, ADDRESS, "x")).rejects.toThrow(
      /Enkrypt|Polkadot\.js/
    );
  });
});
