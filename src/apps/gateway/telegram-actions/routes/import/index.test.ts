import {
  TaskEntityType,
  TaskType,
} from 'src/services/hasura/mutations/tasks/constants';
import { computeTaskId, createCloudTasks } from 'src/utils/cloud-task';
import { envConfig } from 'src/utils/envConfig';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { importTelegramArchive } from './index';

vi.mock('src/utils/cloud-task', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/utils/cloud-task')>();
  return {
    ...actual,
    createCloudTasks: vi.fn(),
  };
});

vi.mock('src/utils/logger', () => {
  const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  return { getCurrentLogger: vi.fn(() => mockLogger) };
});

vi.mock('src/utils/systemConfig', () => ({
  queues: { telegramArchiveQueue: 'telegram-archive' },
  uuidNamespaces: { cloudTask: 'abd32375-5036-44a1-bc75-c7bb33051b99' },
}));

describe('importTelegramArchive', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(envConfig).ioServiceUrl = 'http://io-service';
    vi.mocked(createCloudTasks).mockResolvedValue({ name: 'test-task' });
  });

  const buildContext = (
    overrides: Partial<{
      channelId: string;
      messageIds: string[];
      userId: string;
    }> = {},
  ) => ({
    validatedData: {
      channelId: overrides.channelId ?? '-582839764',
      messageIds: overrides.messageIds ?? ['101', '102'],
      userId: overrides.userId ?? 'user-456',
    },
  });

  it('creates an idempotent Cloud Task and returns its taskId', async () => {
    const result = await importTelegramArchive(buildContext() as any);

    const expectedEntityId = expect.any(String);
    expect(createCloudTasks).toHaveBeenCalledWith(
      expect.objectContaining({
        audience: 'http://io-service',
        queue: 'telegram-archive',
        url: 'http://io-service/telegram/import-handler',
        entityId: expectedEntityId,
        entityType: TaskEntityType.TELEGRAM_ARCHIVE,
        type: TaskType.IMPORT_TELEGRAM,
        payload: expect.objectContaining({
          data: {
            channelId: '-582839764',
            messageIds: ['101', '102'],
            userId: 'user-456',
          },
          metadata: expect.objectContaining({
            id: expect.any(String),
            spanId: expect.any(String),
            traceId: expect.any(String),
          }),
        }),
      }),
    );

    const entityId = vi.mocked(createCloudTasks).mock.calls[0][0].entityId;
    const expectedTaskId = computeTaskId({
      entityType: TaskEntityType.TELEGRAM_ARCHIVE,
      entityId,
      type: TaskType.IMPORT_TELEGRAM,
    });
    expect(result).toEqual({
      success: true,
      message: 'ok',
      dataObject: { taskId: expectedTaskId },
    });
  });

  it('derives the same entityId regardless of messageIds order', async () => {
    await importTelegramArchive(
      buildContext({ messageIds: ['102', '101'] }) as any,
    );
    const firstEntityId = vi.mocked(createCloudTasks).mock.calls[0][0].entityId;

    vi.clearAllMocks();
    vi.mocked(createCloudTasks).mockResolvedValue({ name: 'test-task' });
    await importTelegramArchive(
      buildContext({ messageIds: ['101', '102'] }) as any,
    );
    const secondEntityId =
      vi.mocked(createCloudTasks).mock.calls[0][0].entityId;

    expect(firstEntityId).toBe(secondEntityId);
  });

  it('derives a different entityId for a different messageIds selection', async () => {
    await importTelegramArchive(buildContext({ messageIds: ['101'] }) as any);
    const firstEntityId = vi.mocked(createCloudTasks).mock.calls[0][0].entityId;

    vi.clearAllMocks();
    vi.mocked(createCloudTasks).mockResolvedValue({ name: 'test-task' });
    await importTelegramArchive(
      buildContext({ messageIds: ['101', '102'] }) as any,
    );
    const secondEntityId =
      vi.mocked(createCloudTasks).mock.calls[0][0].entityId;

    expect(firstEntityId).not.toBe(secondEntityId);
  });

  it('returns an error when io service URL is missing', async () => {
    vi.mocked(envConfig).ioServiceUrl = '';

    const result = await importTelegramArchive(buildContext() as any);

    expect(result).toEqual({
      success: false,
      message: 'Missing io service URL',
    });
    expect(createCloudTasks).not.toHaveBeenCalled();
  });

  it('returns an error when Cloud Task creation fails', async () => {
    vi.mocked(createCloudTasks).mockRejectedValue(new Error('boom'));

    const result = await importTelegramArchive(buildContext() as any);

    expect(result).toEqual({
      success: false,
      message: 'Failed to create import task',
    });
  });
});
