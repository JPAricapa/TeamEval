import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    '../../backend/src/**/*.ts',
    '!../../backend/src/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  setupFilesAfterFramework: ['./setup.ts']
};

export default config;
