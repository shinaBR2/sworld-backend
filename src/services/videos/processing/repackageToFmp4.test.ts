import { Readable } from 'node:stream';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { repackageToFmp4 } from './repackageToFmp4';
import type { Fmp4Artifacts, RepackageDeps } from './types';

const STORAGE_PATH = 'videos/user-1/video-1';
const PLAYLIST_URL = `https://storage.test/${STORAGE_PATH}/playlist.m3u8`;

const FMP4_PLAYLIST = `#EXTM3U
#EXT-X-VERSION:7
#EXT-X-MAP:URI="init.mp4"
#EXTINF:4.0,
0.m4s
#EXTINF:4.0,
1.m4s
#EXT-X-ENDLIST`;

const makeArtifacts = (segmentCount = 2): Fmp4Artifacts => ({
  init: { name: 'init.mp4', stream: Readable.from(['init-bytes']) },
  segments: Array.from({ length: segmentCount }, (_, i) => ({
    name: `${i}.m4s`,
    stream: Readable.from([`seg-${i}-bytes`]),
  })),
  playlistContent: FMP4_PLAYLIST,
});

const makeDeps = (
  overrides: {
    artifacts?: Fmp4Artifacts;
    cleanup?: () => Promise<void>;
    uploadStream?: () => Promise<unknown>;
  } = {},
): { deps: RepackageDeps; cleanup: ReturnType<typeof vi.fn> } => {
  const cleanup = vi.fn(overrides.cleanup ?? (async () => undefined));
  const deps: RepackageDeps = {
    storage: {
      uploadStream: vi.fn(overrides.uploadStream ?? (async () => undefined)),
      getDownloadUrl: vi.fn((p: string) => `https://storage.test/${p}`),
    },
    repackage: {
      repackageToFmp4: vi.fn(async () => ({
        artifacts: overrides.artifacts ?? makeArtifacts(),
        cleanup,
      })),
    },
    logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  };
  return { deps, cleanup };
};

describe('repackageToFmp4', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('feeds the stored playlist URL to the repackage port', async () => {
    const { deps } = makeDeps();

    await repackageToFmp4({ storagePath: STORAGE_PATH }, deps);

    expect(deps.storage.getDownloadUrl).toHaveBeenCalledWith(
      `${STORAGE_PATH}/playlist.m3u8`,
    );
    expect(deps.repackage.repackageToFmp4).toHaveBeenCalledWith(PLAYLIST_URL);
  });

  it('uploads init + each .m4s with the right content types and paths', async () => {
    const { deps } = makeDeps();

    const result = await repackageToFmp4({ storagePath: STORAGE_PATH }, deps);

    // 1 init + 2 segments = 3 uploads. NOT the playlist (P2 swaps that).
    expect(deps.storage.uploadStream).toHaveBeenCalledTimes(3);
    expect(deps.storage.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        storagePath: `${STORAGE_PATH}/init.mp4`,
        contentType: 'video/mp4',
      }),
    );
    expect(deps.storage.uploadStream).toHaveBeenCalledWith(
      expect.objectContaining({
        storagePath: `${STORAGE_PATH}/0.m4s`,
        contentType: 'video/iso.segment',
      }),
    );

    expect(result).toEqual({
      initName: 'init.mp4',
      segmentNames: ['0.m4s', '1.m4s'],
      playlistContent: FMP4_PLAYLIST,
    });
  });

  it('never writes the shared playlist.m3u8 (additive only)', async () => {
    const { deps } = makeDeps();

    await repackageToFmp4({ storagePath: STORAGE_PATH }, deps);

    const wrotePlaylist = (
      deps.storage.uploadStream as ReturnType<typeof vi.fn>
    ).mock.calls.some(([arg]) =>
      (arg as { storagePath: string }).storagePath.endsWith('playlist.m3u8'),
    );
    expect(wrotePlaylist).toBe(false);
  });

  it('always cleans up temp resources on success', async () => {
    const { deps, cleanup } = makeDeps();

    await repackageToFmp4({ storagePath: STORAGE_PATH }, deps);

    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('throws and still cleans up when no segments were produced', async () => {
    const { deps, cleanup } = makeDeps({ artifacts: makeArtifacts(0) });

    await expect(
      repackageToFmp4({ storagePath: STORAGE_PATH }, deps),
    ).rejects.toThrow('Repackage produced no segments');
    expect(deps.storage.uploadStream).not.toHaveBeenCalled();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it('wraps upload failures and still cleans up', async () => {
    const { deps, cleanup } = makeDeps({
      uploadStream: async () => {
        throw new Error('GCS down');
      },
    });

    await expect(
      repackageToFmp4({ storagePath: STORAGE_PATH }, deps),
    ).rejects.toThrow('Failed to upload fMP4 artifacts');
    expect(cleanup).toHaveBeenCalledTimes(1);
  });
});
