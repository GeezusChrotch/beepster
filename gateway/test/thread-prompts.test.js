import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,stat,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {saveThreadPrompt,promptViews,revision} from '../src/thread-prompts.js';
import {promptForSession} from '../integrations/openclaw/organik-thread-prompts/index.js';

test('thread prompts preserve other links, reject stale writes, disable/relink safely and remove overrides',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'organik-prompts-'));
 try {
 const file=path.join(dir,'thread-prompts.json'),linksFile=path.join(dir,'agent-links.json');
 const a={provider:'openclaw',sessionKey:'agent:main:telegram:direct:123',chatID:'chat-a',enabled:true};
 const b={provider:'hermes',sessionKey:'agent:telegram:dm:456',chatID:'chat-b',enabled:true};
 await writeFile(linksFile,JSON.stringify({links:[a,b]}));
 await saveThreadPrompt({...a,text:'Concise please',revision:revision('')},{file,linksFile});
 await saveThreadPrompt({...b,text:'Hermes only',revision:revision('')},{file,linksFile});
 assert.equal(promptForSession(a.sessionKey,dir),'Concise please');
 assert.equal(promptForSession(b.sessionKey,dir),'');
 assert.equal(promptForSession('agent:other:telegram:direct:123',dir),'');
 await assert.rejects(saveThreadPrompt({...a,text:'stale',revision:revision('')},{file,linksFile}),/PROMPT_CHANGED/);
 await writeFile(linksFile,JSON.stringify({links:[{...a,enabled:false},b]}));
 assert.equal(promptForSession(a.sessionKey,dir),'');
 await assert.rejects(saveThreadPrompt({...a,text:'disabled',revision:revision('Concise please')},{file,linksFile}),/PROMPT_LINK_CHANGED/);
 await writeFile(linksFile,JSON.stringify({links:[{...a,chatID:'new-chat'},b]}));
 assert.equal(promptForSession(a.sessionKey,dir),'');
 await writeFile(linksFile,JSON.stringify({links:[a,b]}));
 await saveThreadPrompt({...a,text:'',revision:revision('Concise please')},{file,linksFile});
 assert.equal(promptForSession(a.sessionKey,dir),'');
 assert.equal((await promptViews([b],file))[0].text,'Hermes only');
 assert.equal((await stat(file)).mode&0o777,0o600);
 await assert.rejects(saveThreadPrompt({...a,text:'x'.repeat(12001),revision:revision('')},{file,linksFile}),/PROMPT_INVALID/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
