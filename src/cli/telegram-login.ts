#!/usr/bin/env tsx

/**
 * One-off interactive script to generate the long-lived TELEGRAM_SESSION string.
 *
 * MTProto login is per-account, not per-service: run this ONCE locally with the
 * owner's personal Telegram account, then paste the printed session string into
 * TELEGRAM_SESSION on both the `gateway` and `io` Cloud Run services (and local
 * `.env`). Telegram supports multiple simultaneous authorized connections from
 * one session string, so both services can hold their own live connection
 * without re-running this.
 *
 * This is NOT the shared `getTelegramClient()` singleton
 * (`src/services/telegram/client.ts`) — that helper requires an existing
 * TELEGRAM_SESSION and is for `gateway`/`io` runtime use. This script's whole
 * job is to produce that session in the first place, so it builds its own
 * client from a blank session.
 *
 * Setup: get an api_id / api_hash pair from https://my.telegram.org, then
 * either export TG_API_ID / TG_API_HASH or pass them as flags.
 *
 * Usage:
 *   npx tsx src/cli/telegram-login.ts [--api-id <id>] [--api-hash <hash>]
 *
 * Manually verified by the operator — this repo has no real Telegram
 * credentials to run it end-to-end in CI/sandbox.
 */

import { createInterface } from 'node:readline/promises';
import { envConfig } from 'src/utils/envConfig';
import { TelegramClient } from 'teleproto';
import { StringSession } from 'teleproto/sessions';
import { flushThenExit } from './cli-exit';

/** Same retry budget as the shared client (`src/services/telegram/client.ts`). */
const CONNECTION_RETRIES = 5;

// ─── Argument parsing ────────────────────────────────────────────────────────

interface LoginArgs {
  apiId: number;
  apiHash: string;
}

const getFlagValue = (rawArgs: string[], flag: string): string | undefined => {
  const idx = rawArgs.indexOf(flag);
  if (idx === -1) return undefined;
  const value = rawArgs[idx + 1];
  // A missing value (end of args, or another --flag) is treated as unset, not
  // silently swallowing the next flag as this one's value.
  return value && !value.startsWith('--') ? value : undefined;
};

const parseLoginArgs = (rawArgs: string[]): LoginArgs => {
  const apiIdRaw = getFlagValue(rawArgs, '--api-id') || envConfig.telegramApiId;
  const apiHash =
    getFlagValue(rawArgs, '--api-hash') || envConfig.telegramApiHash;

  if (!apiIdRaw) {
    console.error(
      'Error: api-id not provided. Pass --api-id <id> or set TG_API_ID (from https://my.telegram.org).',
    );
    process.exit(1);
  }
  if (!apiHash) {
    console.error(
      'Error: api-hash not provided. Pass --api-hash <hash> or set TG_API_HASH (from https://my.telegram.org).',
    );
    process.exit(1);
  }

  const apiId = Number(apiIdRaw);
  if (!Number.isInteger(apiId)) {
    console.error(`Error: api-id must be a valid integer, got "${apiIdRaw}".`);
    process.exit(1);
  }

  return { apiId, apiHash };
};

// ─── Interactive prompt ──────────────────────────────────────────────────────

type Readline = ReturnType<typeof createInterface>;

const prompt = async (rl: Readline, question: string): Promise<string> =>
  (await rl.question(question)).trim();

// ─── Login flow ──────────────────────────────────────────────────────────────

const runLogin = async (rawArgs: string[]): Promise<void> => {
  const { apiId, apiHash } = parseLoginArgs(rawArgs);
  const rl = createInterface({ input: process.stdin, output: process.stdout });

  console.log('=== Telegram MTProto Login ===');
  console.log(
    'One-time interactive login. On success this prints a session string —',
  );
  console.log(
    'paste it into TELEGRAM_SESSION on gateway/io. Treat it like a password:',
  );
  console.log('never commit it, never share it, never log it elsewhere.');
  console.log('');

  // Start from a blank session — producing one is this script's entire job.
  // Kept as its own typed reference (rather than reading back `client.session`,
  // which is typed as the abstract `Session` base) so `.save()` returns `string`.
  const session = new StringSession('');
  const client = new TelegramClient(session, apiId, apiHash, {
    connectionRetries: CONNECTION_RETRIES,
  });

  try {
    await client.start({
      phoneNumber: () => prompt(rl, 'Phone number (with country code): '),
      password: () => prompt(rl, '2FA password (leave blank if none): '),
      phoneCode: () => prompt(rl, 'Login code sent by Telegram: '),
      onError: (error: Error) => console.error('Login error:', error.message),
    });

    // Identity check only — id/username, never anything session-related.
    const me = await client.getMe();
    console.log('');
    console.log(`Logged in as: @${me.username ?? 'unknown'} (id: ${me.id})`);

    const sessionString = session.save();
    console.log('');
    console.log('=== Session string — paste into TELEGRAM_SESSION ===');
    console.log(sessionString);
    console.log('=== End of session string ===');
  } finally {
    rl.close();
    await client.disconnect();
  }
};

runLogin(process.argv.slice(2))
  // Exit explicitly on success — MTProto keep-alive sockets can otherwise keep
  // the event loop alive, hanging the process after the script's done its job.
  .then(() => flushThenExit(0))
  .catch((error) => {
    console.error('');
    console.error('=== Error ===');
    console.error(error.message || error);
    flushThenExit(1);
  });
