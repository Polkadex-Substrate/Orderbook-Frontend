"use client";
/**
 * Client-only wrapper for TestnetModal.
 *
 * TestnetModal imports @polkadex/ux, which pulls in
 * @polkadot-cloud/assets/extensions - that package reads `window` at module
 * scope and cannot be evaluated during SSR ("ReferenceError: window is not
 * defined"). layout.tsx is a server component and Next 15 forbids
 * `dynamic(..., { ssr: false })` there, so the ssr:false boundary lives in
 * this small client module instead.
 */
import dynamic from "next/dynamic";

export const TestnetModal = dynamic(
  () => import("./testnetModal").then((m) => m.TestnetModal),
  { ssr: false }
);
