import test from 'node:test';
import assert from 'node:assert/strict';
import { BeeperClient, resolveChatName } from '../src/beeper-client.js';
import { normalizeEmojiForPebble } from '../src/emoji.js';

test('direct chats prefer a non-self participant full name', () => {
  const chat = {
    type: 'single',
    title: '+15550101002',
    participants: {
      items: [
        { isSelf: true, fullName: 'Me' },
        { isSelf: false, fullName: 'Readable Name', phoneNumber: '+15550101002' }
      ]
    }
  };
  assert.equal(resolveChatName(chat), 'Readable Name');
});

test('contact resolution falls back honestly', () => {
  assert.equal(resolveChatName({ type: 'single', title: 'raw-handle' }), 'raw-handle');
  assert.equal(resolveChatName({ type: 'single' }), 'Unknown contact');
});

test('supported emoji survive while unsupported emoji get meaningful fallbacks', () => {
  assert.equal(normalizeEmojiForPebble('Yes 👍❤️😂'), 'Yes 👍❤😂');
  assert.equal(normalizeEmojiForPebble('Thinking 🤔 then launch 🚀'), 'Thinking [thinking] then launch [rocket]');
  assert.equal(normalizeEmojiForPebble('Thanks 👍🏽'), 'Thanks 👍');
  assert.equal(normalizeEmojiForPebble('Family 👨‍👩‍👧 and flag 🇺🇸'), 'Family [emoji] and flag [flag]');
});

test('chat and message requests are bounded and normalized', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname + new URL(url).search);
    if (url.includes('/messages')) {
      return new Response(JSON.stringify({ items: [
        { id: 'm2', isSender: true, text: 'Later', timestamp: '2026-09-02T12:02:00Z' },
        { id: 'm1', senderName: 'Readable Name', text: 'Earlier', timestamp: '2026-09-02T12:01:00Z' }
      ] }), { status: 200 });
    }
    return new Response(JSON.stringify({ items: [{
      id: 'chat-1', type: 'single', title: 'raw', network: 'iMessage', unreadCount: 2,
      participants: { items: [{ isSelf: false, fullName: 'Readable Name' }] },
      preview: { text: 'Hello' }
    }] }), { status: 200 });
  };
  const client = new BeeperClient({ baseURL: 'http://127.0.0.1:23373', accessToken: 'secret', fetchImpl });
  const chats = await client.listChats(12);
  const messages = await client.listMessages('chat-1', 12);
  assert.equal(chats[0].name, 'Readable Name');
  assert.equal(messages[0].text, 'Earlier');
  assert.deepEqual(paths, ['/v1/chats/search?limit=12&type=any&inbox=primary', '/v1/chats/chat-1/messages?limit=12']);
});

test('missing participant names can be filled from the account contact list', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/contacts/list')) return new Response(JSON.stringify({items:[{id:'person-1',fullName:'Contact Book Name'}]}), {status:200});
    return new Response(JSON.stringify({items:[{id:'chat-1',accountID:'signal',type:'single',title:'raw-handle',participants:{items:[{id:'person-1',isSelf:false}]}}]}), {status:200});
  };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  assert.equal((await client.listChats(12))[0].name, 'Contact Book Name');
});
