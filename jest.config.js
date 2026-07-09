/** @type {import('jest').Config} */
module.exports = {
  projects: [
    '<rootDir>/apps/api/jest.config.js',
    '<rootDir>/apps/web-next/jest.config.js',
    '<rootDir>/apps/worker/jest.config.js',
    '<rootDir>/apps/mobile/jest.config.js',
    '<rootDir>/packages/device-control/jest.config.js',
    '<rootDir>/packages/automation/jest.config.js',
    '<rootDir>/packages/integrations/jest.config.js',
    '<rootDir>/packages/shared/jest.config.js',
    '<rootDir>/packages/api-client/jest.config.js',
    '<rootDir>/packages/ui/jest.config.js',
    '<rootDir>/packages/validation/jest.config.js',
    '<rootDir>/whatsapp-report/packages/whatsapp/jest.config.js',
    '<rootDir>/packages/logger/jest.config.js'
  ]
};
