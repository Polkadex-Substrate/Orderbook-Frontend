import {
  IsmpClient,
  EvmChain,
  SubstrateChain,
  createQueryClient,
} from "@hyperbridge/sdk";
import type { HexString } from "@polkadot/util/types";
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  type EIP1193Provider,
} from "viem";
import { sepolia } from "viem/chains";

import HOST_MODULE from "./abis/ethSepoliaHostModule";
import { BRIDGE_CHAINS, BRIDGE_ROUTES } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

const _evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const _substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _route = BRIDGE_ROUTES[0];

const HYPERBRIDGE_NODE_WS =
  process.env.NEXT_PUBLIC_HYPERBRIDGE_NODE_WS ?? "wss://gargantua.polytope.technology";

/**
 * Submits the Hyperbridge timeout proof for a timed-out cross-chain request.
 *
 * Steps:
 *  1. Read hostParams.handler from the ISMP host — this is the contract that
 *     processes timeout proofs, not the host itself.
 *  2. Build an IsmpClient with WS connections to Sepolia, Polkadex, and the
 *     Hyperbridge node so it can generate the timeout calldata on-chain.
 *  3. Stream postRequestTimeoutStream until HYPERBRIDGE_FINALIZED_TIMEOUT,
 *     which carries the generated calldata.
 *  4. Submit the calldata to hostParams.handler via the user's wallet.
 */
export async function claimRefund(commitment: string): Promise<string> {
  const ethereum = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (typeof window === "undefined" || !ethereum) {
    throw new Error("No Ethereum wallet found. Please install MetaMask or another EVM wallet.");
  }

  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts[0] as `0x${string}`;

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(_evmChain.rpcUrl),
  });

  const walletClient = createWalletClient({
    account: address,
    chain: sepolia,
    transport: custom(ethereum),
  });

  // hostParams.handler is the ISMP message handler contract — the correct target
  // for submitting timeout proof calldata (not the ismpHost address itself).
  const hostParams = (await publicClient.readContract({
    address: _evmChain.ismpHost,
    abi: HOST_MODULE.ABI,
    functionName: "hostParams",
  })) as { handler: `0x${string}` };

  // Build IsmpClient with full WS chain connections so the SDK can query
  // on-chain state needed to generate the timeout proof calldata.
  const sourceChain = EvmChain.fromParams({
    chainId: _evmChain.chainId,
    rpcUrl: _evmChain.rpcUrl,
    host: _evmChain.ismpHost,
    consensusStateId: _evmChain.consensusStateId,
  });

  const [destChain, hyperbridgeChain] = await Promise.all([
    SubstrateChain.connect({
      wsUrl: _substrateChain.wsUrl,
      consensusStateId: _substrateChain.consensusStateId,
      hasher: _substrateChain.hasher,
      stateMachineId: _substrateChain.stateMachineId,
    }),
    SubstrateChain.connect({
      wsUrl: HYPERBRIDGE_NODE_WS,
      consensusStateId: "PAS0",
      hasher: "Blake2",
      stateMachineId: "KUSAMA-4009",
    }),
  ]);

  const queryClient = createQueryClient({ url: _route.indexerUrl });

  const client = new IsmpClient({
    source: sourceChain,
    dest: destChain,
    hyperbridge: hyperbridgeChain,
    queryClient,
    pollInterval: 1000,
  });

  console.log(`[ClaimRefund] 🔄 Streaming timeout stages for ${commitment.slice(0, 10)}…`);

  let calldata: `0x${string}` | undefined;
  for await (const update of client.postRequestTimeoutStream(commitment as HexString)) {
    console.log(`[ClaimRefund] 📡 Timeout stage: ${update.status}`);
    if (update.status === "HYPERBRIDGE_FINALIZED_TIMEOUT") {
      calldata = update.metadata.calldata as `0x${string}`;
      break;
    }
  }

  if (!calldata) {
    throw new Error("Timeout proof calldata not available — the request may not be in a timeout state yet.");
  }

  const hash = await walletClient.sendTransaction({
    to: hostParams.handler,
    data: calldata,
    account: address,
  });

  console.log("✅ Refund tx submitted:", hash);
  return hash;
}
