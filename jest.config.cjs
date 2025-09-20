process.env.NODE_ENV = 'test';

module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: [
    '**/*-test.ts',
    '**/*-test.js',
    '**/*.test.js',
    '**/*.test.ts'
  ],
  transform: {
    '^.+\.ts$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'esnext',
        moduleResolution: 'node'
      }
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  testTimeout: 30000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\.{1,2}/.*)\.js$': '$1'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(mongodb-memory-server)/)',
  ],
  globals: {
    'ts-jest': {
      useESM: true
    }
  }
};