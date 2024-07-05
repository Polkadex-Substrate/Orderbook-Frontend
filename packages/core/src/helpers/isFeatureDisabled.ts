import { Features, defaultConfig } from "../config";

const { disabledFeatures } = defaultConfig;

export const isFeatureDisabled = (v: Features) =>
  !disabledFeatures?.includes(v);

export const enabledFeatures = {
  googleDriveStore: isFeatureDisabled("googleDriveStore"),
  payWithAnotherFee: isFeatureDisabled("payWithAnotherFee"),
  bridge: isFeatureDisabled("bridge"),
  lmp: isFeatureDisabled("lmp"),
};
