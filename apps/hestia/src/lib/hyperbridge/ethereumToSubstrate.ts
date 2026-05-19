import {
  IndexerClient,
  createQueryClient,
  postRequestCommitment,
  RequestStatus,
} from "@hyperbridge/sdk";
import type { HexString } from "@polkadot/util/types";
import { hexToU8a, u8aToHex } from "@polkadot/util";
import Keyring, { decodeAddress } from "@polkadot/keyring";
import { sepolia } from "viem/chains";
import {
  createPublicClient,
  createWalletClient,
  getContract,
  http,
  keccak256,
  parseEventLogs,
  parseUnits,
  toHex,
  custom,
  maxUint256
} from "viem";
import HOST_MODULE from "./abis/ethSepoliaHostModule.ts";
import PING_MODULE from "./abis/ethSepoliaPingModule.ts";
import HANDLER_MODULE from "./abis/ethSepoliaHandlerModule.ts";
import FEE_TOKEN_MODULE from "./abis/ethSepoliaFeeTokenModule.ts";
import TOKEN_GATEWAY_MODULE from "./abis/ethSepoliaTokenGatewayModule.ts";
import { privateKeyToAccount } from "viem/accounts";
import {Wallet} from 'ethers';

import { BRIDGE_CHAINS, BRIDGE_TOKENS, BRIDGE_ROUTES } from "@/config/bridge";
import type { EvmChainConfig, SubstrateChainConfig } from "@/config/bridge";

const _evmChain = BRIDGE_CHAINS.sepolia as EvmChainConfig;
const _substrateChain = BRIDGE_CHAINS.polkadex as SubstrateChainConfig;
const _wethToken = BRIDGE_TOKENS.weth;
const _route = BRIDGE_ROUTES[0];

const tokenGatewayAddress = _evmChain.tokenGatewayAddress as HexString;
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

  return new IndexerClient({
    source: {
      consensusStateId: Source.consensus.stateId,
      rpcUrl: Source.rpcUrls[0],
      stateMachineId: Source.stateMachineId,
      host: Source.ismpHost,
    },
    dest: {
      hasher: "Blake2",
      wsUrl: Destination.rpcUrls[0],
      consensusStateId: Destination.consensus.stateId,
      stateMachineId: Destination.chainId,
    },
    hyperbridge: {
      consensusStateId: "PAS0",
      stateMachineId: "KUSAMA-4009",
      wsUrl: indexerUrl.replace("https://", "wss://"),
    },
    queryClient: query_client,
    pollInterval: 1000,
  });
});

// ── Browser-compatible createHelpers ─────────────────────────────────────────
// Mirrors the working script's createHelpers exactly, but uses window.ethereum
// instead of a private key so it works with MetaMask / Enkrypt / WalletConnect
async function createHelpers() {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("No Ethereum wallet found.");
  }

  // Request accounts — this is what the working script does via privateKeyToAccount
  const accounts: string[] = await window.ethereum.request({
    method: "eth_requestAccounts",
  });
  const address = accounts[0] as `0x${string}`;

  const walletClient = createWalletClient({
    account: address,          // viem accepts raw address for json-rpc accounts
    chain: sepolia,
    transport: custom(window.ethereum),
  });

  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(sepoliaRpcURL),
  });

  const sharedClient = { public: publicClient, wallet: walletClient };

  // ── Mirror the working script: read host → hostParams → feeToken ──────────
  const host = getContract({
    address: Source.ismpHost as `0x${string}`,
    abi: HOST_MODULE.ABI,
    client: publicClient,
  });

  const hostParams = await host.read.hostParams();

  const feeToken = getContract({
    address: hostParams.feeToken,
    abi: FEE_TOKEN_MODULE.ABI,
    client: sharedClient as any,
  });

  const tokenGateway = getContract({
    abi: TOKEN_GATEWAY_MODULE.ABI,
    address: tokenGatewayAddress,
    client: sharedClient as any,
  });

  return {
    chain: sepolia,
    publicClient,
    walletClient,
    tokenGateway,
    feeToken,
    hostParams,
    address,            // the connected wallet address, clean `0x${string}`
  };
}

export const readAssetId = (token_symbol: string) => {
  const encoder = new TextEncoder();
  return keccak256(encoder.encode(token_symbol));
};

export function encodePolkaAddress(polkaAddress?: string): string {
  const keyring = new Keyring();
  return polkaAddress ? keyring.encodeAddress(polkaAddress, 0) : "";
}

export type BridgeTransferParams = {
  amount: number;
  recipient: string; // Polkadot destination address
};

type THelper = Awaited<ReturnType<typeof createHelpers>>;

async function getCommitment(helper: THelper, tx_hash: HexString) {
  // wait for tx receipt to become available
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const receipt = await helper.publicClient.waitForTransactionReceipt({
    hash: tx_hash,
    confirmations: 1,
  });

  console.log(
    `Transaction reciept: ${helper.chain.blockExplorers?.default?.url}/tx/${tx_hash}`
  );
  console.log("Block: ", receipt.blockNumber);

  // parse EvmHost PostRequestEvent emitted in the transcation logs
  const event = parseEventLogs({ abi: HOST_MODULE.ABI, logs: receipt.logs })[0];

  if (event.eventName !== "PostRequestEvent") {
    throw new Error("Unexpected Event type");
  }

  const request = event.args;

  console.log("PostRequestEvent", { request });

  const commitment = postRequestCommitment(request).commitment;

  return { ...request, commitment };
}

function getSubstrateAccount(mnemonic: string) {
  const keyring = new Keyring({ type: "sr25519" });
  const account = keyring.addFromUri(mnemonic as string);

  return account;
}

export async function transferTokens(params: BridgeTransferParams) {
  // const helper = await createHelpers();

  const mnemonic = "poem coconut answer someone napkin elegant boss resource finger smoke wink ice";
  const wallet = Wallet.fromPhrase(mnemonic);
  console.log(wallet.privateKey);

  const sender_account = wallet.privateKey as HexString;

  const helper = await createHelpers({
    account: sender_account,
    chain: sepolia,
    rpc_url: sepoliaRpcURL,
  });

  const { address, publicClient, walletClient, tokenGateway, feeToken, hostParams } = helper;

  const to: HexString = u8aToHex(decodeAddress(params.recipient, false));
  const assetId = readAssetId(Token.symbol);
  if (!assetId) throw new Error(`Invalid assetId for token ${Token.name}`);

  const amountWei = parseUnits(String(params.amount), Token.decimals);

  // ── Step 1: Approve WETH to TokenGateway ─────────────────────────────────
  console.log("Checking WETH allowance...");
  const wethAllowance = await publicClient.readContract({
    address: Token.address,
    abi: FEE_TOKEN_MODULE.ABI,
    functionName: "allowance",
    args: [address, tokenGatewayAddress as `0x${string}`],
  });
  console.log("Current WETH allowance:", (wethAllowance as bigint).toString());

  if ((wethAllowance as bigint) < amountWei) {
    console.log("Approving WETH (maxUint256)...");
    const approveTxHash = await walletClient.writeContract({
      address: Token.address,
      abi: FEE_TOKEN_MODULE.ABI,
      functionName: "approve",
      // 👇 approve max instead of exact amount — contract may need amount + internal fees
      args: [tokenGatewayAddress as `0x${string}`, maxUint256],
      account: address,
    });
    console.log("WETH approval tx:", approveTxHash);
    await publicClient.waitForTransactionReceipt({ hash: approveTxHash });
    console.log("WETH approval confirmed ✅");
  } else {
    console.log("WETH allowance sufficient ✅");
  }

  // ── Step 2: Approve feeToken to TokenGateway ─────────────────────────────
  // The host's feeToken is used by the protocol to pay relayer/ISMP fees.
  // Even with relayerFee=0, the contract checks allowance during execution.
  console.log("Fee token address:", hostParams.feeToken);
  console.log("Checking feeToken allowance...");

  const feeTokenAllowance = await publicClient.readContract({
    address: hostParams.feeToken,
    abi: FEE_TOKEN_MODULE.ABI,
    functionName: "allowance",
    args: [address, tokenGatewayAddress as `0x${string}`],
  });
  console.log("Current feeToken allowance:", (feeTokenAllowance as bigint).toString());

  if ((feeTokenAllowance as bigint) === 0n) {
    console.log("Approving feeToken (maxUint256)...");
    const feeApproveTxHash = await walletClient.writeContract({
      address: hostParams.feeToken,
      abi: FEE_TOKEN_MODULE.ABI,
      functionName: "approve",
      args: [tokenGatewayAddress as `0x${string}`, maxUint256],
      account: address,
    });
    console.log("feeToken approval tx:", feeApproveTxHash);
    await publicClient.waitForTransactionReceipt({ hash: feeApproveTxHash });
    console.log("feeToken approval confirmed ✅");
  } else {
    console.log("feeToken allowance sufficient ✅");
  }

  // ── Step 3: Teleport ──────────────────────────────────────────────────────
  const nativeCost = 0n;

  function calculateRelayerFee(amount: number) {
    const fee = amount * 0.0012;
    return fee.toFixed(18);
  }

  const relayerFeeEth = calculateRelayerFee(params.amount);
  const relayerFee = parseUnits(relayerFeeEth, 18);

  console.log("Relayer fee (ETH string):", relayerFeeEth);
  console.log("Relayer fee (wei BigInt):", relayerFee.toString());

  const transfer_params = {
    amount: amountWei,
    assetId,
    data: "0x",
    dest: toHex(Destination.chainId),
    nativeCost,
    redeem: false,
    relayerFee,
    timeout: BigInt(3600),
    to,
  } as const;

  console.log("Submitting teleport with params:", {
    amount: amountWei.toString(),
    dest: toHex(Destination.chainId),
    to,
    assetId,
  });

  const hash = await tokenGateway.write.teleport([transfer_params], {
    value: nativeCost,
    account: address,
  });

  console.log("Bridge tx submitted ✅ hash:", hash);

  // Ethereum private key
  // const sender_account = privateKeyToAccount(
  //   "0x0f8f58487987ec103948ade602d72fd9bea0ee29c8933f0b30809931943094df" as HexString
  // );

  // Substrate mnemonic
  const recipient_account = getSubstrateAccount(
    "genre van run town boy giraffe paddle obvious dragon play elder vivid"
  );

  // make transfer
  const tx_hash = '0x816c384765a27295af488248d1383b951e70f2ea29a202469490921231c065ee 0x5efe2fa827fad6de341d7d5ed236f6e0398f6a97aa85aa80c279203c09c25023 0x3f5e719d8e5406c654b811b2199b6b68f857e1a98896e1faa348bc481ef154bd';

  const postRequest = await getCommitment(helper, hash);
  const commitment = postRequest.commitment;

  console.log("✅ Post Request Commitment:", commitment);

  return hash;
}