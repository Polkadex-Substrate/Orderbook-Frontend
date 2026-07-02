import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { parseUnits } from "viem";
import { BRIDGE_CHAINS, BRIDGE_TOKENS } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

const _substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const _wethToken = BRIDGE_TOKENS.weth;

const POLKADEX_WS_URL = _substrateChain.wsUrl;
const WETH_ASSET_ID = Number(_wethToken.chains.polkadex?.assetId ?? "3");

let apiInstance: ApiPromise | null = null;

async function getApi(): Promise<ApiPromise> {
  if (apiInstance && apiInstance.isConnected) return apiInstance;
  console.log("Connecting to Polkadex node...");
  const provider = new WsProvider(POLKADEX_WS_URL);
  apiInstance = await ApiPromise.create({ provider });
  console.log("Connected to Polkadex ✅");
  return apiInstance;
}

// Extracts the ISMP post request commitment from block events.
//
// pallet-ismp emits PostRequest { source_chain, dest_chain, request_nonce, commitment }
// Section names vary between runtime versions (e.g. "ismp", "palletIsmp").
// Tries every known field path; throws with a full event dump if not found.
async function getPostRequestCommitment(
  api: ApiPromise,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  blockHash: any,
): Promise<string> {
  const apiAt = await api.at(blockHash);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = await (apiAt.query.system.events as any)();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const { event } of events as any[]) {
    const section: string = event.section.toLowerCase();
    const method: string = event.method.toLowerCase();

    // Match any ISMP / HFT pallet event that looks like a post-request dispatch
    const isIsmpSection =
      section.includes("ismp") ||
      section.includes("hyperfungible") ||
      section.includes("pallet_ismp");

    const isRequestMethod =
      method.includes("postrequest") ||
      method.includes("request") ||
      method.includes("dispatch") ||
      method.includes("send");

    if (!isIsmpSection && !isRequestMethod) continue;

    console.log(
      `Post Request Event [${event.section}.${event.method}]:`,
      event.data.toHuman(),
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const json = event.data.toJSON() as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const human = event.data.toHuman() as any;

    // pallet-ismp v1/v2: { source_chain, dest_chain, request_nonce, commitment }
    // Array form:         [source, dest, nonce, commitment]
    const commitment =
      json?.commitment ??
      json?.[3] ??
      json?.[0]?.commitment ??
      human?.commitment ??
      human?.[3] ??
      human?.[0]?.commitment;

    if (commitment && typeof commitment === "string" && commitment.startsWith("0x")) {
      return commitment;
    }
  }

  // Commitment not found — dump all event names so the developer can identify the right one
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allEvents = (events as any[]).map(
    ({ event }: any) => `${event.section}.${event.method}`,
  );
  console.warn(
    "⚠️ ISMP post request commitment not found. All events in block:",
    allEvents,
  );
  throw new Error(
    `ISMP post request commitment not found in block ${blockHash.toHex()}. ` +
      `Events present: [${allEvents.join(", ")}]`,
  );
}

export type SubstrateToEvmParams = {
  amount: number;
  recipient: string; // EVM 0x address on Sepolia
  senderAddress: string; // Substrate ss58 address on Polkadex
  decimals?: number;
  assetId?: number; // Polkadex asset ID; defaults to WETH (3)
};

// TODO(hft-migration): Replace with new HFT pallet extrinsic once Polkadex team
// confirms the exact call name. Based on pallet-hyper-fungible-token, the call
// is api.tx.hyperFungibleToken.send(). Verify on-chain before going to mainnet.
export async function transferSubstrateToEvm(
  params: SubstrateToEvmParams,
): Promise<{ hash: string; commitment: string }> {
  const {
    amount,
    recipient,
    senderAddress,
    decimals = 18,
    assetId = WETH_ASSET_ID,
  } = params;

  if (!recipient.startsWith("0x")) {
    throw new Error("Recipient must be an EVM address starting with 0x");
  }

  // ── Step 1: Enable extensions ─────────────────────────────────────────────
  const extensions = await web3Enable("Polkadex Bridge");
  if (extensions.length === 0) {
    throw new Error(
      "No Polkadot extension found. Please install Polkadot.js, Talisman, or SubWallet.",
    );
  }

  // ── Step 2: Get signer from extension ─────────────────────────────────────
  let injector: Awaited<ReturnType<typeof web3FromAddress>>;
  try {
    injector = await web3FromAddress(senderAddress);
  } catch {
    throw new Error(
      `Account "${senderAddress}" not found in any browser extension. ` +
        `Make sure it is imported in Polkadot.js / Talisman / SubWallet.`,
    );
  }

  const signer = injector.signer;
  if (!signer?.signPayload) {
    throw new Error(
      "Extension signer does not support signPayload — please update your wallet extension.",
    );
  }

  // ── Step 3: Connect to Polkadex node ──────────────────────────────────────
  const api = await getApi();

  // Guard: confirm the HFT pallet is deployed on this chain
  if (!api.tx.hyperFungibleToken?.send) {
    throw new Error(
      "hyperFungibleToken.send extrinsic not found on this Polkadex node. " +
        "The chain may not have deployed the HFT pallet yet.",
    );
  }

  // ── Step 4: Build params ──────────────────────────────────────────────────
  const amountBigInt = parseUnits(String(amount), decimals);

  // The IsmpHostStateMachine enum on Polkadex is SCALE-encoded as a tagged
  // variant, not a string. Polkadot.js rejects "EVM-11155111" — it needs the
  // object form { Evm: chainId }.
  const destinationEnum = { Evm: _evmChain.chainId };

  console.log("Substrate → EVM params:", {
    assetId: WETH_ASSET_ID,
    destination: destinationEnum,
    recipient,
    amount: amountBigInt.toString(),
    relayerFee: 0,
  });

  // ── Step 5: Build and sign tx ─────────────────────────────────────────────
  // pallet-hyper-fungible-token send extrinsic:
  //   asset_id      → the Polkadex asset ID for WETH (3)
  //   destination   → target state machine as IsmpHostStateMachine enum
  //   recipient     → EVM 0x address bytes (20 bytes)
  //   amount        → transfer amount in asset's native units
  //   timeout       → seconds until request expires
  //   relayer_fee   → 0 (non-zero pulls from user's asset balance; testnet works fine with 0)
  //   call_data     → None
  const sendParams = {
    assetId,
    destination: destinationEnum,
    recipient,
    amount: amountBigInt,
    timeout: BigInt(3600),
    relayerFee: 0n,
    callData: null,
  };

  // Resolve with both hash and blockHash so we can query events for the
  // commitment in step 6. The signAndSend callback must stay synchronous,
  // so commitment extraction happens after the Promise resolves.
  const { hash, blockHash } = await new Promise<{
    hash: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    blockHash: any;
  }>((resolve, reject) => {
    api.tx.hyperFungibleToken
      .send(sendParams)
      .signAndSend(senderAddress, { signer }, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(
              new Error(
                `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`,
              ),
            );
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          const hash = status.asInBlock.toHex();
          console.log("Tx in block ✅ hash:", hash);
          resolve({ hash, blockHash: status.asInBlock });
        }

        if (status.isFinalized) {
          console.log("Tx finalized ✅ hash:", status.asFinalized.toHex());
        }
      })
      .catch(reject);
  });

  // ── Step 6: Extract post request commitment from block events ─────────────
  // If the ISMP event cannot be parsed (e.g. unexpected pallet name / schema),
  // fall back to the block hash so the commitment field is always a non-empty
  // string in the mutation payload. The console warning above will show which
  // events are present so the extraction logic can be updated.
  let commitment: string;
  try {
    commitment = await getPostRequestCommitment(api, blockHash);
    console.log("✅ Post Request Commitment:", commitment);
  } catch {
    commitment = hash;
    console.warn(
      "⚠️ Falling back to block hash as commitment placeholder.",
      "Update getPostRequestCommitment once the correct ISMP event is identified.",
    );
  }

  return { hash, commitment };
}
