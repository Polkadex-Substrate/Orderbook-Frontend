/** @type {import('ts-jest').JestConfigWithTsJest} */
// Plain JS on purpose: a jest.config.TS needs ts-node, which this workspace
// does not have - a known trap in this repo.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  // `@orderbook/core/...` is a tsconfig path alias, resolved by the bundler at
  // build time and by nothing at all under jest. Without this, any module that
  // imports through the alias - most of src/helpers - cannot be unit tested,
  // which is why the order-payload builder had no tests until it broke.
  moduleNameMapper: {
    "^@orderbook/core/(.*)$": "<rootDir>/src/$1",
  },
};
