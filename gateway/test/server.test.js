import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from '../src/server.js';

async function withServer(client, callback) {
  const server = createServer({ beeperClient: client, gatewayToken: 'gateway-secret' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    await callback(`http://127.0.0.1:${address.port}`);
  } finally {
    server.close();
    await once(server, 'close');
  }
}

test('health is public but chat data requires gateway authentication', async () => {
  await withServer({ listChats: async () => [] }, async (baseURL) => {
    assert.equal((await fetch(`${baseURL}/health`)).status, 200);
    assert.equal((await fetch(`${baseURL}/v1/chats`)).status, 401);
    const authorized = await fetch(`${baseURL}/v1/chats`, {
      headers: { Authorization: 'Bearer gateway-secret' }
    });
    assert.equal(authorized.status, 200);
    assert.deepEqual(await authorized.json(), { items: [] });
  });
});

test('configuration page supports editing an existing paired connection', async () => {
  await withServer({ listChats: async () => [] }, async (baseURL) => {
    const html = await (await fetch(`${baseURL}/configure`)).text();
    assert.match(html, /Adjust Beepster without pairing again/);
    assert.match(html, /location\.hash/);
    assert.match(html, /Saved connection failed/);
  });
});

test('pairing requires the exact code and returns only the gateway credential', async () => {
  const server = createServer({ beeperClient: {}, gatewayToken: 'gateway-secret', pairingCode: '246810' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const baseURL = `http://127.0.0.1:${server.address().port}`;
    const denied = await fetch(`${baseURL}/pair`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({code:'bad'})});
    assert.equal(denied.status, 403);
    const paired = await fetch(`${baseURL}/pair`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({code:'246810'})});
    assert.deepEqual(await paired.json(), { gatewayToken: 'gateway-secret' });
    const reused = await fetch(`${baseURL}/pair`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({code:'246810'})});
    assert.equal(reused.status, 403);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('the first milestone is read-only', async () => {
  const client = { listMessages: async () => [] };
  await withServer(client, async (baseURL) => {
    const response = await fetch(`${baseURL}/v1/chats/chat-1/messages`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer gateway-secret',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text: 'Yes' })
    });
    assert.equal(response.status, 404);
  });
});
