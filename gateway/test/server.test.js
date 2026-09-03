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
    assert.match(html, /The saved pairing expired/);
    assert.match(html, /requirePairing/);
    assert.match(html, /New custom theme/);
    assert.match(html, /Built-in themes cannot be deleted/);
    assert.match(html, /type="color"/);
    assert.match(html, /Inter/);
    assert.match(html, /Open Sans/);
    assert.match(html, /Montserrat/);
    assert.match(html, /Poppins/);
    assert.match(html, /Font size/);
    for (const size of [14, 18, 22, 26, 30]) {
      assert.match(html, new RegExp(`value="${size}"`));
    }
    assert.match(html, /Add up to eight replies/);
    assert.match(html, /quickReply.*maxLength=240/);
    assert.match(html, /Included services/);
    assert.match(html, /Apple Messages/);
    assert.match(html, /Beeper \/ Matrix/);
    assert.match(html, /Other services/);
    assert.match(html, /services:services/);
    assert.match(html, /Link Apple conversations/);
    assert.match(html, /appleCandidates/);
    assert.match(html, /appleAliases:savedAppleAliases/);
  });
});

test('message history pagination forwards the opaque cursor', async () => {
  let receivedCursor = null;
  const client = {
    listMessages: async (chatID, limit, cursor) => {
      receivedCursor = cursor;
      return {items:[{id:'older-1'}],hasMore:true,nextCursor:'next opaque'};
    }
  };
  await withServer(client, async (baseURL) => {
    const response = await fetch(`${baseURL}/v1/chats/chat-1/messages?limit=12&cursor=current%20opaque`, {
      headers:{Authorization:'Bearer gateway-secret'}
    });
    assert.equal(receivedCursor, 'current opaque');
    assert.deepEqual(await response.json(), {items:[{id:'older-1'}],hasMore:true,nextCursor:'next opaque'});
  });
});

test('pairing requires the exact code and returns only the gateway credential', async () => {
  let rotations = 0;
  const server = createServer({
    beeperClient: {},
    gatewayToken: 'gateway-secret',
    pairingCode: '246810',
    rotatePairingCode: async () => {
      rotations++;
      return '135790';
    }
  });
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
    const next = await fetch(`${baseURL}/pair`, {method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({code:'135790'})});
    assert.equal(next.status, 200);
    assert.equal(rotations, 2);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('pairing never releases the gateway credential unless the consumed code is rotated', async () => {
  const server = createServer({
    beeperClient: {},
    gatewayToken: 'gateway-secret',
    pairingCode: '246810',
    rotatePairingCode: async () => ''
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const baseURL = `http://127.0.0.1:${server.address().port}`;
    const response = await fetch(`${baseURL}/pair`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body:JSON.stringify({code:'246810'})
    });
    assert.equal(response.status, 503);
    assert.doesNotMatch(await response.text(), /gateway-secret/);
  } finally {
    server.close();
    await once(server, 'close');
  }
});

test('reply requests are idempotent and expose delivery status', async () => {
  let sends = 0;
  let finishSend;
  const client = {
    sendReply: async () => {
      sends++;
      await new Promise((resolve) => { finishSend = resolve; });
      return {pendingMessageID:'pending-1'};
    },
    getMessageStatus: async () => ({id:'message-1',status:'SUCCESS',reason:''})
  };
  await withServer(client, async (baseURL) => {
    const options = {method:'POST',headers:{Authorization:'Bearer gateway-secret','Content-Type':'application/json'},body:JSON.stringify({text:'Yes',requestID:'watch-1'})};
    const firstRequest = fetch(`${baseURL}/v1/chats/chat-1/messages`, options);
    const duplicateRequest = fetch(`${baseURL}/v1/chats/chat-1/messages`, options);
    while (sends === 0) await new Promise((resolve) => setImmediate(resolve));
    finishSend();
    const replies = await Promise.all([firstRequest, duplicateRequest]);
    const bodies = await Promise.all(replies.map((reply) => reply.json()));
    assert.equal(bodies.filter((body) => body.duplicate).length, 1);
    assert.ok(bodies.every((body) => body.state === 'pending' && body.pendingMessageID === 'pending-1'));
    assert.equal(sends, 1);
    const status = await fetch(`${baseURL}/v1/chats/chat-1/messages/pending-1`, {headers:{Authorization:'Bearer gateway-secret'}});
    assert.equal((await status.json()).status, 'SUCCESS');
  });
});

test('reply status reconciles against outgoing history when Beeper loses its pending ID', async () => {
  let reconciled = null;
  const client = {
    sendReply: async () => ({pendingMessageID:'missing-pending-id'}),
    getMessageStatus: async () => { throw new Error('GET failed with HTTP 404'); },
    findSentReply: async (chatID, text, sentAfter) => {
      reconciled = {chatID,text,sentAfter};
      return {id:'outgoing-message',status:'SUCCESS',reason:''};
    }
  };
  await withServer(client, async (baseURL) => {
    const sent = await fetch(`${baseURL}/v1/chats/chat-1/messages`, {
      method:'POST',
      headers:{Authorization:'Bearer gateway-secret','Content-Type':'application/json'},
      body:JSON.stringify({text:'On my way',requestID:'watch-reconcile-1'})
    });
    assert.equal(sent.status, 202);
    const status = await fetch(`${baseURL}/v1/chats/chat-1/messages/missing-pending-id`, {
      headers:{Authorization:'Bearer gateway-secret'}
    });
    assert.deepEqual(await status.json(), {id:'outgoing-message',status:'SUCCESS',reason:''});
    assert.equal(reconciled.chatID, 'chat-1');
    assert.equal(reconciled.text, 'On my way');
    assert.ok(Number.isFinite(reconciled.sentAfter));
  });
});

test('watch replies support an authenticated no-store GET compatibility fallback', async () => {
  const client = {
    sendReply: async (chatID, text) => ({pendingMessageID:`pending-${chatID}-${text.length}`})
  };
  await withServer(client, async (baseURL) => {
    const response = await fetch(`${baseURL}/v1/chats/chat-1/reply`, {
      headers:{
        Authorization:'Bearer gateway-secret',
        'X-Beepster-Reply-Text':encodeURIComponent('Yes 👍'),
        'X-Beepster-Request-ID':'watch-header-1'
      }
    });
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await response.json(), {state:'pending',pendingMessageID:'pending-chat-1-6'});
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
    assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],
      [0x42,0x50,1,2,1,1,0xc0,0xff]);

    const jsonResponse = await fetch(`${path}?format=json`,
      {headers:{Authorization:'Bearer gateway-secret'}});
    assert.deepEqual(await jsonResponse.json(),
      {width:2,height:1,kind:'image',pixels:'wP8='});
  });
});
