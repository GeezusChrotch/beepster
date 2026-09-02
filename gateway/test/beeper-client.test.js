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
  const page = await client.listChats(12);
  const chats = page.items;
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
  assert.equal((await client.listChats(12)).items[0].name, 'Contact Book Name');
});

test('chat pagination forwards opaque cursors and returns the oldest cursor', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname + new URL(url).search);
    return new Response(JSON.stringify({items:[],hasMore:true,oldestCursor:'opaque next'}), {status:200});
  };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  const page = await client.listChats(12, 'opaque current');
  assert.equal(page.hasMore, true);
  assert.equal(page.nextCursor, 'opaque next');
  assert.equal(paths[0], '/v1/chats/search?limit=12&type=any&inbox=primary&cursor=opaque%20current&direction=before');
});

test('message results are bounded even when Beeper returns too many items', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({items:Array.from({length:20}, (_, index) => ({id:`m${index}`,text:`message ${index}`}))}), {status:200});
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  const messages = await client.listMessages('chat-1', 12);
  assert.equal(messages.length, 12);
});

test('attachments use opaque IDs and can produce watch-native previews', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname + new URL(url).search);
    if (url.includes('/assets/serve')) return new Response(Buffer.from([1, 2, 3]), {status:200});
    return new Response(JSON.stringify({items:[{
      id:'message-private',text:'A photo',attachments:[{
        id:'attachment-private',type:'img',mimeType:'image/gif',isGif:true,srcURL:'mxc://private/media'
      }]
    }]}), {status:200});
  };
  let convertedInput = null;
  const previewCreator = async (inputPath) => {
    convertedInput = inputPath;
    return {width:2,height:1,pixels:Buffer.from([0xc0,0xff])};
  };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl,previewCreator});
  const messages = await client.listMessages('chat-1', 12);
  assert.equal(messages[0].attachment.kind, 'gif');
  assert.doesNotMatch(messages[0].attachment.id, /private/);
  const preview = await client.getAttachmentPreview(messages[0].attachment.id);
  assert.equal(preview.kind, 'gif');
  assert.deepEqual([...preview.pixels], [0xc0,0xff]);
  assert.ok(convertedInput);
  assert.match(paths[1], /^\/v1\/assets\/serve\?url=mxc%3A%2F%2Fprivate%2Fmedia$/);
});
