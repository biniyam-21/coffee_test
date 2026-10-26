module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/*.spec.ts'],
  moduleNameMapper: {
    '^expo-secure-store$': '<rootDir>/src/test/mocks/expo-secure-store.ts',
  },
};
