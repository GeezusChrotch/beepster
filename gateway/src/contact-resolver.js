import { execFile } from 'node:child_process';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const POSITIVE_CACHE_MS = 6 * 60 * 60 * 1000;
const NEGATIVE_CACHE_MS = 15 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

export function normalizeContactIdentifier(value) {
  const identifier = String(value || '').trim();
  if (!identifier) return '';
  if (identifier.includes('@')) return identifier.replace(/^mailto:/i, '').toLowerCase();
  const digits = identifier.replace(/\D/g, '');
  if (digits.length >= 7) return digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  return '';
}

const execFileAsync = promisify(execFile);

async function runHelper(helperPath, identifiers) {
  const directory = await mkdtemp(join(tmpdir(), 'beepster-contacts-'));
  const requestPath = join(directory, 'request.json');
  const responsePath = join(directory, 'response.json');
  try {
    await writeFile(requestPath, JSON.stringify({ identifiers }), { mode: 0o600 });
    await execFileAsync('/usr/bin/open', ['-W', '-n', helperPath, '--args', '--lookup-file', requestPath, responsePath], {
      timeout: 8000,
      maxBuffer: 32 * 1024
    });
    const data = await readFile(responsePath, 'utf8');
    if (data.length > 256 * 1024) throw new Error('Contacts helper returned too much data');
    return JSON.parse(data);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export class MacContactsResolver {
  constructor({
    helperPath = join(homedir(), 'Library/Application Support/Beepster/bin/Beepster Contacts.app'),
    runner = runHelper,
    now = () => Date.now()
  } = {}) {
    this.helperPath = helperPath;
    this.runner = runner;
    this.now = now;
    this.cache = new Map();
  }

  async lookup(values) {
    if (process.platform !== 'darwin' && this.runner === runHelper) return new Map();
    const identifiers = [...new Set(values.map(normalizeContactIdentifier).filter(Boolean))];
    if (!identifiers.length) return new Map();
    const found = new Map();
    const missing = [];
    const now = this.now();
    for (const identifier of identifiers) {
      const cached = this.cache.get(identifier);
      if (cached && cached.expiresAt > now) {
        if (cached.name) found.set(identifier, cached.name);
      } else {
        missing.push(identifier);
      }
    }
    if (!missing.length) return found;
    try {
      if (this.runner === runHelper) await access(this.helperPath, constants.X_OK);
      const result = await this.runner(this.helperPath, missing);
      const names = result?.authorized && result.names && typeof result.names === 'object' ? result.names : {};
      for (const identifier of missing) {
        const name = String(names[identifier] || '').trim();
        this.cache.delete(identifier);
        this.cache.set(identifier, {
          name,
          expiresAt: now + (name ? POSITIVE_CACHE_MS : NEGATIVE_CACHE_MS)
        });
        if (name) found.set(identifier, name);
      }
      while (this.cache.size > MAX_CACHE_ENTRIES) this.cache.delete(this.cache.keys().next().value);
    } catch {
      // Contact enrichment is optional; Beeper's own label remains the honest fallback.
    }
    return found;
  }
}
