import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { constants } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

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

function runHelper(helperPath, identifiers) {
  return new Promise((resolve, reject) => {
    const child = spawn(helperPath, ['--lookup'], { stdio: ['pipe', 'pipe', 'pipe'] });
    const stdout = [];
    const stderr = [];
    let outputBytes = 0;
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('Contacts lookup timed out'));
    }, 5000);
    child.stdout.on('data', (chunk) => {
      outputBytes += chunk.length;
      if (outputBytes <= 256 * 1024) stdout.push(chunk);
      else child.kill();
    });
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(Buffer.concat(stderr).toString('utf8').trim() || `Contacts helper exited with ${code}`));
        return;
      }
      try { resolve(JSON.parse(Buffer.concat(stdout).toString('utf8'))); }
      catch { reject(new Error('Contacts helper returned invalid data')); }
    });
    child.stdin.end(JSON.stringify({ identifiers }));
  });
}

export class MacContactsResolver {
  constructor({
    helperPath = join(homedir(), 'Library/Application Support/Beepster/bin/Beepster Contacts.app/Contents/MacOS/beepster-contacts'),
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
