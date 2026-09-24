import type {
  Epoch,
  EpochDetail,
  LeaderboardEntry,
  AccountQScoreSnapshot,
  ClaimableReward,
  LMPPair,
  DMMAssignment,
} from "./lmpApi";
import type { LMPSnapshot } from "../hooks/lmp/useLMPLive";
import type { AccountQScore } from "../hooks/lmp/useAccountQScore";

export const MOCK_EPOCHS: Epoch[] = [
  {
    id: 40,
    status: "Ended",
    startBlock: 6652800,
    endBlock: 6854400,
    rewardPool: "50000000000000000",
    endsAt: "2026-04-04T00:00:00Z",
  },
  {
    id: 41,
    status: "Ended",
    startBlock: 6854400,
    endBlock: 7056000,
    rewardPool: "50000000000000000",
    endsAt: "2026-05-02T00:00:00Z",
  },
  {
    id: 42,
    status: "Ongoing",
    startBlock: 7056000,
    endBlock: 7257600,
    rewardPool: "75000000000000000",
    endsAt: new Date(Date.now() + 14 * 60 * 60 * 1000 + 23 * 60 * 1000).toISOString(),
  },
  {
    id: 43,
    status: "Upcoming",
    startBlock: 7257600,
    endBlock: 7459200,
    rewardPool: "75000000000000000",
    endsAt: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

export const MOCK_EPOCH_DETAIL: EpochDetail = {
  ...MOCK_EPOCHS[2],
  pairs: [
    { pair: "PDEX-WETH", tier: "Tier1", rewardPool: "40000000000000000", totalParticipants: 203 },
    { pair: "PDEX-USDT", tier: "Tier2", rewardPool: "25000000000000000", totalParticipants: 87 },
    { pair: "PDEX-DOT",  tier: "Tier3", rewardPool: "10000000000000000", totalParticipants: 44 },
  ],
};

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1,  address: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY", qFinal: "0.9821", depthScore: "0.95", uptimeScore: "0.99", makerVolume: "0.97", estimatedReward: "8200000000000000" },
  { rank: 2,  address: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty", qFinal: "0.9412", depthScore: "0.91", uptimeScore: "0.97", makerVolume: "0.94", estimatedReward: "7850000000000000" },
  { rank: 3,  address: "5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y", qFinal: "0.8934", depthScore: "0.88", uptimeScore: "0.95", makerVolume: "0.90", estimatedReward: "6920000000000000" },
  { rank: 4,  address: "5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy",  qFinal: "0.8651", depthScore: "0.85", uptimeScore: "0.92", makerVolume: "0.87", estimatedReward: "6200000000000000" },
  { rank: 5,  address: "5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZ5GPjGNRdnW", qFinal: "0.8203", depthScore: "0.80", uptimeScore: "0.90", makerVolume: "0.84", estimatedReward: "5780000000000000" },
  { rank: 6,  address: "5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL", qFinal: "0.7894", depthScore: "0.77", uptimeScore: "0.88", makerVolume: "0.81", estimatedReward: "5210000000000000" },
  { rank: 7,  address: "5GNJqTPyNqANBkUVMN1LPPrxXnFouWXoe2wNSmmEoLctxiZY", qFinal: "0.7512", depthScore: "0.74", uptimeScore: "0.85", makerVolume: "0.77", estimatedReward: "4800000000000000" },
  { rank: 8,  address: "5HpG9w8EBLe5XCrbczpwq5TSXvedjrBGCwqxK1iQ7qjrSRgm", qFinal: "0.7231", depthScore: "0.70", uptimeScore: "0.83", makerVolume: "0.74", estimatedReward: "4350000000000000" },
  { rank: 9,  address: "5Ck5SLSHYac6WFt5UZRSsdJjwmpSZq85fd5TRNAdZQVzEAPT", qFinal: "0.6942", depthScore: "0.68", uptimeScore: "0.80", makerVolume: "0.70", estimatedReward: "3920000000000000" },
  { rank: 10, address: "5DTestUserAddressForMockDataPurposesOnly1234567890", qFinal: "0.6540", depthScore: "0.64", uptimeScore: "0.76", makerVolume: "0.66", estimatedReward: "3500000000000000" },
];

export const MOCK_ACCOUNT_QSCORE_SNAPSHOT: AccountQScoreSnapshot = {
  address: "5DTestUserAddressForMockDataPurposesOnly1234567890",
  epoch: 42,
  pair: "PDEX-WETH",
  depthScore: "0.64",
  uptimeScore: "0.76",
  makerVolumeScore: "0.66",
  qFinal: "0.654",
  rank: 10,
  totalParticipants: 203,
  estimatedReward: "3500000000000000",
  volatilityMultiplierActive: true,
};

export const MOCK_CLAIMABLE_REWARDS: ClaimableReward[] = [
  {
    epoch: 40,
    pair: "PDEX-WETH",
    amount: "5200000000000000",
    merkleProof: [
      "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    ],
    merkleLeaf: "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef",
    claimed: true,
  },
  {
    epoch: 41,
    pair: "PDEX-WETH",
    amount: "4800000000000000",
    merkleProof: [
      "0xfeedface00000000feedface00000000feedface00000000feedface00000000",
      "0x00000000cafebabe00000000cafebabe00000000cafebabe00000000cafebabe",
    ],
    merkleLeaf: "0xbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00dbaadf00d",
    claimed: false,
  },
  {
    epoch: 41,
    pair: "PDEX-USDT",
    amount: "1200000000000000",
    merkleProof: [
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    ],
    merkleLeaf: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    claimed: false,
  },
];

export const MOCK_LMP_PAIRS: LMPPair[] = [
  { id: "PDEX-WETH", tier: "Tier1", maxSpread: 15,  minDepth: "500000000000000",   dmmAssigned: true,  volatilityActive: true  },
  { id: "PDEX-USDT", tier: "Tier1", maxSpread: 10,  minDepth: "1000000000000000",  dmmAssigned: true,  volatilityActive: false },
  { id: "PDEX-DOT",  tier: "Tier2", maxSpread: 30,  minDepth: "200000000000000",   dmmAssigned: false, volatilityActive: false },
  { id: "PDEX-BTC",  tier: "Tier2", maxSpread: 25,  minDepth: "100000000000000",   dmmAssigned: false, volatilityActive: true  },
  { id: "PDEX-GLMR", tier: "Tier3", maxSpread: 50,  minDepth: "50000000000000",    dmmAssigned: false, volatilityActive: false },
  { id: "PDEX-ACA",  tier: "Tier3", maxSpread: 50,  minDepth: "50000000000000",    dmmAssigned: false, volatilityActive: false },
];

export const MOCK_DMM_ASSIGNMENTS: DMMAssignment[] = [
  {
    pair: "PDEX-WETH",
    account: "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY",
    committedSpread: 10,
    committedDepth: "5000000000000000",
    committedUptime: 95,
    liveUptime: 97,
    stipend: "2000000000000000",
  },
  {
    pair: "PDEX-USDT",
    account: "5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty",
    committedSpread: 8,
    committedDepth: "8000000000000000",
    committedUptime: 90,
    liveUptime: 84,
    stipend: "1500000000000000",
  },
];

export const MOCK_LMP_SNAPSHOT: LMPSnapshot = {
  snapshotId: 71234,
  pair: "PDEX-WETH",
  epoch: 42,
  topAccounts: MOCK_LEADERBOARD.slice(0, 5).map((e) => ({
    address: e.address,
    depthScore: e.depthScore,
    uptimeScore: e.uptimeScore,
    makerVolume: e.makerVolume,
    qFinal: e.qFinal,
  })),
  volatilityActive: true,
  timestamp: new Date().toISOString(),
};

export const MOCK_ACCOUNT_QSCORE: AccountQScore = {
  address: "5DTestUserAddressForMockDataPurposesOnly1234567890",
  epoch: 42,
  pair: "PDEX-WETH",
  depthScore: "0.64",
  uptimeScore: "0.76",
  makerVolumeScore: "0.66",
  qFinal: "0.654",
  rank: 10,
  totalParticipants: 203,
  estimatedReward: "3500000000000000",
  volatilityMultiplierActive: true,
  timestamp: new Date().toISOString(),
};

export const isMockLmpEnabled = () =>
  process.env.NEXT_PUBLIC_USE_MOCK_LMP === "true";
