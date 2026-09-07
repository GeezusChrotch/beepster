// Rebuild watch fallback assets from the same atlas/order as live phone replies.
import {readFile,writeFile} from 'node:fs/promises';
import {deflateSync} from 'node:zlib';
import {renderEmojiAtlas} from '../gateway/src/emoji-assets.js';
const source=await readFile(new URL('../src/pkjs/index.js',import.meta.url),'utf8');
const section=source.match(/var DEFAULT_EMOJI_REPLIES = \[([\s\S]*?)\];/)[1];
const keys=[...section.matchAll(/key:'([^']+)'/g)].map(match=>match[1]);
function crc(bytes){let n=0xffffffff;for(const byte of bytes){n^=byte;for(let bit=0;bit<8;bit++)n=(n>>>1)^((n&1)?0xedb88320:0);}return (n^0xffffffff)>>>0;}
function chunk(type,data){const name=Buffer.from(type),length=Buffer.alloc(4),check=Buffer.alloc(4);length.writeUInt32BE(data.length);check.writeUInt32BE(crc(Buffer.concat([name,data])));return Buffer.concat([length,name,data,check]);}
function png(atlas){
  const header=Buffer.alloc(13);header.writeUInt32BE(atlas.width);header.writeUInt32BE(atlas.height,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc((atlas.width*4+1)*atlas.height);
  for(let y=0;y<atlas.height;y++)for(let x=0;x<atlas.width;x++){
    const color=atlas.pixels[y*atlas.width+x],i=y*(atlas.width*4+1)+1+x*4;
    rows.set([((color>>4)&3)*85,((color>>2)&3)*85,(color&3)*85,((color>>6)&3)*85],i);
  }
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
await writeFile(new URL('../resources/images/emoji-atlas.png',import.meta.url),png(renderEmojiAtlas(keys,26,5)));
await writeFile(new URL('../resources/images/emoji-chat-default.png',import.meta.url),png(renderEmojiAtlas(keys.slice(0,12),24,4)));
