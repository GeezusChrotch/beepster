import test from 'node:test';
import assert from 'node:assert/strict';
import { MacContactsResolver, normalizeContactIdentifier } from '../src/contact-resolver.js';

test('contact identifiers normalize emails and North American phone numbers', () => {
  assert.equal(normalizeContactIdentifier('MAILTO:Person@Example.COM'), 'person@example.com');
  assert.equal(normalizeContactIdentifier('+1 (555) 010-1000'), '5550101000');
  assert.equal(normalizeContactIdentifier('not a contact'), '');
});

test('macOS contact names are cached without exposing the address book', async () => {
  let calls = 0;
  const resolver = new MacContactsResolver({runner: async (_helper, identifiers) => {
    calls++;
    assert.deepEqual(identifiers, ['person@example.com']);
    return {authorized:true,names:{'person@example.com':'Readable Name'}};
  }});
  assert.equal((await resolver.lookup(['Person@Example.com'])).get('person@example.com'), 'Readable Name');
  assert.equal((await resolver.lookup(['person@example.com'])).get('person@example.com'), 'Readable Name');
  assert.equal(calls, 1);
});

test('denied Contacts access falls back quietly', async () => {
  const resolver = new MacContactsResolver({runner: async () => ({authorized:false,names:{}})});
  assert.deepEqual([...(await resolver.lookup(['person@example.com']))], []);
});
