/** @type {import('ts-jest').JestConfigWithTsJest} */
// Plain JS, mirroring packages/core. A jest.config.TS needs ts-node installed,
// which this workspace does not have - a known trap here.
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
};
