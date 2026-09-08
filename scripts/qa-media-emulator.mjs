// Isolated, synthetic-only visual QA. Never connects to the phone or live gateway.
// Usage: node scripts/qa-media-emulator.mjs /path/to/SDK/version
import {spawn, execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, resolve} from 'node:path';
import net from 'node:net';
import omggif from '../gateway/node_modules/omggif/omggif.js';
import {decodeGIF} from '../gateway/src/gif-preview.js';
import {BeeperClient} from '../gateway/src/beeper-client.js';

const sdk = process.argv[2]; if (!sdk) throw new Error('SDK directory required');
const output = mkdtempSync(join(tmpdir(),'beepster-media-qa-'));
const firmware = join(sdk,'sdk-core/pebble/emery/qemu');
writeFileSync(join(output,'flash.bin'),execFileSync('bzip2',['-dc',join(firmware,'qemu_spi_flash.bin.bz2')],{maxBuffer:32*1024*1024}));
async function freePort() {const server=net.createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));return port;}
const port=await freePort(), monitor=await freePort();
const emulator=spawn(join(sdk,'toolchain/bin/qemu-pebble'),['-rtc','base=localtime','-serial','null','-serial',`tcp:127.0.0.1:${port},server=on,wait=off`,
  '-serial','null','-kernel',join(firmware,'qemu_micro_flash.bin'),'-monitor',`tcp:127.0.0.1:${monitor},server=on,wait=off`,
  '-machine','pebble-emery','-cpu','cortex-m33','-drive',`if=mtd,format=raw,file=${join(output,'flash.bin')}`,'-audio','driver=none,id=audio0','-display','none'],{stdio:'ignore'});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const cli=(command,args=[])=>execFileSync('pebble',[command,'--qemu',`127.0.0.1:${port}`,...args],{timeout:20000,maxBuffer:1024*1024});
function send(strings={},ints={},bytes) {
  const args=[];
  if(Object.keys(strings).length)args.push('--string',...Object.entries(strings).map(([k,v])=>`${k}=${v}`));
  if(Object.keys(ints).length)args.push('--int',...Object.entries(ints).map(([k,v])=>`${k}=${v}`));
  if(bytes)args.push('--bytes',`28=${bytes.toString('hex')}`);
  cli('send-app-message',args);
}
async function screenshot(name) {
  const path=join(output,name+'.ppm');
  await new Promise((resolve,reject)=>{
    const s=net.connect(monitor,'127.0.0.1');let sent=false;
    s.on('error',reject);s.on('data',()=>{if(!sent){sent=true;s.write(`screendump ${path}\n`);setTimeout(()=>{s.end();resolve();},200);}});
    s.setTimeout(2000,()=>{s.destroy();reject(new Error('Monitor timeout'));});
  });
  execFileSync('sips',['-s','format','png',path,'--out',join(output,name+'.png')]);
}
async function show(preview,title) {
  send({0:'messages_start'});
  send({0:'message',10:'Me',11:'Neighboring text',12:'11:59',30:'neighbor'},{3:0,4:2});
  send({0:'message',10:'Avery',11:title,12:'12:00',30:'fixture',23:'fixture-media'},{3:1,4:2,24:preview.kind==='gif'?2:3});
  send({0:'messages_ready'},{4:2,3:1});
  send({0:'message_detail_start',30:'fixture'},{4:Buffer.byteLength(title)});
  send({0:'message_detail_chunk',30:'fixture',31:title});
  send({0:'message_detail_end',30:'fixture'});
  await wait(350);
  const pixels=preview.framePixels||preview.pixels;
  send({0:'media_start',23:'fixture-media'},{25:preview.width,26:preview.height,29:pixels.length,24:preview.kind==='gif'?2:3,39:preview.frames||1});
  for(let offset=0;offset<pixels.length;offset+=512)send({0:'media_chunk',23:'fixture-media'},{27:offset},pixels.subarray(offset,offset+512));
  send({0:'media_end',23:'fixture-media'});
}
try {
  await wait(1800);cli('install',[resolve('build/beepster.pbw')]);
  send({0:'chats_start'});send({0:'chat',5:'fixture-chat',6:'Media test',9:'Telegram'},{3:0,4:1});send({0:'chats_ready'},{4:1});
  cli('emu-button',['click','select']);await wait(300);
  const buffer=Buffer.alloc(30000),writer=new omggif.GifWriter(buffer,72,48,{palette:[0xffffff,0xff0000,0x0000ff,0x00ff00],loop:0});
  for(let i=0;i<6;i++){
    const pixels=new Uint8Array(72*48);
    for(let y=8;y<40;y++)for(let x=i*8;x<i*8+24;x++)pixels[y*72+x]=(i%3)+1;
    writer.addFrame(0,0,72,48,pixels,{delay:25});
  }
  const gif={...decodeGIF(buffer.subarray(0,writer.end())),kind:'gif'};
  await show(gif,'A moving GIF');await wait(90);await screenshot('gif-a');await wait(300);await screenshot('gif-b');
  const photoPixels=Buffer.alloc(180*180);
  for(let y=0;y<180;y++)for(let x=0;x<180;x++)photoPixels[y*180+x]=0xc0|((x/30|0)%4<<4)|((y/30|0)%4<<2);
  await show({width:180,height:180,pixels:photoPixels,kind:'image'},'Square photo');await screenshot('photo-square');
  cli('emu-button',['click','down']);cli('emu-button',['click','down']);await screenshot('photo-square-scrolled');
  const client=new BeeperClient({baseURL:'http://127.0.0.1:1',accessToken:'unused'});
  const attachment=client.rememberYouTube({id:'public-video',text:'https://youtu.be/dQw4w9WgXcQ'});
  await show(await client.getAttachmentPreview(attachment.id),'YouTube thumbnail');await screenshot('youtube');
  console.log(JSON.stringify({output,gifFrames:gif.frames,gifBytes:gif.framePixels.length}));
} finally { emulator.kill('SIGTERM'); }
