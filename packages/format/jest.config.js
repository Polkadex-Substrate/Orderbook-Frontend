/** @type {import('ts-jest').JestConfigWithTsJest} */
// Plain JS, not jest.config.ts. A TypeScript jest config needs `ts-node` to load,
// ts-node was never a dependency here, and so `yarn test` in this package failed
// before running a single test - which is the likely reason the package had none.
// packages/core already uses a .js config for the same reason.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  verbose: true,
};
