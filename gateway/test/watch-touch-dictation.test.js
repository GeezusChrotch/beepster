import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('native focused-message activation dictates only ordinary ready rows, never approvals or retries',()=>{
 const source=readFileSync(new URL('../../src/c/main.c',import.meta.url),'utf8');
 const start=source.indexOf('static void message_touch_selected(');
 const body=source.slice(start,source.indexOf('#if defined(PBL_TOUCH)',start));
 assert.match(source,/\.select_click = message_touch_selected/);
 assert.doesNotMatch(source,/tap_recognizer_create\(message_touch_tap/);
 const dir=mkdtempSync(join(tmpdir(),'beepster-menu-tap-'));
 try{
 writeFileSync(join(dir,'test.c'),`
#include <stdbool.h>
#include <stddef.h>
#include <assert.h>
typedef void MenuLayer; typedef struct {int section,row;} MenuIndex;
#define VIEW_READY 0
static int s_message_state,s_reply_state,s_message_count=3,calls;
static char s_active_chat_id[2]="x";
static bool approval;
static struct {int is_approval;} s_messages[3]={{0},{1},{4}};
static bool selected_message_is_approval(void){return approval;}
static void thread_dictate(void*a,void*b){calls++;}
${body}
int main(void){
 MenuIndex index={0,0};message_touch_selected(NULL,&index,NULL);assert(calls==1);
 index.row=1;message_touch_selected(NULL,&index,NULL);index.row=2;message_touch_selected(NULL,&index,NULL);index.row=3;message_touch_selected(NULL,&index,NULL);assert(calls==1);
 index.row=0;approval=true;message_touch_selected(NULL,&index,NULL);approval=false;s_reply_state=1;message_touch_selected(NULL,&index,NULL);s_reply_state=0;s_message_state=1;message_touch_selected(NULL,&index,NULL);assert(calls==1);
 s_message_state=0;s_active_chat_id[0]=0;message_touch_selected(NULL,&index,NULL);assert(calls==1);
 s_active_chat_id[0]='x';message_touch_selected(NULL,&index,NULL);assert(calls==2);
}
`);
 execFileSync('cc',[join(dir,'test.c'),'-o',join(dir,'test')]);execFileSync(join(dir,'test'));
 }finally{rmSync(dir,{recursive:true,force:true});}
});
