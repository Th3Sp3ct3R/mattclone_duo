/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/apps/worker/jest.config.js',
    '<rootDir>/apps/mobile/jest.config.js',
    '<rootDir>/packages/shared/jest.config.js',
    '<rootDir>/packages/api-client/jest.config.js',
    '<rootDir>/packages/ui/jest.config.js',
    '<rootDir>/packages/validation/jest.config.js'
  ]
};


