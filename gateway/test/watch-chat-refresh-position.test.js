import test from 'node:test';
import {readFileSync, mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('read-status refresh retains selected chat and viewport, including reordered rows', () => {
  const source = readFileSync(new URL('../../src/c/main.c', import.meta.url), 'utf8');
  const start = source.indexOf('  if (strcmp(command->value->cstring, "chats_ready") == 0)');
  const code = source.slice(start, source.indexOf('\nif (strcmp(command->value->cstring, "chat")', start));
  const dir = mkdtempSync(join(tmpdir(), 'beepster-refresh-position-'));
  try {
    writeFileSync(join(dir, 'test.c'), `
#include <stdbool.h>
#include <string.h>
#include <assert.h>
#include <stdint.h>
typedef struct {int x,y;} GPoint;
#define GPoint(x,y) ((GPoint){x,y})
#define GPointZero GPoint(0,0)
typedef struct {int section,row;} MenuIndex;
typedef int MenuLayer; typedef int ScrollLayer;
typedef int MenuRowAlign;
enum {MenuRowAlignNone,MenuRowAlignTop,MenuRowAlignBottom,MenuRowAlignCenter,VIEW_READY,VIEW_EMPTY};
enum {MESSAGE_KEY_TOTAL,MESSAGE_KEY_HAS_MORE,MESSAGE_KEY_STATE,MESSAGE_KEY_INDEX};
typedef struct {char *cstring; int int32;} Value;
typedef struct {Value *value;} Tuple;
static Value vals[4]; static Tuple tuples[4];
static Tuple *dict_find(void *i,int key){return &tuples[key];}
typedef struct {char id[32];int unread;} Chat;
static Chat s_chats[8],s_incoming_chats[8];
static int s_chat_capacity=8,s_chat_count=4,s_incoming_chat_count=4,s_chat_state;
static unsigned s_incoming_chat_mask=15;
static bool s_restoring_chat_page,s_chat_page_loading,s_has_older_chats,s_has_newer_chats;
static char s_pending_pin_chat_id[32];
static int menu,selected_row; static MenuLayer *s_chat_menu=&menu;
static void *s_status_layer,*s_main_window; static int offset;
static void main_clicks(void){}
static void cancel_load_watchdog(void){}
static void vibes_double_pulse(void){}
static void set_status(void*a,int b,bool c){}
static void copy_text(char*a,int n,const char*b){snprintf(a,n,"%s",b);}
static MenuIndex menu_layer_get_selected_index(MenuLayer*m){return (MenuIndex){0,selected_row};}
static ScrollLayer *menu_layer_get_scroll_layer(MenuLayer*m){return m;}
static GPoint scroll_layer_get_content_offset(ScrollLayer*s){return GPoint(0,offset);}
static void scroll_layer_set_content_offset(ScrollLayer*s,GPoint p,bool a){offset=p.y;}
static int chat_row_height(MenuLayer*m,MenuIndex*i,void*c){return 60+(s_chats[i->row].unread?16:0);}
static void menu_layer_reload_data(MenuLayer*m){offset=0;}
static void menu_layer_set_selected_index(MenuLayer*m,MenuIndex i,int align,bool a){selected_row=i.row;offset=-i.row*60;}
static void window_set_click_config_provider(void*w,void(*f)(void)){}
static void receive(void){Value cv={.cstring="chats_ready"};Tuple ct={&cv};Tuple *command=&ct;void *iterator=0;
${code}
}
static void setup(char*mode){
 for(int i=0;i<4;i++){tuples[i].value=&vals[i];snprintf(s_chats[i].id,32,"chat%d",i);s_chats[i].unread=0;s_incoming_chats[i]=s_chats[i];}
 vals[0].int32=4;vals[1].int32=3;vals[2].cstring=mode;vals[3].int32=0;
 s_chat_count=4;selected_row=2;offset=-95;
}
int main(void){
 setup("refresh");receive();assert(selected_row==2&&offset==-95);
 setup("refresh");s_chats[0].unread=1;receive();assert(selected_row==2&&offset==-79);
 setup("refresh");s_incoming_chats[1]=s_chats[2];s_incoming_chats[2]=s_chats[1];
 receive();assert(selected_row==1&&offset==-35);
 setup("refresh");strcpy(s_incoming_chats[2].id,"replacement");receive();assert(selected_row==2&&offset==-95);
 setup("initial");receive();assert(selected_row==0&&offset==0);
 setup("older");vals[3].int32=1;receive();assert(selected_row==1);
}
`.replace('#include <stdbool.h>', '#include <stdio.h>\n#include <stdbool.h>'));
    execFileSync('cc', ['-fsanitize=address,undefined', join(dir,'test.c'), '-o', join(dir,'test')]);
    execFileSync(join(dir,'test'));
  } finally { rmSync(dir, {recursive:true, force:true}); }
});
