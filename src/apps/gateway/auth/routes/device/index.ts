import { randomBytes } from 'crypto';
import { createDeviceRequest as createDeviceRequestMutation } from 'src/services/hasura/mutations/auth/device';
import { generateHumanCode, generateSecureCode } from 'src/utils/string';

const createDeviceRequest = async ({
  extensionId,
  ip,
  userAgent,
}: {
  extensionId: string;
  ip: string;
  userAgent: string;
}) => {
  // Validate extension ID
  // if (!isValidExtensionId(extensionId)) {
  //   return res.status(400).json({ error: 'invalid_client' });
  // }

  // // Rate limiting
  // await checkRateLimit(req.ip, extensionId);

  // Generate codes
  const deviceCode = generateSecureCode(64); // Long, cryptographic
  const userCode = generateHumanCode(); // Short, readable
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Store in database
  await createDeviceRequestMutation({
    deviceCode,
    userCode,
    extensionId,
    expiresAt,
    ipAddress: ip,
    userAgent,
    status: 'pending',
  });

  return {
    deviceCode, // Extension keeps this secret
    userCode, // Show this to user
    verification_uri: 'https://watch.sworld.dev/pair',
    verification_uri_complete: `https://watch.sworld.dev/pair?code=${userCode}`,
    expires_in: 600, // 10 minutes in seconds
    interval: 5, // Poll every 5 seconds
  };
};

export { createDeviceRequest };
