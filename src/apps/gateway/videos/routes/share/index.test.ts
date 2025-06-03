import { describe, it, vi, expect, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { envConfig } from 'src/utils/envConfig';
import { AppError, AppResponse } from 'src/utils/schema';
import { verifySignature } from 'src/services/videos/convert/validator';
import { getPlaylistVideos } from 'src/services/hasura/queries/share';
import { insertSharedVideoRecipients } from 'src/services/hasura/mutations/share-videos';
import { shareVideoHandler } from './index';

vi.mock('src/utils/envConfig', () => ({
  envConfig: {
    computeServiceUrl: 'http://compute',
    ioServiceUrl: 'http://io',
  },
}));

vi.mock('src/services/videos/convert/validator', () => ({
  verifySignature: vi.fn(),
}));

vi.mock('src/services/hasura/queries/share', () => ({
  getPlaylistVideos: vi.fn(),
}));

vi.mock('src/services/hasura/mutations/share-videos', () => ({
  insertSharedVideoRecipients: vi.fn(),
}));

describe('shareVideoHandler', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  const mockJson = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockRes = {
      json: mockJson,
    };
    mockReq = {
      validatedData: {
        signatureHeader: 'valid-signature',
        event: {
          data: {
            id: 'playlist-1',
            sharedRecipientsInput: ['user1@example.com', 'user2@example.com'],
          },
          metadata: {
            id: 'event-1',
          },
        },
      },
    };
  });

  it('should return error if signature is invalid', async () => {
    vi.mocked(verifySignature).mockReturnValue(false);

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(mockJson).toHaveBeenCalledWith(
      AppError('Invalid webhook signature for event', {
        eventId: 'event-1',
      })
    );
  });

  it('should return error if no valid emails are provided', async () => {
    vi.mocked(verifySignature).mockReturnValue(true);
    mockReq.validatedData!.event.data.sharedRecipientsInput = ['invalid-email'];

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(mockJson).toHaveBeenCalledWith(
      AppError('Invalid email', {
        eventId: 'event-1',
      })
    );
  });

  it('should return error if playlist is not found', async () => {
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(getPlaylistVideos).mockResolvedValue({
      playlist_by_pk: null,
      users: [],
    });

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(mockJson).toHaveBeenCalledWith(
      AppError('Playlist not found', {
        eventId: 'event-1',
      })
    );
  });

  it('should return error if no ready videos found in playlist', async () => {
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(getPlaylistVideos).mockResolvedValue({
      playlist_by_pk: {
        playlist_videos: [],
      },
      users: [],
    });

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(mockJson).toHaveBeenCalledWith(
      AppError('No ready videos found in playlist', {
        eventId: 'event-1',
      })
    );
  });

  it('should return error if no valid users found', async () => {
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(getPlaylistVideos).mockResolvedValue({
      playlist_by_pk: {
        playlist_videos: [{ video: { id: 'video-1', status: 'ready' } }],
      },
      users: null,
    });

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(mockJson).toHaveBeenCalledWith(
      AppError('No valid users found', {
        eventId: 'event-1',
      })
    );
  });

  it('should successfully share videos with valid users', async () => {
    vi.mocked(verifySignature).mockReturnValue(true);
    vi.mocked(getPlaylistVideos).mockResolvedValue({
      playlist_by_pk: {
        playlist_videos: [{ video: { id: 'video-1', status: 'ready' } }, { video: { id: 'video-2', status: 'ready' } }],
      },
      users: [
        { id: 'user-1', email: 'user1@example.com' },
        { id: 'user-2', email: 'user2@example.com' },
      ],
    });
    vi.mocked(insertSharedVideoRecipients).mockResolvedValue({
      insert_shared_video_recipients: {
        returning: [{ id: 'record-1' }, { id: 'record-2' }],
      },
      update_playlist_by_pk: {
        id: 'playlist-1',
        sharedRecipients: ['user1@example.com', 'user2@example.com'],
      },
    });

    await shareVideoHandler(mockReq as Request, mockRes as Response);

    expect(insertSharedVideoRecipients).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          videoId: expect.any(String),
          playlistId: 'playlist-1',
          receiverId: expect.any(String),
        }),
      ]),
      'playlist-1',
      ['user1@example.com', 'user2@example.com']
    );
    expect(mockJson).toHaveBeenCalledWith(AppResponse(true, 'ok'));
  });
});
