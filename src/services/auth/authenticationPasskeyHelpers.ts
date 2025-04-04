import {
  getUser,
  getUserPasskey,
  getUserPasskeys,
  saveUpdatedCounter,
  setCurrentAuthenticationOptions,
} from './userHelpers';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import { EXPECTED_ORIGINS, EXPECTED_RP_IDS, RP_ID } from './config';
import { logger } from 'src/utils/logger';

const generateOptions = async (userId: string) => {
  const userPasskeys = await getUserPasskeys(userId);

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    // Require users to use a previously-registered authenticator
    allowCredentials: userPasskeys.map(passkey => ({
      id: passkey.id,
      transports: passkey.transports,
    })),
  });

  logger.info('auth generateOptions', options);

  await setCurrentAuthenticationOptions(userId, options);
  return options;
};

const verify = async (userId: string, credential: any) => {
  let isVerified = false;
  const userSnapshot = await getUser(userId);

  // @ts-ignore
  if (!userSnapshot.exists) {
    return {
      isVerified,
    };
  }

  // @ts-ignore
  const user = userSnapshot.data();
  logger.info('user data', user);
  logger.info('user id', userId);
  logger.info('passkey id', credential.id);
  const { passkeyAuthenticationOptions: currentOptions } = user;
  const passkey = await getUserPasskey(userId, credential.id);

  if (!passkey) {
    throw new Error(
      `Could not find passkey ${credential.id} for user ${user.id}`
    );
  }

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge: currentOptions.challenge,
      expectedOrigin: EXPECTED_ORIGINS,
      expectedRPID: EXPECTED_RP_IDS,
      credential: {
        id: passkey.id,
        publicKey: passkey.publicKey,
        counter: passkey.counter,
        transports: passkey.transports,
      },
    });
  } catch (error) {
    logger.error(error);
    return {
      isVerified,
    };
    // return res.status(400).send({ error: error.message });
  }

  const { verified } = verification;

  const { authenticationInfo } = verification;
  const { newCounter } = authenticationInfo;

  logger.info(`updating counter to ${newCounter} for passkey: ${passkey.id}`);

  await saveUpdatedCounter(userId, passkey.id, newCounter);
  logger.info(`updated counter to ${newCounter} for passkey: ${passkey.id}`);

  return { isVerified: verified };
};

export { generateOptions, verify };
