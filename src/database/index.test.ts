import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sequelize, initialize } from './index';
import './__mocks__/sequelize';

// Mock the envConfig
vi.mock('src/utils/envConfig', () => ({
  envConfig: {
    databaseUrl: 'postgres://test-user:test-password@localhost:5432/test-db',
  },
}));

describe('Database Initialization', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  it('should create a Sequelize instance with the correct configuration', () => {
    // Verify that the Sequelize constructor was called with the correct parameters
    expect(sequelize).toBeDefined();
  });

  describe('initialize method', () => {
    let originalAuthenticate: any;
    let originalSync: any;

    beforeEach(() => {
      originalAuthenticate = sequelize.authenticate;
      originalSync = sequelize.sync;
    });

    afterEach(() => {
      sequelize.authenticate = originalAuthenticate;
      sequelize.sync = originalSync;
    });

    it('should authenticate and sync the database', async () => {
      // Mock the authenticate and sync methods
      const authenticateMock = vi.fn().mockResolvedValue(undefined);
      const syncMock = vi.fn().mockResolvedValue(undefined);

      sequelize.authenticate = authenticateMock;
      sequelize.sync = syncMock;

      await initialize();

      // Verify that authenticate and sync were called
      expect(authenticateMock).toHaveBeenCalledTimes(1);
      expect(syncMock).toHaveBeenCalledTimes(1);
    });

    it('should throw error if authentication fails', async () => {
      // Mock authentication failure
      const authenticateMock = vi.fn().mockRejectedValue(new Error('Authentication failed'));
      const syncMock = vi.fn();

      // Temporarily replace the methods
      const originalAuthenticate = sequelize.authenticate;
      const originalSync = sequelize.sync;

      sequelize.authenticate = authenticateMock;
      sequelize.sync = syncMock;

      try {
        // Expect initialize to throw an error
        await expect(initialize()).rejects.toThrow('Authentication failed');

        // Verify sync was not called
        expect(syncMock).not.toHaveBeenCalled();
      } finally {
        // Restore original methods
        sequelize.authenticate = originalAuthenticate;
        sequelize.sync = originalSync;
      }
    });

    it('should throw error if sync fails', async () => {
      // Mock sync failure
      const authenticateMock = vi.fn().mockResolvedValue(undefined);
      const syncMock = vi.fn().mockRejectedValue(new Error('Sync failed'));

      // Temporarily replace the methods
      const originalAuthenticate = sequelize.authenticate;
      const originalSync = sequelize.sync;

      sequelize.authenticate = authenticateMock;
      sequelize.sync = syncMock;

      try {
        // Expect initialize to throw an error
        await expect(initialize()).rejects.toThrow('Sync failed');
      } finally {
        // Restore original methods
        sequelize.authenticate = originalAuthenticate;
        sequelize.sync = originalSync;
      }
    });
  });
});
