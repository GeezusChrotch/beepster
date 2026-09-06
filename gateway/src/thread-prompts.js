import { readFile, mkdir, writeFile, rename, copyFile, open, unlink } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readAgentLinks } from './agent-settings.js';
export const promptFile = path.join(os.homedir(),'Library','Application Support','Beepster','thread-prompts.json');
export const revision = text => createHash('sha256').update(text).digest('hex');
export async function readThreadPrompts(file=promptFile) {
  try { const d=JSON.parse(await readFile(file,'utf8')); if (!Array.isArray(d.prompts)) throw new Error('Invalid prompt store'); return d.prompts; }
  catch(e) { if(e.code==='ENOENT') return []; throw e; }
}
export async function promptViews(links,file=promptFile) {
  const rows=await readThreadPrompts(file);
  return links.filter(l=>l.enabled).map(l=>{
    const text=rows.find(r=>r.provider===l.provider && r.sessionKey===l.sessionKey && r.chatID===l.chatID)?.text || '';
    return {provider:l.provider,sessionKey:l.sessionKey,chatID:l.chatID,text,revision:revision(text)};
  });
}
export async function saveThreadPrompt(input,{file=promptFile,linksFile}={}) {
  await mkdir(path.dirname(file),{recursive:true,mode:0o700});
  const lock=await open(file+'.lock','wx',0o600).catch(()=>{throw new Error('PROMPT_BUSY');});
  try {
  const links=await readAgentLinks(linksFile);
  if (!links.some(l=>l.enabled && l.provider===input.provider && l.sessionKey===input.sessionKey && l.chatID===input.chatID)) throw new Error('PROMPT_LINK_CHANGED');
  if(typeof input.text!=='string' || input.text.length>12000 || input.text.includes('\0')) throw new Error('PROMPT_INVALID');
  const rows=await readThreadPrompts(file);
  const matches=r=>r.provider===input.provider && r.sessionKey===input.sessionKey;
  const old=rows.find(r=>matches(r)&&r.chatID===input.chatID)?.text || '';
  if(input.revision!==revision(old)) throw new Error('PROMPT_CHANGED');
  const next=rows.filter(r=>!matches(r));
  if(input.text.trim()) next.push({provider:input.provider,sessionKey:input.sessionKey,chatID:input.chatID,text:input.text});
  await mkdir(path.dirname(file),{recursive:true,mode:0o700});
  try { await copyFile(file,file+'.backup-'+randomUUID()); } catch(e) { if(e.code!=='ENOENT') throw e; }
  const temp=file+'.'+randomUUID()+'.tmp';
  await writeFile(temp,JSON.stringify({version:1,prompts:next},null,2),{mode:0o600,flag:'wx'}); await rename(temp,file);
  } finally { await lock.close(); await unlink(file+'.lock'); }
}
