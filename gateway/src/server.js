import http from 'node:http';
import { BeeperClient } from './beeper-client.js';
import { configurationPage } from './configuration-page.js';
import { readSecret } from './secret-store.js';

const MAX_BODY_BYTES = 16 * 1024;

function sendJSON(response, status, body) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    'Cache-Control': 'no-store'
  });
  response.end(payload);
}

function sendHTML(response, status, body) {
  response.writeHead(status, {'Content-Type':'text/html; charset=utf-8','Content-Length':Buffer.byteLength(body),'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'"});
  response.end(body);
}

function sendPreview(response, preview) {
  response.writeHead(200, {
    'Content-Type': 'application/octet-stream',
    'Content-Length': preview.pixels.length,
    'Cache-Control': 'private, max-age=300',
    'X-Beepster-Width': String(preview.width),
    'X-Beepster-Height': String(preview.height),
    'X-Beepster-Kind': preview.kind
  });
  response.end(preview.pixels);
}

async function readJSON(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('Request body too large');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

function boundedLimit(value, fallback = 12) {
  const parsed = Number.parseInt(value || '', 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(1, Math.min(parsed, 50));
}

export function createServer({ beeperClient, gatewayToken, pairingCode = '' }) {
  if (!gatewayToken) throw new Error('gatewayToken is required');
  const cache = new Map();
  const replyRequests = new Map();
  let pairingAvailable = Boolean(pairingCode);

  async function withCache(key, loader) {
    try {
      const value = await loader();
      cache.set(key, { value, savedAt: Date.now() });
      return { value, stale: false };
    } catch (error) {
      const saved = cache.get(key);
      if (saved && Date.now() - saved.savedAt < 15 * 60 * 1000) return { value: saved.value, stale: true };
      throw error;
    }
  }

  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://127.0.0.1');
      if (url.pathname === '/health' && request.method === 'GET') {
        sendJSON(response, 200, { ok: true, service: 'beepster-gateway', beeperConfigured: Boolean(beeperClient) });
        return;
      }
      if (url.pathname === '/configure' && request.method === 'GET') {
        sendHTML(response, 200, configurationPage());
        return;
      }
      if (url.pathname === '/pair' && request.method === 'POST') {
        const body = await readJSON(request);
        if (!pairingAvailable || body.code !== pairingCode) {
          sendJSON(response, 403, { error: 'Pairing code is invalid' });
          return;
        }
        pairingAvailable = false;
        sendJSON(response, 200, { gatewayToken });
        return;
      }

      if (request.headers.authorization !== `Bearer ${gatewayToken}`) {
        sendJSON(response, 401, { error: 'Unauthorized' });
        return;
      }
      if (!beeperClient) {
        sendJSON(response, 503, { error: 'Beeper Desktop access is not configured on the Mac' });
        return;
      }

      if (url.pathname === '/v1/chats' && request.method === 'GET') {
        const cursor = url.searchParams.get('cursor') || '';
        const result = await withCache(`chats:${cursor}`, () => beeperClient.listChats(boundedLimit(url.searchParams.get('limit')), cursor));
        const page = Array.isArray(result.value) ? { items: result.value } : result.value;
        sendJSON(response, 200, { ...page, ...(result.stale ? { stale: true } : {}) });
        return;
      }

      const messagesMatch = url.pathname.match(/^\/v1\/chats\/([^/]+)\/messages$/);
      if (messagesMatch && request.method === 'GET') {
        const chatID = decodeURIComponent(messagesMatch[1]);
        const result = await withCache(`messages:${chatID}`, () => beeperClient.listMessages(chatID, boundedLimit(url.searchParams.get('limit'))));
        sendJSON(response, 200, { items: result.value, ...(result.stale ? { stale: true } : {}) });
        return;
      }

      if (messagesMatch && request.method === 'POST') {
        const chatID = decodeURIComponent(messagesMatch[1]);
        const body = await readJSON(request);
        const text = typeof body.text === 'string' ? body.text.trim() : '';
        const requestID = typeof body.requestID === 'string' ? body.requestID.trim() : '';
        if (!text || text.length > 1000 || !requestID || requestID.length > 80) {
          sendJSON(response, 400, { error: 'Reply requires text and a request ID' });
          return;
        }
        const duplicate = replyRequests.get(requestID);
        if (duplicate) {
          sendJSON(response, 202, { ...duplicate, duplicate: true });
          return;
        }
        const result = await beeperClient.sendReply(chatID, text);
        const accepted = { state: 'pending', pendingMessageID: result.pendingMessageID };
        replyRequests.set(requestID, accepted);
        if (replyRequests.size > 100) replyRequests.delete(replyRequests.keys().next().value);
        sendJSON(response, 202, accepted);
        return;
      }

      const messageStatusMatch = url.pathname.match(/^\/v1\/chats\/([^/]+)\/messages\/([^/]+)$/);
      if (messageStatusMatch && request.method === 'GET') {
        const status = await beeperClient.getMessageStatus(decodeURIComponent(messageStatusMatch[1]), decodeURIComponent(messageStatusMatch[2]));
        sendJSON(response, 200, status);
        return;
      }

      const attachmentMatch = url.pathname.match(/^\/v1\/attachments\/([a-f0-9]{24})\/preview$/);
      if (attachmentMatch && request.method === 'GET') {
        const preview = await beeperClient.getAttachmentPreview(attachmentMatch[1]);
        if (!preview) {
          sendJSON(response, 404, { error: 'Attachment is no longer available; reload the chat' });
          return;
        }
        sendPreview(response, preview);
        return;
      }

      sendJSON(response, 404, { error: 'Not found' });
    } catch (error) {
      sendJSON(response, 502, { error: 'Upstream request failed' });
    }
  });
}

export async function createConfiguredServer(environment = process.env) {
  const beeperToken = environment.BEEPER_ACCESS_TOKEN || await readSecret('beeper-access-token');
  const gatewayToken = environment.BEEPSTER_GATEWAY_TOKEN || await readSecret('gateway-token');
  const pairingCode = environment.BEEPSTER_PAIRING_CODE || await readSecret('pairing-code');
  if (!gatewayToken) throw new Error('BEEPSTER_GATEWAY_TOKEN is required');
  const client = beeperToken ? new BeeperClient({
    baseURL: environment.BEEPER_BASE_URL || 'http://127.0.0.1:23373',
    accessToken: beeperToken
  }) : null;
  return createServer({ beeperClient: client, gatewayToken, pairingCode });
}
