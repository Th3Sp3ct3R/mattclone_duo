export default {
  displayName: "ui",
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.js"],
  // This package uses `.jsx` files with ESM `import`/`export`.
  // Jest treats `.js` as ESM in this workspace, but needs an explicit hint for `.jsx`.
  extensionsToTreatAsEsm: [".jsx"],
  transform: {
    "^.+\\.[jt]sx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: { syntax: "ecmascript", jsx: true },
          transform: { react: { runtime: "automatic" } }
        }
      }
    ]
  }
};


