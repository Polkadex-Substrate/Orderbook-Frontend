import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { teleport } from "@hyperbridge/sdk";
import { hexToBytes, parseUnits } from "viem";
import type { HexString } from "@polkadot/util/types";
import { BRIDGE_CHAINS, BRIDGE_ROUTES } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

const _substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const _route = BRIDGE_ROUTES[0];

const POLKADEX_WS_URL = _substrateChain.wsUrl;
const TOKEN_GATEWAY_ADDRESS = _evmChain.tokenGatewayAddress as HexString;
const SEPOLIA_STATE_MACHINE = _evmChain.stateMachineId;

// Singleton API instance — reuse across calls to avoid reconnecting
let apiInstance: ApiPromise | null = null;

async function getApi(): Promise<ApiPromise> {
  if (apiInstance && apiInstance.isConnected) return apiInstance;
  console.log("Connecting to Polkadex node...");
  const provider = new WsProvider(POLKADEX_WS_URL);
  apiInstance = await ApiPromise.create({ provider });
  console.log("Connected to Polkadex ✅");
  return apiInstance;
}

export type SubstrateToEvmParams = {
  amount: number;
  recipient: string;    // EVM 0x address on Sepolia
  senderAddress: string; // Substrate address on Polkadex
  symbol?: string;
  decimals?: number;
};

export async function transferSubstrateToEvm(params: SubstrateToEvmParams) {
  const {
    amount,
    recipient,
    senderAddress,
    symbol = "WETH",
    decimals = 18,
  } = params;

  if (!recipient.startsWith("0x")) {
    throw new Error("Recipient must be an EVM address starting with 0x");
  }

  // ── Step 1: Enable extensions FIRST — required before web3FromAddress ────
  // Without this call, web3FromAddress returns nothing and silently fails
  const extensions = await web3Enable("Polkadex Bridge");
  if (extensions.length === 0) {
    throw new Error(
      "No Polkadot extension found. Please install Polkadot.js, Talisman, or SubWallet."
    );
  }

  // ── Step 2: Get signer from extension ─────────────────────────────────────
  let injector;
  try {
    injector = await web3FromAddress(senderAddress);
  } catch (e) {
    throw new Error(
      `Account "${senderAddress}" not found in any browser extension. ` +
      `Make sure it is imported in Polkadot.js / Talisman / SubWallet.`
    );
  }

  const signer = injector.signer;
  if (!signer?.signRaw) {
    throw new Error(
      "Extension signer does not support signRaw — please update your wallet extension."
    );
  }

  // ── Step 3: Connect to Polkadex node ──────────────────────────────────────
  const api = await getApi();

  // ── Step 4: Build params ──────────────────────────────────────────────────
  const amountBigInt = parseUnits(String(amount), decimals);

  function calculateRelayerFee(amount: number) {
    const fee = amount * 0.0012;
    return fee.toFixed(18);
  }

  const relayerFeeEth = calculateRelayerFee(params.amount);
  const relayerFee = parseUnits(relayerFeeEth, 18);

  console.log("Relayer fee (ETH string):", relayerFeeEth);
  console.log("Relayer fee (wei BigInt):", relayerFee.toString());

  const teleportParams = {
    symbol,
    destination: SEPOLIA_STATE_MACHINE,
    recipient: recipient as HexString,
    amount: amountBigInt,
    timeout: BigInt(3600),
    tokenGatewayAddress: hexToBytes(TOKEN_GATEWAY_ADDRESS as `0x${string}`),
    relayerFee,
    redeem: false,
  };

  console.log("Starting substrate → EVM teleport...", {
    from: senderAddress,
    to: recipient,
    amount: amountBigInt.toString(),
    symbol,
  });

  // ── Step 5: Stream events ─────────────────────────────────────────────────
  const stream = await teleport({
    apiPromise: api,
    who: senderAddress,
    params: teleportParams,
    options: { signer },
  });

  let txHash: string | null = null;

  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value: event } = await reader.read();
      if (done) break;

      console.log("Teleport event:", event.kind);

      if (event.kind === "Dispatched") {
        txHash = event.transaction_hash ?? null;
        console.log("Tx dispatched ✅ hash:", txHash);
        break;
      }

      if (event.kind === "Finalized") {
        console.log("Tx finalized ✅ hash:", event.transaction_hash);
        break;
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!txHash) throw new Error("Teleport dispatched but no transaction hash returned");
  return txHash;
}