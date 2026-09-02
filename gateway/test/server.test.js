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
    assert.match(html, /New custom theme/);
    assert.match(html, /Built-in themes cannot be deleted/);
    assert.match(html, /type="color"/);
    assert.match(html, /Roboto Condensed/);
    assert.match(html, /Pebble Bold/);
    assert.match(html, /Add up to eight replies/);
    assert.match(html, /quickReply.*maxLength=240/);
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

test('reply requests are idempotent and expose delivery status', async () => {
  let sends = 0;
  const client = {
    sendReply: async () => { sends++; return {pendingMessageID:'pending-1'}; },
    getMessageStatus: async () => ({id:'message-1',status:'SUCCESS',reason:''})
  };
  await withServer(client, async (baseURL) => {
    const options = {method:'POST',headers:{Authorization:'Bearer gateway-secret','Content-Type':'application/json'},body:JSON.stringify({text:'Yes',requestID:'watch-1'})};
    const first = await fetch(`${baseURL}/v1/chats/chat-1/messages`, options);
    assert.deepEqual(await first.json(), {state:'pending',pendingMessageID:'pending-1'});
    const duplicate = await fetch(`${baseURL}/v1/chats/chat-1/messages`, options);
    assert.equal((await duplicate.json()).duplicate, true);
    assert.equal(sends, 1);
    const status = await fetch(`${baseURL}/v1/chats/chat-1/messages/pending-1`, {headers:{Authorization:'Bearer gateway-secret'}});
    assert.equal((await status.json()).status, 'SUCCESS');
  });
});

test('attachment previews require authentication and return dimensions without source paths', async () => {
  const client = {
    getAttachmentPreview: async (id) => id === 'aaaaaaaaaaaaaaaaaaaaaaaa' ?
      {width:2,height:1,kind:'image',pixels:Buffer.from([0xc0,0xff])} : null
  };
  await withServer(client, async (baseURL) => {
    const path = `${baseURL}/v1/attachments/aaaaaaaaaaaaaaaaaaaaaaaa/preview`;
    assert.equal((await fetch(path)).status, 401);
    const response = await fetch(path, {headers:{Authorization:'Bearer gateway-secret'}});
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-beepster-width'), '2');
    assert.equal(response.headers.get('x-beepster-kind'), 'image');
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0xc0,0xff]);
  });
});
