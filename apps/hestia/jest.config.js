/** @type {import('ts-jest').JestConfigWithTsJest} */
// First test setup in apps/hestia. Scope: PURE LOGIC ONLY (*.test.ts under
// src). Component tests (.test.tsx) would need jsdom + @testing-library/react,
// which are not dependencies here - the convention instead is to extract
// decision logic into plain .ts modules (see moveFromTrading.logic.ts) and
// test those, keeping components as thin shells.
//
// Plain JS config on purpose: a jest.config.ts needs ts-node to load, which is
// not installed - packages/format hit exactly that and its test script had
// never run. Same shape as packages/core's config.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  // .next/standalone contains a full copy of package.json, which jest's module
  // scanner reports as a name collision on any machine that has built.
  modulePathIgnorePatterns: ["<rootDir>/.next/"],
  // Keep ts-jest off the Next-specific compiler options (jsx: preserve emits
  // raw JSX that node cannot run; paths/plugins need webpack). Logic modules
  // must not import through "@/..." aliases - a relative import keeps them
  // dependency-light, which is the point of extracting them.
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      { tsconfig: { jsx: "react-jsx", module: "commonjs" } },
    ],
  },
};
