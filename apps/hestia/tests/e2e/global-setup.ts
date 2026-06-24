import { cryptoWaitReady, mnemonicGenerate } from "@polkadot/util-crypto";
import { Keyring } from "@polkadot/keyring";

// Runs once before any test worker spawns.
// Generates a fresh sr25519 address so FA-01..FA-04 always start below the
// daily faucet drip limit — avoids the "rate-limited from a prior run" failure.
export default async function globalSetup() {
  await cryptoWaitReady();
  const kr = new Keyring({ type: "sr25519" });
  const pair = kr.addFromMnemonic(mnemonicGenerate());
  process.env.TEST_SUBSTRATE_ADDRESS = pair.address;
  console.log(`[global-setup] Fresh faucet address: ${pair.address}`);
}
