import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../src/pkjs/index.js', import.meta.url), 'utf8');

function replyRuntime({ autoAck = true } = {}) {
  const requests = [];
  const timers = [];
  const appMessages = [];
  const storage = new Map([
    ['beepster_gateway_url', 'https://gateway.example'],
    ['beepster_gateway_token', 'gateway-secret']
  ]);

  class FakeXHR {
    constructor() {
      this.headers = {};
      requests.push(this);
    }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    send(body) { this.body = body; }
  }

  const context = {
    XMLHttpRequest: FakeXHR,
    Pebble: {
      addEventListener() {},
      sendAppMessage(message, success) { appMessages.push(message); if (autoAck && success) success(); },
      openURL() {}
    },
    localStorage: {
      getItem(key) { return storage.get(key) || null; },
      setItem(key, value) { storage.set(key, String(value)); }
    },
    console: { log() {} },
    setTimeout(callback, delay) { timers.push({ callback, delay }); return timers.length; },
    clearTimeout() {},
    Uint8Array
  };
  vm.runInNewContext(source, context);
  return { context, requests, timers, appMessages, storage };
}

test('watch replies use canonical authenticated JSON POST first', () => {
  const { context, requests } = replyRuntime();
  let response;
  context.sendRequest('/v1/chats/chat-1/messages', {text:'Yes',requestID:'watch-1'}, (value) => { response = value; });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].method, 'POST');
  assert.equal(requests[0].url, 'https://gateway.example/v1/chats/chat-1/messages');
  assert.equal(requests[0].headers.Authorization, 'Bearer gateway-secret');
  assert.equal(requests[0].headers['Content-Type'], 'application/json');
  assert.equal(requests[0].body, JSON.stringify({text:'Yes',requestID:'watch-1'}));
  requests[0].status = 202;
  requests[0].responseText = JSON.stringify({pendingMessageID:'pending-1'});
  requests[0].onload();
  assert.equal(response.pendingMessageID, 'pending-1');
});

test('full message detail packets stay tagged to their originating message', () => {
  const { context, appMessages } = replyRuntime();
  context.messageTextByID['message-1'] = 'A'.repeat(900) + ' 👍';
  context.sendMessageDetail('message-1');
  assert.equal(appMessages[0][0], 'message_detail_start');
  assert.equal(appMessages[0][30], 'message-1');
  assert.ok(appMessages[0][4] > 900);
  assert.ok(appMessages.slice(1, -1).every((message) =>
    message[0] === 'message_detail_chunk' && message[30] === 'message-1'));
  assert.equal(appMessages.at(-1)[0], 'message_detail_end');
  assert.equal(appMessages.at(-1)[30], 'message-1');
});

test('inline photo packets stay tagged to their originating attachment', () => {
  const { context, requests, appMessages } = replyRuntime();
  context.loadAttachment('attachment-1');
  const xhr = requests[0];
  xhr.status = 200;
  xhr.responseText = JSON.stringify({width:2,height:1,kind:'image',pixels:'wP8='});
  xhr.onload();
  assert.deepEqual(appMessages.map((message) => message[0]), ['media_start','media_chunk','media_end']);
  assert.ok(appMessages.every((message) => message[23] === 'attachment-1'));
  assert.deepEqual(Array.from(appMessages[1][28]), [0xc0,0xff]);
});

test('a stalled POST falls back to the same idempotent request over GET', () => {
  const { context, requests, timers } = replyRuntime();
  const responses = [];
  context.sendRequest('/v1/chats/chat-1/messages', {text:'Yes 👍',requestID:'watch-2'}, (value) => responses.push(value));
  timers.find((timer) => timer.delay === 5000).callback();
  assert.equal(requests.length, 2);
  assert.equal(requests[1].method, 'GET');
  assert.equal(requests[1].url, 'https://gateway.example/v1/chats/chat-1/reply');
  assert.equal(requests[1].headers['X-Beepster-Reply-Text'], encodeURIComponent('Yes 👍'));
  assert.equal(requests[1].headers['X-Beepster-Request-ID'], 'watch-2');
  requests[1].status = 202;
  requests[1].responseText = JSON.stringify({pendingMessageID:'pending-2'});
  requests[1].onload();
  requests[0].status = 202;
  requests[0].responseText = JSON.stringify({pendingMessageID:'pending-2'});
  requests[0].onload();
  assert.equal(responses.length, 1);
  assert.equal(responses[0].pendingMessageID, 'pending-2');
});

test('theme data is sent once instead of reloading fonts for every state', () => {
  const { context, appMessages } = replyRuntime();
  context.sendState('loading');
  context.sendState('ready');
  assert.equal(appMessages[0][13], 'classic');
  assert.equal(appMessages[0][22], 5);
  assert.equal(appMessages[0][34], 22);
  assert.equal(appMessages[1][13], undefined);
  assert.equal(appMessages[1][22], undefined);
  assert.equal(appMessages[1][34], undefined);
});

test('service aliases normalize to stable filter IDs', () => {
  const { context } = replyRuntime();
  assert.equal(context.serviceID('iMessage'), 'apple_messages');
  assert.equal(context.serviceID('Beeper (Matrix)'), 'beeper');
  assert.equal(context.serviceID('X (Twitter)'), 'x');
  assert.equal(context.serviceID('A future network'), 'other');
});

test('a saved service filter requests a wider page and sends only included chats', () => {
  const { context, requests, appMessages, storage } = replyRuntime();
  storage.set('beepster_services', JSON.stringify(['apple_messages']));
  context.loadChats();
  assert.equal(requests[0].url, 'https://gateway.example/v1/chats?limit=50');
  requests[0].status = 200;
  requests[0].responseText = JSON.stringify({items:[
    {id:'apple-1',name:'Apple person',preview:'Hello',network:'iMessage'},
    {id:'discord-1',name:'Discord person',preview:'Hi',network:'Discord'}
  ]});
  requests[0].onload();
  const chats = appMessages.filter((message) => message[0] === 'chat');
  assert.equal(chats.length, 1);
  assert.equal(chats[0][5], 'apple-1');
  assert.equal(appMessages.at(-1)[0], 'chats_ready');
  assert.equal(appMessages.at(-1)[4], 1);
});

test('a late response from an abandoned chat cannot replace the active thread', () => {
  const { context, requests, appMessages } = replyRuntime();
  context.loadMessages('chat-old');
  context.loadMessages('chat-current');
  requests[0].status = 200;
  requests[0].responseText = JSON.stringify({items:[{id:'old-message',text:'stale'}]});
  requests[0].onload();
  requests[1].status = 200;
  requests[1].responseText = JSON.stringify({items:[{id:'current-message',text:'current'}]});
  requests[1].onload();
  const messagePackets = appMessages.filter((message) => message[0] === 'message');
  assert.deepEqual(messagePackets.map((message) => message[30]), ['current-message']);
});

test('new message detail discards unsent chunks for the previous selection', () => {
  const { context } = replyRuntime({autoAck:false});
  context.messageTextByID.old = 'A'.repeat(1600);
  context.messageTextByID.current = 'Newest selection';
  context.sendMessageDetail('old');
  context.sendMessageDetail('current');
  assert.equal(context.queue[0].message[30], 'old');
  assert.ok(context.queue.slice(1).every((item) => item.message[30] === 'current'));
  assert.equal(context.queue.at(-1).message[0], 'message_detail_end');
});
