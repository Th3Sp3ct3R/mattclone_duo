export default {
  displayName: 'mobile',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/*.test.js'],
  // Disable Babel-jest auto-transform (which can rewrite module paths based on monorepo CWD).
  // We rely on Jest's `moduleNameMapper` for `@/` instead.
  transform: {},
  moduleNameMapper: {
    '^expo-constants$': '<rootDir>/src/__mocks__/expo-constants.js',
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};


