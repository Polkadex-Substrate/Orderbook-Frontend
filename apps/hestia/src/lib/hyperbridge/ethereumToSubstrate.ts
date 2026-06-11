import {
  IsmpClient,
  EvmChain,
  SubstrateChain,
  createQueryClient,
  postRequestCommitment,
  WrappedHyperFungibleTokenABI,
} from "@hyperbridge/sdk";
import type { HexString } from "@polkadot/util/types";
import { u8aToHex } from "@polkadot/util";
import Keyring, { decodeAddress } from "@polkadot/keyring";
import { sepolia } from "viem/chains";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  parseEventLogs,
  parseUnits,
  toHex,
  custom,
  maxUint256,
  type Address,
  type EIP1193Provider,
} from "viem";

import HOST_MODULE from "./abis/ethSepoliaHostModule";
import FEE_TOKEN_MODULE from "./abis/ethSepoliaFeeTokenModule";

import { BRIDGE_CHAINS, BRIDGE_TOKENS, BRIDGE_ROUTES } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

const _evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const _substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _wethToken = BRIDGE_TOKENS.weth;
const _route = BRIDGE_ROUTES[0];

const wethHftAddress = (_wethToken.chains.sepolia?.hftAddress ?? "") as Address;
const sepoliaRpcURL = _evmChain.rpcUrl;
const indexerUrl = _route.indexerUrl;
const destinationRpcUrl = _substrateChain.wsUrl;

export const Source = {
  name: _evmChain.name,
  chainId: _evmChain.chainId,
  stateMachineId: _evmChain.stateMachineId,
  networkType: "testnet",
  rpcUrls: [sepoliaRpcURL],
  consensus: { layer: "Ethereum Sepolia", stateId: _evmChain.consensusStateId },
  ismpHost: _evmChain.ismpHost,
} as const;

export const Destination = {
  group: "substrate",
  name: _substrateChain.name,
  networkType: "testnet",
  chainId: _substrateChain.stateMachineId,
  consensus: { layer: "Polkadex", stateId: _substrateChain.consensusStateId },
  rpcUrls: [destinationRpcUrl],
  estimatedTransferTime: "10-15 minutes",
};

export const Token = {
  name: _wethToken.name,
  symbol: _wethToken.ticker,
  address: _wethToken.chains.sepolia?.address as `0x${string}`,
  decimals: _wethToken.decimals,
};

const singleton = <T>(fn: () => T) => {
  const EMPTY = "$EMPTY$";
  let output: T | typeof EMPTY = EMPTY;
  return (): T => {
    if (output !== EMPTY) return output;
    output = fn();
    return output;
  };
};

export const getIndexer = singleton(() => {
  const query_client = createQueryClient({ url: indexerUrl });

  const sourceChain = EvmChain.fromParams({
    chainId: _evmChain.chainId,
    rpcUrl: Source.rpcUrls[0],
    host: Source.ismpHost,
    consensusStateId: Source.consensus.stateId,
  });

  return Promise.all([
    SubstrateChain.connect({
      wsUrl: Destination.rpcUrls[0],
      consensusStateId: Destination.consensus.stateId,
      hasher: _substrateChain.hasher,
      stateMachineId: Destination.chainId,
    }),
    SubstrateChain.connect({
      wsUrl: indexerUrl.replace("https://", "wss://"),
      consensusStateId: "PAS0",
      hasher: "Blake2",
      stateMachineId: "KUSAMA-4009",
    }),
  ]).then(
    ([destChain, hyperbridgeChain]) =>
      new IsmpClient({
        source: sourceChain,
        dest: destChain,
        hyperbridge: hyperbridgeChain,
        queryClient: query_client,
        pollInterval: 1000,
      }),
  );
});

async function createHelpers() {
  const ethereum = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
  if (typeof window === "undefined" || !ethereum) {
    throw new Error("No Ethereum wallet found.");
  }

  const accounts = (await ethereum.request({
    method: "eth_requestAccounts",
  })) as string[];
  const address = accounts[0] as `0x${string}`;

  const walletClient = createWalletClient({
    account: address,
    chain: sepolia,
    transport: custom(ethereum),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpcURL),
  });

  const wrappedHft = getContract({
    abi: WrappedHyperFungibleTokenABI,
    address: wethHftAddress,
    client: { public: publicClient, wallet: walletClient },
  });

  return { publicClient, walletClient, wrappedHft, address };
}

export function encodePolkaAddress(polkaAddress?: string): string {
  const keyring = new Keyring();
  return polkaAddress ? keyring.encodeAddress(polkaAddress, 0) : "";
}

export type BridgeTransferParams = {
  amount: number;
  recipient: string;
};

type THelper = Awaited<ReturnType<typeof createHelpers>>;

async function getCommitment(helper: THelper, tx_hash: HexString) {
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const receipt = await helper.publicClient.waitForTransactionReceipt({
    hash: tx_hash,
    confirmations: 1,
  });

  const event = parseEventLogs({
    abi: HOST_MODULE.ABI,
    logs: receipt.logs,
  })[0];

  if (event.eventName !== "PostRequestEvent") {
    throw new Error("Unexpected Event type");
  }

  const request = event.args;
  const commitment = postRequestCommitment(request).commitment;

  return { ...request, commitment };
}

export async function transferTokens(params: BridgeTransferParams) {
  if (!wethHftAddress) {
    throw new Error(
      "NEXT_PUBLIC_BRIDGE_WETH_HFT_ADDRESS is not set. " +
        "Obtain the WrappedHFT contract address from the Hyperbridge team.",
    );
  }

  const { address, publicClient, walletClient, wrappedHft } =
    await createHelpers();

  const to: HexString = u8aToHex(decodeAddress(params.recipient, false));
  const amountWei = parseUnits(String(params.amount), Token.decimals);
  const destBytes = toHex(Destination.chainId);

  // ── Step 1: Check if contract uses native ETH (isWeth mode) ──────────────
  // When isWeth=true the contract wraps native ETH itself — no ERC20 approval.
  // When isWeth=false the underlying ERC20 must be approved to the HFT contract.
  const isWeth = (await publicClient.readContract({
    address: wethHftAddress,
    abi: WrappedHyperFungibleTokenABI,
    functionName: "isWeth",
  })) as boolean;

  if (!isWeth) {
    console.log("Checking WETH allowance...");
    const wethAllowance = await publicClient.readContract({
      address: Token.address,
      abi: FEE_TOKEN_MODULE.ABI,
      functionName: "allowance",
      args: [address, wethHftAddress],
    });

    if ((wethAllowance as bigint) < amountWei) {
      console.log("Approving WETH to WrappedHFT (maxUint256)...");
      const approveTxHash = await walletClient.writeContract({
        address: Token.address,
        abi: FEE_TOKEN_MODULE.ABI,
        functionName: "approve",
        args: [wethHftAddress, maxUint256],
        account: address,
      });
      console.log("WETH approval tx:", approveTxHash);
      await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
      console.log("WETH approval confirmed ✅");
    } else {
      console.log("WETH allowance sufficient ✅");
    }
  } else {
    console.log(
      "isWeth=true — no ERC20 approval needed, sending native ETH ✅",
    );
  }

  // ── Step 2: Build send params ─────────────────────────────────────────────
  // relayerFee must be 0 for the isWeth=true path. When relayerFee > 0 the
  // contract tries to pull that amount in WETH9 ERC20 (the underlying) from
  // the caller, which fails unless the user has pre-approved the underlying.
  // The ISMP dispatch fee is covered by msg.value on this testnet (fee = 0).
  const sendParams = {
    dest: destBytes,
    to,
    amount: amountWei,
    timeout: BigInt(3600),
    relayerFee: 0n,
    data: "0x" as `0x${string}`,
  } as const;

  // quote() may revert if the destination chain isn't configured yet in the
  // HFT contract. Treat that as 0 native fee (same behaviour as the SDK).
  let nativeValue = 0n;
  try {
    console.log("Quoting native cost...");
    nativeValue = (await publicClient.readContract({
      address: wethHftAddress,
      abi: WrappedHyperFungibleTokenABI,
      functionName: "quote",
      args: [sendParams],
    })) as bigint;
    console.log("Native cost (wei):", nativeValue.toString());
  } catch (e) {
    console.warn(
      "quote() reverted — destination may not be configured yet. Proceeding with 0 native fee.",
      e,
    );
  }

  // When isWeth=true, msg.value must cover both the bridge amount and the fee
  // because the contract wraps native ETH internally (no separate ERC20 lock).
  const txValue = isWeth ? amountWei + nativeValue : nativeValue;

  // ── Step 3: Send ──────────────────────────────────────────────────────────
  console.log("Submitting WrappedHFT.send()...");
  const hash = await wrappedHft.write.send([sendParams], {
    value: txValue,
    account: address,
  });

  console.log("Bridge tx submitted ✅ hash:", hash);

  const postRequest = await getCommitment(
    { publicClient, walletClient, wrappedHft, address },
    hash,
  );
  console.log("✅ Post Request Commitment:", postRequest.commitment);

  return hash;
}
