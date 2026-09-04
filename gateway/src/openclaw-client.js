import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createOpenClawDeviceAuthStore, OPENCLAW_SCOPES } from './openclaw-device-auth.js';

const MAX_SUMMARY = 620;

function plainText(value, limit = MAX_SUMMARY) {
  let text = String(value || '').replace(/```[a-z0-9_-]*\n?/gi, '').replace(/```/g, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '').replace(/^\s*[-*+]\s+/gm, '• ').replace(/[*_~`]/g, '')
    .replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  if (text.length > limit) text = `${text.slice(0, limit - 1).trimEnd()}…`;
  return text;
}

function approvalSummary(approval) {
  const request = approval && approval.request;
  const kind = plainText(approval?.approvalKind || approval?.kind || request?.kind || 'protected action', 50).replace(/\n/g, ' ');
  const detail = approval?.summary || approval?.command || approval?.rawCommand || approval?.description ||
    request?.summary || request?.command || request?.commandPreview || request?.rawCommand || request?.description || request?.title ||
    'Your OpenClaw agent wants to perform a protected action.';
  return plainText(`${kind}\n\n${detail}`);
}

function extractApprovals(result) {
  if (Array.isArray(result)) return result;
  return result && Array.isArray(result.approvals) ? result.approvals : [];
}

function readGatewayToken(configPath) {
  if (process.env.OPENCLAW_GATEWAY_TOKEN?.trim()) return process.env.OPENCLAW_GATEWAY_TOKEN.trim();
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const token = config?.gateway?.auth?.token;
  if (typeof token !== 'string' || !token.trim()) throw new Error('OpenClaw Gateway token is unavailable');
  return token.trim();
}

export function createOpenClawBridge(options = {}) {
  let client = null;
  let stopped = false;
  const configPath = options.configPath || process.env.BEEPSTER_OPENCLAW_CONFIG ||
    path.join(os.homedir(), '.openclaw', 'openclaw.json');
  const gatewayUrl = options.gatewayUrl || process.env.BEEPSTER_OPENCLAW_GATEWAY_URL || 'ws://127.0.0.1:18789';
  const deviceAuthStore = options.deviceAuthStore || createOpenClawDeviceAuthStore(options.deviceAuthOptions);
  const identity = deviceAuthStore.loadOrCreateDeviceIdentity();
  const storedAuth = deviceAuthStore.loadDeviceAuthToken({deviceId:identity.deviceId, role:'operator'});
  let connectionStatus = {state:'connecting', pairedTokenStored:Boolean(storedAuth)};

  const ready = (async () => {
    const [{GatewayClient}, {PROTOCOL_VERSION}, {readPairingConnectErrorDetails},
      {GATEWAY_CLIENT_CAPS, GATEWAY_CLIENT_MODES, GATEWAY_CLIENT_NAMES}] = await Promise.all([
      import('@openclaw/gateway-client'), import('@openclaw/gateway-protocol/version'),
      import('@openclaw/gateway-protocol/connect-error-details'), import('@openclaw/gateway-protocol/client-info')
    ]);
    const sharedToken = storedAuth ? undefined : readGatewayToken(configPath);
    await new Promise((resolve) => {
      let settled = false;
      client = new GatewayClient({url:gatewayUrl, token:sharedToken, deviceIdentity:identity,
        hostDeps:{signDevicePayload:deviceAuthStore.signDevicePayload,
          publicKeyRawBase64UrlFromPem:deviceAuthStore.publicKeyRawBase64UrlFromPem,
          loadDeviceAuthToken:deviceAuthStore.loadDeviceAuthToken,
          storeDeviceAuthToken:deviceAuthStore.storeDeviceAuthToken,
          clearDeviceAuthToken:deviceAuthStore.clearDeviceAuthToken},
        minProtocol:PROTOCOL_VERSION, maxProtocol:PROTOCOL_VERSION,
        clientName:GATEWAY_CLIENT_NAMES.GATEWAY_CLIENT, clientDisplayName:'Beepster Connector',
        clientVersion:'0.12.0', platform:process.platform, mode:GATEWAY_CLIENT_MODES.UI,
        role:'operator', scopes:[...OPENCLAW_SCOPES],
        caps:[GATEWAY_CLIENT_CAPS.APPROVALS, GATEWAY_CLIENT_CAPS.EXEC_APPROVALS],
        onHelloOk:() => { connectionStatus={state:'paired', pairedTokenStored:true}; if (!settled) { settled=true; resolve(); } },
        onConnectError:error => {
          const pairing = readPairingConnectErrorDetails(error?.details);
          connectionStatus = pairing ? {state:'pairing-required', pairedTokenStored:false, requestId:pairing.requestId || ''} :
            {state:'error', pairedTokenStored:Boolean(storedAuth)};
          if (!settled) { settled=true; resolve(); }
        }});
      client.start();
    });
  })();

  return {
    async request(method, params, requestOptions) {
      await ready;
      if (stopped || !client) throw new Error('OpenClaw Gateway client is stopped');
      if (connectionStatus.state !== 'paired') throw new Error('OpenClaw Gateway pairing is required');
      return client.request(method, params, requestOptions);
    },
    status() { return {...connectionStatus}; },
    stop() { stopped=true; if (client) client.stop(); }
  };
}

export function createOpenClawApprovalClient(options = {}) {
  const bridge = options.bridge || createOpenClawBridge(options);
  return {
    status() { return bridge.status(); },
    async listApprovals() {
      const [execResult, pluginResult] = await Promise.all([
        bridge.request('exec.approval.list', {}, {timeoutMs:5000}),
        bridge.request('plugin.approval.list', {}, {timeoutMs:5000})
      ]);
      return extractApprovals(execResult).concat(extractApprovals(pluginResult))
        .filter(item => item && item.id).slice(0, 20).map(item => ({
          id:String(item.id), kind:item.approvalKind === 'plugin' ? 'plugin' : 'exec', summary:approvalSummary(item),
          createdAt:Number(item.createdAtMs || item.createdAt || item.ts || 0),
          expiresAt:Number(item.expiresAtMs || item.expiresAt || 0)
        }));
    },
    async resolveApproval(id, decision) {
      if (decision !== 'allow-once' && decision !== 'deny') throw new Error('Only allow-once or deny is supported');
      const pending = await this.listApprovals();
      if (!pending.some(item => item.id === id)) throw new Error('The exact approval is no longer pending');
      const item = pending.find(item => item.id === id);
      await bridge.request(`${item.kind}.approval.resolve`, {id, decision}, {timeoutMs:15000});
      return {ok:true, decision};
    },
    stop() { bridge.stop(); }
  };
}

export const openClawHelpers = {plainText, approvalSummary, extractApprovals};
