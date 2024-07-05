export type DefaultConfig = {
  polkadexChain: string[];
  gaTrackerKey: string;
  landingPageMarket: string;
  maintenanceMode: boolean;
  availableRoutes: string[];
  underMaintenance: string[];
  blockedAssets: string[];
  subscanApi: string;
  disabledTheaChains: string[];
  subqueryUrl: string;
  googleApiKey: string;
  googleClientId: string;
  disabledFeatures: Array<Features>;
  defaultTheaSourceChain: string;
  defaultTheaDestinationChain: string;
};

export type Features = (typeof features)[number];
export const features = [
  "googleDriveStore",
  "payWithAnotherFee",
  "lmp",
  "bridge",
] as const;
