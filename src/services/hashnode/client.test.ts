import { GraphQLClient } from 'graphql-request';
import { envConfig } from 'src/utils/envConfig';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHashnodeClient } from './client';

vi.mock('graphql-request', () => ({
  GraphQLClient: vi.fn(),
}));

vi.mock('src/utils/envConfig', () => ({
  envConfig: {
    hashnodeEndpoint: undefined,
    hashnodePersonalToken: undefined,
  },
}));

describe('createHashnodeClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(envConfig).hashnodeEndpoint = undefined;
    vi.mocked(envConfig).hashnodePersonalToken = undefined;
  });

  it('should create GraphQL client with correct config when all env vars are present', () => {
    const mockEndpoint = 'https://api.hashnode.com';
    const mockToken = 'test-token';

    vi.mocked(envConfig).hashnodeEndpoint = mockEndpoint;
    vi.mocked(envConfig).hashnodePersonalToken = mockToken;

    createHashnodeClient();

    expect(GraphQLClient).toHaveBeenCalledWith(mockEndpoint, {
      headers: {
        Authorization: mockToken,
      },
    });
  });

  it('should throw error when endpoint is not defined', () => {
    vi.mocked(envConfig).hashnodeEndpoint = undefined;
    vi.mocked(envConfig).hashnodePersonalToken = 'test-token';

    expect(() => createHashnodeClient()).toThrow(
      'Hashnode endpoint is not defined. Please check environment variables.'
    );
  });

  it('should throw error when token is not defined', () => {
    vi.mocked(envConfig).hashnodeEndpoint = 'https://api.hashnode.com';
    vi.mocked(envConfig).hashnodePersonalToken = undefined;

    expect(() => createHashnodeClient()).toThrow('Hashnode token is not defined. Please check environment variables.');
  });

  it('should throw error when both endpoint and token are not defined', () => {
    vi.mocked(envConfig).hashnodeEndpoint = undefined;
    vi.mocked(envConfig).hashnodePersonalToken = undefined;

    expect(() => createHashnodeClient()).toThrow(
      'Hashnode endpoint is not defined. Please check environment variables.'
    );
  });
});
