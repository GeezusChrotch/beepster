import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../../src/pkjs/index.js', import.meta.url), 'utf8');

function replyRuntime() {
  const requests = [];
  const timers = [];
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
    Pebble: { addEventListener() {}, sendAppMessage() {}, openURL() {} },
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
  return { context, requests, timers };
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
