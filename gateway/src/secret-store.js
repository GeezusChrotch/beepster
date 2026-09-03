import { execFile } from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const helper = process.env.BEEPSTER_KEYCHAIN_HELPER || path.join(os.homedir(), 'Library/Application Support/Beepster/bin/beepster-keychain');

export function readSecret(account) {
  return new Promise((resolve) => {
    execFile(helper, ['get', account], { timeout: 5000 }, (error, stdout) => {
      resolve(error ? '' : stdout.trim());
    });
  });
}

export function writeSecret(account, value) {
  return new Promise((resolve) => {
    const child = execFile(helper, ['set', account], { timeout: 5000 }, (error) => {
      resolve(!error);
    });
    child.stdin?.end(value);
  });
}
