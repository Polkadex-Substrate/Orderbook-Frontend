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

/**
 * Read an asset's decimals from `assets.metadata` on chain.
 *
 * Throws rather than falling back to a guess. This value scales a transfer
 * amount, so being wrong by a factor of 10^n moves the wrong quantity of funds -
 * refusing to build the extrinsic is strictly better than proceeding on an
 * assumption.
 */
async function getAssetDecimals(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  api: any,
  assetId: number
): Promise<number> {
  const meta = await api.query.assets.metadata(assetId);
  const decimals = Number(meta?.toJSON?.()?.decimals);

  if (!Number.isFinite(decimals) || decimals <= 0) {
    throw new Error(
      `Could not read decimals for Polkadex asset ${assetId} from assets.metadata. Refusing to build a transfer without a known scale.`
    );
  }
  return decimals;
}

export type SubstrateToEvmParams = {
  amount: number;
  recipient: string; // EVM 0x address on Sepolia
  senderAddress: string; // Substrate ss58 address on Polkadex
  /**
   * Override the POLKADEX-side decimals. Normally leave unset - the value is
   * read from `assets.metadata` on chain.
   *
   * This defaulted to 18, the ERC-20 value for WETH, while pallet_assets stores
   * bridged assets at 12dp. `parseUnits(amount, 18)` against a 12dp asset
   * overstates the amount by 10^6, so bridging 1 WETH out requested 1,000,000.
   * Passing the EVM decimals here is always wrong: this amount is consumed by a
   * Polkadex extrinsic, not an Ethereum one.
   */
  decimals?: number;
  assetId?: number; // Polkadex asset ID; defaults to WETH (3)
};

// TODO(hft-migration): Replace with new HFT pallet extrinsic once Polkadex team
// confirms the exact call name. Based on pallet-hyper-fungible-token, the call
// is api.tx.hyperFungibleToken.send(). Verify on-chain before going to mainnet.
export async function transferSubstrateToEvm(
  params: SubstrateToEvmParams
): Promise<string> {
  const {
    amount,
    recipient,
    senderAddress,
    // No numeric default: an unset value is resolved from chain metadata below.
    // A default here is what made a silent 10^6 error possible.
    decimals: decimalsOverride,
    assetId = WETH_ASSET_ID,
  } = params;

  if (!recipient.startsWith("0x")) {
    throw new Error("Recipient must be an EVM address starting with 0x");
  }

  // ── Step 1: Enable extensions ─────────────────────────────────────────────
  const extensions = await web3Enable("Polkadex Bridge");
  if (extensions.length === 0) {
    throw new Error(
      "No Polkadot extension found. Please install Polkadot.js, Talisman, or SubWallet."
    );
  }

  // ── Step 2: Get signer from extension ─────────────────────────────────────
  let injector: Awaited<ReturnType<typeof web3FromAddress>>;
  try {
    injector = await web3FromAddress(senderAddress);
  } catch {
    throw new Error(
      `Account "${senderAddress}" not found in any browser extension. ` +
        `Make sure it is imported in Polkadot.js / Talisman / SubWallet.`
    );
  }

  const signer = injector.signer;
  if (!signer?.signPayload) {
    throw new Error(
      "Extension signer does not support signPayload - please update your wallet extension."
    );
  }

  // ── Step 3: Connect to Polkadex node ──────────────────────────────────────
  const api = await getApi();

  // Guard: confirm the HFT pallet is deployed on this chain
  if (!api.tx.hyperFungibleToken?.send) {
    throw new Error(
      "hyperFungibleToken.send extrinsic not found on this Polkadex node. " +
        "The chain may not have deployed the HFT pallet yet."
    );
  }

  // ── Step 4: Build params ──────────────────────────────────────────────────
  // Decimals come from the chain, for the specific asset being sent. Config
  // cannot be trusted here: the nine testnet assets were normalised to 12dp by
  // forceSetMetadata while config still described their ERC-20 values, and this
  // amount is what the extrinsic actually moves.
  const decimals = decimalsOverride ?? (await getAssetDecimals(api, assetId));

  const amountBigInt = parseUnits(String(amount), decimals);

  // The IsmpHostStateMachine enum on Polkadex is SCALE-encoded as a tagged
  // variant, not a string. Polkadot.js rejects "EVM-11155111" - it needs the
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

  const txHash = await new Promise<string>((resolve, reject) => {
    api.tx.hyperFungibleToken
      .send(sendParams)
      .signAndSend(senderAddress, { signer }, ({ status, dispatchError }) => {
        if (dispatchError) {
          if (dispatchError.isModule) {
            const decoded = api.registry.findMetaError(dispatchError.asModule);
            reject(
              new Error(
                `${decoded.section}.${decoded.name}: ${decoded.docs.join(" ")}`
              )
            );
          } else {
            reject(new Error(dispatchError.toString()));
          }
          return;
        }

        if (status.isInBlock) {
          const txHash = status.asInBlock.toHex();
          console.log("Tx in block ✅ hash:", txHash);
          resolve(txHash);
        }

        if (status.isFinalized) {
          console.log("Tx finalized ✅ hash:", status.asFinalized.toHex());
        }
      })
      .catch(reject);
  });

  return txHash;
}
