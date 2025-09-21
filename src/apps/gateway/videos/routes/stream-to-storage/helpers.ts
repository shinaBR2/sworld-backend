import { envConfig } from 'src/utils/envConfig';
import { type FileType, type Platform, urlPatterns } from 'src/utils/patterns';
import { queues } from 'src/utils/systemConfig';

const ioServiceUrl = envConfig.ioServiceUrl as string;
const computeServiceUrl = envConfig.computeServiceUrl as string;
const { streamVideoQueue, convertVideoQueue } = queues;

const VIDEO_HANDLERS = {
  HLS: '/videos/stream-hls-handler',
  CONVERT: '/videos/convert-handler',
  PLATFORM_IMPORT: '/videos/import-platform-handler',
} as const;
const allowedPlatforms = Object.keys(urlPatterns) as Platform[];

const buildHandlerUrl = (baseUrl: string, handler: string): string => {
  return `${baseUrl}${handler}`;
};

const buildTaskHandler = (
  fileType: FileType | null,
  platform: Platform | null,
) => {
  if (fileType === 'hls') {
    return {
      queue: streamVideoQueue,
      audience: ioServiceUrl,
      url: buildHandlerUrl(ioServiceUrl, VIDEO_HANDLERS.HLS),
    };
  }

  if (fileType === 'video') {
    return {
      queue: convertVideoQueue,
      audience: computeServiceUrl,
      url: buildHandlerUrl(computeServiceUrl, VIDEO_HANDLERS.CONVERT),
    };
  }

  if (platform && allowedPlatforms.includes(platform)) {
    return {
      queue: streamVideoQueue,
      audience: ioServiceUrl,
      url: buildHandlerUrl(ioServiceUrl, VIDEO_HANDLERS.PLATFORM_IMPORT),
    };
  }

  return null;
};

export { buildTaskHandler };
