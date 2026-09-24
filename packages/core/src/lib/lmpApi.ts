import { getGraphQLConfig } from "@orderbook/core/config/graphql";
import {
  isMockLmpEnabled,
  MOCK_EPOCHS,
  MOCK_EPOCH_DETAIL,
  MOCK_LEADERBOARD,
  MOCK_ACCOUNT_QSCORE_SNAPSHOT,
  MOCK_CLAIMABLE_REWARDS,
  MOCK_LMP_PAIRS,
  MOCK_DMM_ASSIGNMENTS,
} from "./mockLmpData";

// ─── Types ───────────────────────────────────────────────────────────────────

export type MarketTier = "Tier1" | "Tier2" | "Tier3";

export type Epoch = {
  id: number;
  status: "Ended" | "Ongoing" | "Upcoming";
  startBlock: number;
  endBlock: number;
  rewardPool: string; // raw PDEX amount as BigInt string
  endsAt: string; // ISO timestamp
};

export type EpochPair = {
  pair: string;
  tier: MarketTier;
  rewardPool: string;
  totalParticipants: number;
};

export type EpochDetail = Epoch & {
  pairs: EpochPair[];
};

export type LeaderboardEntry = {
  rank: number;
  address: string;
  qFinal: string;
  depthScore: string;
  uptimeScore: string;
  makerVolume: string;
  estimatedReward: string;
};

export type AccountQScoreSnapshot = {
  address: string;
  epoch: number;
  pair: string;
  depthScore: string;
  uptimeScore: string;
  makerVolumeScore: string;
  qFinal: string;
  rank: number;
  totalParticipants: number;
  estimatedReward: string;
  volatilityMultiplierActive: boolean;
};

export type ClaimableReward = {
  epoch: number;
  pair: string;
  amount: string; // raw PDEX BigInt string
  merkleProof: string[]; // array of 0x-prefixed hex strings
  merkleLeaf: string;
  claimed: boolean;
};

export type LMPPair = {
  id: string;
  tier: MarketTier;
  maxSpread: number; // basis points
  minDepth: string; // raw token amount
  dmmAssigned: boolean;
  volatilityActive: boolean;
};

export type PairCalibration = {
  pair: string;
  currentSpread: number;
  recommendedSpread: number;
  adfPValue: number;
  evidence: string;
};

export type DMMAssignment = {
  pair: string;
  account: string;
  committedSpread: number; // basis points
  committedDepth: string; // raw token amount
  committedUptime: number; // percentage 0–100
  liveUptime: number;
  stipend: string; // raw PDEX BigInt string
};

// ─── Client ──────────────────────────────────────────────────────────────────

function getLmpBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_LMP_API_URL) {
    return process.env.NEXT_PUBLIC_LMP_API_URL;
  }
  // Derive from the GraphQL URL by stripping the /graphql suffix
  const { httpEndpoint } = getGraphQLConfig();
  return httpEndpoint.replace(/\/graphql\/?$/, "");
}

async function lmpFetch<T>(path: string): Promise<T> {
  const base = getLmpBaseUrl();
  const token =
    process.env.NEXT_PUBLIC_READ_ONLY_TOKEN ||
    process.env.READ_ONLY_TOKEN ||
    "READ_ONLY";

  const res = await fetch(`${base}/lmp${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`LMP API error ${res.status} for /lmp${path}`);
  }

  return res.json() as Promise<T>;
}

// ─── API surface ─────────────────────────────────────────────────────────────

export const lmpApi = {
  fetchEpochs: (): Promise<{ epochs: Epoch[] }> =>
    isMockLmpEnabled()
      ? Promise.resolve({ epochs: MOCK_EPOCHS })
      : lmpFetch("/epochs"),

  fetchEpoch: (_epoch: number): Promise<EpochDetail> =>
    isMockLmpEnabled()
      ? Promise.resolve(MOCK_EPOCH_DETAIL)
      : lmpFetch(`/epochs/${_epoch}`),

  fetchLeaderboard: (
    epoch: number,
    pair?: string
  ): Promise<{ entries: LeaderboardEntry[]; totalParticipants: number }> =>
    isMockLmpEnabled()
      ? Promise.resolve({ entries: MOCK_LEADERBOARD, totalParticipants: 203 })
      : lmpFetch(`/epochs/${epoch}/leaderboard${pair ? `?pair=${pair}` : ""}`),

  fetchAccountQScore: (address: string): Promise<AccountQScoreSnapshot> =>
    isMockLmpEnabled()
      ? Promise.resolve({ ...MOCK_ACCOUNT_QSCORE_SNAPSHOT, address })
      : lmpFetch(`/accounts/${encodeURIComponent(address)}/qscore`),

  fetchClaimableRewards: (
    _address: string
  ): Promise<{ claimable: ClaimableReward[] }> =>
    isMockLmpEnabled()
      ? Promise.resolve({ claimable: MOCK_CLAIMABLE_REWARDS })
      : lmpFetch(`/accounts/${encodeURIComponent(_address)}/rewards/claimable`),

  fetchPairs: (): Promise<{ pairs: LMPPair[] }> =>
    isMockLmpEnabled()
      ? Promise.resolve({ pairs: MOCK_LMP_PAIRS })
      : lmpFetch("/pairs"),

  fetchPairCalibration: (pair: string): Promise<PairCalibration> =>
    isMockLmpEnabled()
      ? Promise.resolve({ pair, currentSpread: 15, recommendedSpread: 12, adfPValue: 0.03, evidence: "Mock calibration data" })
      : lmpFetch(`/pairs/${encodeURIComponent(pair)}/calibration`),

  fetchActiveDMMs: (): Promise<{ assignments: DMMAssignment[] }> =>
    isMockLmpEnabled()
      ? Promise.resolve({ assignments: MOCK_DMM_ASSIGNMENTS })
      : lmpFetch("/dmm"),
};
