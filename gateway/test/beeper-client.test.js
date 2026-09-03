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

test('smart punctuation stays in the selected theme font', () => {
  assert.equal(normalizeEmojiForPebble('“Hello”—it’s fine… • yes'), '"Hello"-it\'s fine... * yes');
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
  assert.equal(messages.items[0].text, 'Earlier');
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

test('raw Apple identifiers can be enriched from read-only macOS Contacts', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/contacts/list')) return new Response(JSON.stringify({items:[]}), {status:200});
    return new Response(JSON.stringify({items:[{
      id:'chat-apple',accountID:'imessage',network:'iMessage',type:'single',title:'person@example.com',
      participants:{items:[{id:'person-apple',email:'person@example.com',isSelf:false}]}
    }]}), {status:200});
  };
  const contactResolver = {lookup: async (identifiers) => {
    assert.deepEqual(identifiers, ['person@example.com', 'person@example.com']);
    return new Map([['person@example.com', 'Local Contact Name']]);
  }};
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl,contactResolver});
  assert.equal((await client.listChats(12)).items[0].name, 'Local Contact Name');
});

test('separate Apple email and phone threads expose an opaque shared contact group', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/contacts/list')) return new Response(JSON.stringify({items:[]}), {status:200});
    return new Response(JSON.stringify({items:[
      {id:'chat-email',accountID:'imessage',network:'iMessage',type:'single',title:'person@example.com',participants:{items:[{email:'person@example.com',isSelf:false}]}},
      {id:'chat-phone',accountID:'imessage',network:'iMessage',type:'single',title:'+15550101000',participants:{items:[{phoneNumber:'+15550101000',isSelf:false}]}}
    ]}), {status:200});
  };
  const contactResolver = {lookupDetails: async () => ({
    names:new Map([['person@example.com','Readable Name'],['5550101000','Readable Name']]),
    contactKeys:new Map([['person@example.com','opaque-contact'],['5550101000','opaque-contact']])
  })};
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl,contactResolver});
  const chats = (await client.listChats(12)).items;
  assert.deepEqual(chats.map((chat) => [chat.id,chat.name,chat.contactGroup]), [
    ['chat-email','Readable Name (email)','opaque-contact'],['chat-phone','Readable Name (phone)','opaque-contact']
  ]);
});

test('Apple contact identity is resolved even when Beeper already supplies a display name', async () => {
  const fetchImpl = async (url) => {
    if (url.includes('/contacts/list')) return new Response(JSON.stringify({items:[]}), {status:200});
    return new Response(JSON.stringify({items:[{
      id:'chat-apple',accountID:'imessage',network:'iMessage',type:'single',title:'Beeper Name',
      participants:{items:[{email:'person@example.com',fullName:'Beeper Name',isSelf:false}]}
    }]}), {status:200});
  };
  const contactResolver = {lookupDetails: async (identifiers) => {
    assert.deepEqual(identifiers, ['person@example.com']);
    return {names:new Map([['person@example.com','Mac Name']]),
      contactKeys:new Map([['person@example.com','opaque-contact']])};
  }};
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl,contactResolver});
  assert.equal((await client.listChats(12)).items[0].contactGroup, 'opaque-contact');
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

test('message pages retain the full API page while enforcing a watch-safe ceiling', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({items:Array.from({length:80}, (_, index) => ({id:`m${index}`,text:`message ${index}`}))}), {status:200});
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  const messages = await client.listMessages('chat-1', 12);
  assert.equal(messages.items.length, 60);
});

test('message pagination advances through older pages with the opaque cursor', async () => {
  const paths = [];
  const fetchImpl = async (url) => {
    paths.push(new URL(url).pathname + new URL(url).search);
    return new Response(JSON.stringify({items:[],hasMore:true,oldestCursor:'older opaque'}), {status:200});
  };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  const page = await client.listMessages('chat-1', 12, 'current opaque');
  assert.equal(page.hasMore, true);
  assert.equal(page.nextCursor, 'older opaque');
  assert.equal(paths[0], '/v1/chats/chat-1/messages?limit=12&cursor=current%20opaque&direction=after');
});

test('a resolved sent message without optional sendStatus is successful', async () => {
  const fetchImpl = async () => new Response(JSON.stringify({
    id: 'message-final',
    isSender: true,
    text: 'Sent from the watch'
  }), {status:200});
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  assert.deepEqual(await client.getMessageStatus('chat-1', 'pending-1'), {
    id:'message-final', status:'SUCCESS', reason:''
  });
});

test('an outgoing message can confirm a send when an iMessage pending ID never resolves', async () => {
  const sentAfter = Date.parse('2026-09-03T03:00:00Z');
  const fetchImpl = async () => new Response(JSON.stringify({items:[
    {id:'incoming-copy',isSender:false,text:'Yes',timestamp:'2026-09-03T03:00:02Z'},
    {id:'outgoing-new',isSender:true,text:'Yes',timestamp:'2026-09-03T03:00:01Z'},
    {id:'outgoing-old',isSender:true,text:'Yes',timestamp:'2026-09-03T02:59:59Z'}
  ]}), {status:200});
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  assert.deepEqual(await client.findSentReply('chat-1', 'Yes', sentAfter), {
    id:'outgoing-new',status:'SUCCESS',reason:''
  });
});

test('the default local API address recovers when Beeper selects its next port', async () => {
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    requests.push({port:parsed.port,path:parsed.pathname,authorization:options.headers?.Authorization || ''});
    if (parsed.pathname === '/v1/info') {
      if (parsed.port === '23374') {
        return new Response(JSON.stringify({app:{name:'Beeper'},server:{status:'running'}}), {status:200});
      }
      return new Response('', {status:404});
    }
    if (parsed.port === '23373') throw new TypeError('connection refused');
    return new Response(JSON.stringify({items:[]}), {status:200});
  };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:23373',accessToken:'secret',fetchImpl});
  assert.deepEqual((await client.listChats(12)).items, []);
  assert.equal(client.baseURL, 'http://127.0.0.1:23374');
  assert.ok(requests.some((request) => request.port === '23374' && request.path === '/v1/info'));
  assert.ok(requests.some((request) => request.port === '23374' &&
    request.path === '/v1/chats/search' && request.authorization === 'Bearer secret'));
});

test('an explicit custom API address is never silently replaced', async () => {
  const fetchImpl = async () => { throw new TypeError('connection refused'); };
  const client = new BeeperClient({baseURL:'http://127.0.0.1:24444',accessToken:'secret',fetchImpl});
  await assert.rejects(() => client.listChats(12), /connection refused/);
  assert.equal(client.baseURL, 'http://127.0.0.1:24444');
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
  assert.equal(messages.items[0].attachment.kind, 'gif');
  assert.doesNotMatch(messages.items[0].attachment.id, /private/);
  const preview = await client.getAttachmentPreview(messages.items[0].attachment.id);
  const cachedPreview = await client.getAttachmentPreview(messages.items[0].attachment.id);
  assert.equal(preview.kind, 'gif');
  assert.deepEqual([...preview.pixels], [0xc0,0xff]);
  assert.equal(cachedPreview, preview);
  assert.equal(paths.filter((path) => path.startsWith('/v1/assets/serve')).length, 1);
  assert.ok(convertedInput);
  assert.match(paths[1], /^\/v1\/assets\/serve\?url=mxc%3A%2F%2Fprivate%2Fmedia$/);
});
