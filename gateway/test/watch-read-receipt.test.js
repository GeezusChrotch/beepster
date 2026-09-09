import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {tmpdir} from 'node:os';

test('watch marks only ready newest messages in the visible chat, with busy retry',()=>{
 const source=readFileSync(new URL('../../src/c/main.c',import.meta.url),'utf8');
 const code=source.slice(source.indexOf('static void sync_read_receipt('),source.indexOf('static void sync_visible_view('));
 const dir=mkdtempSync(join(tmpdir(),'beepster-read-'));
 try{writeFileSync(join(dir,'test.c'),`
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#include <assert.h>
typedef int AppTimer;typedef int Window;typedef int DictionaryIterator;
enum{VIEW_READY=1,APP_MSG_OK=0,MESSAGE_KEY_COMMAND,MESSAGE_KEY_CHAT_ID,MESSAGE_KEY_MSG_ID};
static bool s_dictation_active;
static AppTimer *s_read_sync_timer;static Window window,other,*s_message_window=&window,*top=&window;
static int s_message_state=VIEW_READY,s_message_count=2,sends;static bool s_message_follow_newest=true,busy;
static char s_active_chat_id[]="chat",last[50];
static struct {char id[40];bool is_approval;} s_messages[2]={ {"seen",false},{"approval",true} };
static Window *window_stack_get_top_window(void){return top;}
static int app_message_outbox_begin(DictionaryIterator **i){static int iterator;*i=&iterator;return busy?1:0;}
static int app_message_outbox_send(void){sends++;return 0;}
static void dict_write_cstring(DictionaryIterator *i,int key,const char*v){if(key==MESSAGE_KEY_MSG_ID)strcpy(last,v);}
static AppTimer *app_timer_register(int ms,void(*cb)(void*),void*c){assert(ms==500);return (AppTimer*)1;}
${code}
int main(){top=&other;sync_read_receipt(NULL);assert(!sends);
top=&window;s_message_state=0;sync_read_receipt(NULL);assert(!sends);
s_message_state=VIEW_READY;s_message_follow_newest=false;sync_read_receipt(NULL);assert(!sends);
s_message_follow_newest=true;busy=true;sync_read_receipt(NULL);assert(!sends&&s_read_sync_timer);
busy=false;sync_read_receipt(NULL);assert(sends==1&&strcmp(last,"seen")==0);
s_messages[0].is_approval=true;sync_read_receipt(NULL);assert(sends==1);return 0;}
`);execFileSync('cc',['-fsanitize=address,undefined',join(dir,'test.c'),'-o',join(dir,'test')]);execFileSync(join(dir,'test'));}
 finally{rmSync(dir,{recursive:true,force:true});}
});
