import type { VerifiedRegistrationResponse } from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';
// import { dbAddDocWithId, dbRead, dbUpdateDoc } from '../singleton/db';
import type { Passkey, UserModel } from './types';

const getUserPasskeys = async (_userId: string): Promise<Passkey[]> => {
  // const existingPasskeysSnapshot = await dbRead(`passkeys/${userId}/items`);

  const existingPasskeysSnapshot = {};

  // @ts-expect-error
  if (!existingPasskeysSnapshot.exists) {
    return [];
  }
  // @ts-expect-error
  const existingPasskeys = existingPasskeysSnapshot.data();

  return existingPasskeys;
};

const getUserPasskey = async (
  _userId: string,
  _passkeyId: string,
): Promise<Passkey | undefined> => {
  // TODO implement
  const passkeySnapshot = {};
  // const passkeySnapshot = await dbRead(`passkeys/${userId}/items/${passkeyId}`);

  // @ts-expect-error
  if (!passkeySnapshot.exists) {
    return undefined;
  }

  // @ts-expect-error
  const passkey = passkeySnapshot.data();

  return passkey;
};

const getUser = async (_userId: string) => {
  return {};
  // return await dbRead(`users/${userId}`);
};

const setCurrentRegistrationOptions = async (
  _userId: string,
  _options: PublicKeyCredentialCreationOptionsJSON,
) => {
  // TODO implement
  // await dbUpdateDoc(`users/${userId}`, {
  //   passkeyRegistrationOptions: options,
  // });
};

const setCurrentAuthenticationOptions = async (
  _userId: string,
  options: PublicKeyCredentialRequestOptionsJSON,
) => {
  const _cleanOptions = JSON.parse(JSON.stringify(options));
  // TODO implement
  // await dbUpdateDoc(`users/${userId}`, {
  //   passkeyAuthenticationOptions: cleanOptions,
  // });
};

const saveNewPasskey = async (
  _firebaseUserId: string,
  user: UserModel,
  verification: VerifiedRegistrationResponse,
) => {
  const { passkeyRegistrationOptions } = user;
  const { registrationInfo } = verification;

  const {
    // @ts-expect-error
    credential,
    // @ts-expect-error
    credentialDeviceType: deviceType,
    // @ts-expect-error
    credentialBackedUp: backedUp,
  } = registrationInfo;

  const _newPasskey: Passkey = {
    // `user` here is from Step 2
    user,
    // Created by `generateRegistrationOptions()` in Step 1
    webAuthnUserID: passkeyRegistrationOptions.user.id,
    // A unique identifier for the credential
    id: credential.id,
    // The public key bytes, used for subsequent authentication signature verification
    publicKey: credential.publicKey,
    // The number of times the authenticator has been used on this site so far
    counter: credential.counter,
    // How the browser can talk with this credential's authenticator
    transports: credential.transports,
    // Whether the passkey is single-device or multi-device
    deviceType,
    // Whether the passkey has been backed up in some way
    backedUp,
  };

  // TODO implement
  // await dbAddDocWithId(
  //   `passkeys/${firebaseUserId}/items`,
  //   credential.id,
  //   newPasskey
  // );
};

const saveUpdatedCounter = async (
  _firebaseUserId: string,
  _passkeyId: string,
  _counter: number,
) => {
  // TODO implement
  // await dbUpdateDoc(`passkeys/${firebaseUserId}/items/${passkeyId}`, {
  //   counter,
  // });
};

export {
  getUser,
  getUserPasskeys,
  getUserPasskey,
  setCurrentRegistrationOptions,
  setCurrentAuthenticationOptions,
  saveNewPasskey,
  saveUpdatedCounter,
};
