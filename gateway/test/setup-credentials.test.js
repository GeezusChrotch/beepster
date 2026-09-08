import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readConfiguredSecret} from '../src/secret-store.js';

test('native cached setup credentials bypass helper access without ignoring explicit disable', async () => {
  for(const value of ['enabled','false','synthetic-token']) {
    assert.equal(await readConfiguredSecret('account','VARIABLE',{environment:{VARIABLE:value},reader:()=>{throw Error('must not launch helper');}}),value);
  }
  for(const environment of [{},{VARIABLE:''}]) {
    assert.equal(await readConfiguredSecret('account','VARIABLE',{environment,reader:async account=>{assert.equal(account,'account');return 'fallback';}}),'fallback');
  }
  const source=readFileSync(new URL('../src/agent-setup.js',import.meta.url),'utf8');
  assert.match(source,/readConfiguredSecret\('openclaw-enabled', 'BEEPSTER_OPENCLAW_ENABLED'\)/);
  assert.match(source,/readConfiguredSecret\('beeper-access-token', 'BEEPER_ACCESS_TOKEN'\)/);
});
