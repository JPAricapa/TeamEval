/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '../..',
  moduleDirectories: ['node_modules', 'backend/node_modules'],
  transform: {
    '^.+\\.tsx?$': ['<rootDir>/backend/node_modules/ts-jest', {
      tsconfig: '<rootDir>/backend/tsconfig.json',
      diagnostics: false
    }]
  },
  testMatch: ['<rootDir>/tests/backend/**/*.test.ts'],
  collectCoverageFrom: [
    '<rootDir>/backend/src/**/*.ts',
    '!<rootDir>/backend/src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 2,
      functions: 5,
      lines: 20,
      statements: 20
    }
  }
};
