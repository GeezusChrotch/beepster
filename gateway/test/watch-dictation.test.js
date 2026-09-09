import test from 'node:test';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';

test('dictation owns text, prevents duplicate starts, defers send and never changes recipients', () => {
  const source=readFileSync(new URL('../../src/c/main.c',import.meta.url),'utf8');
  const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
  const dir=mkdtempSync(join(tmpdir(),'beepster-dictation-'));
  try {
    writeFileSync(join(dir,'test.c'), `
#include <assert.h>
#include <stdbool.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>
typedef int DictationSession; typedef int DictationSessionStatus;
typedef int AppTimer; typedef int TextLayer; typedef int Window;
typedef void *ClickRecognizerRef;
#define REPLY_TEXT_CAPACITY 512
#define STATUS_TEXT_CAPACITY 192
#define DictationSessionStatusSuccess 0
#define DictationSessionStatusFailureTranscriptionRejected 1
#define VIEW_READY 0
#define VIEW_REPLY_RETRYABLE 1
#define VIEW_REPLY_SENDING 2
#define VIEW_REPLY_PENDING 3
#define APP_LOG(...) ((void)0)
static int starts,sends,retries,syncs,start_result;
static bool s_dictation_active;
static DictationSession session,*s_dictation_session=&session;
static AppTimer *s_dictation_send_timer;
static char s_reply_text[512],s_reply_request_id[48],s_dictation_chat_id[128],s_active_chat_id[128]="chat";
static char s_reply_approval_id[128];
static int s_pending_quick_reply_index,s_reply_state;
static Window w,*s_message_window=&w,*s_reply_window;
static TextLayer a,b,c,d,*s_message_status_layer=&a,*s_reply_status_layer=&b,*s_media_status_layer=&c;
static char buffers[4][192],(*s_status_text)[192]=buffers;
static const char *displayed[4];
static void text_layer_set_text(TextLayer *l,const char *s){displayed[l==&a?0:l==&b?1:l==&c?2:3]=s;}
static void *text_layer_get_layer(TextLayer*l){return l;}
static void layer_set_hidden(void*l,bool h){}
static Window *window_stack_get_top_window(void){return &w;}
static void copy_text(char*d,size_t n,const char*s){snprintf(d,n,"%s",s?s:"");}
static void schedule_view_sync(void){syncs++;}
static void send_reply_to_phone(void){sends++;}
static void new_reply_request_id(void){strcpy(s_reply_request_id,"new-request");}
static void reply_show_status(const char*s){}
static void retry_reply(ClickRecognizerRef r,void*c){retries++;}
static void cancel_reply_return_timer(void){}
static DictationSessionStatus dictation_session_start(DictationSession*s){starts++;return start_result;}
static AppTimer *app_timer_register(int ms,void(*cb)(void*),void*c){return (AppTimer*)1;}
${section('static void set_owned_status_text(', 'static GColor sender_color(')}
${section('static void dictation_send_ready(', 'static bool request_message_content(')}
${section('static void thread_dictate(', 'static void retry_reply(ClickRecognizerRef recognizer, void *context) {')}
int main(void){
 char *temporary=malloc(32);strcpy(temporary,"Phone error");
 set_owned_status_text(&a,temporary);free(temporary);
 assert(strcmp(displayed[0],"Phone error")==0);
 set_owned_status_text(&b,"Other error");assert(strcmp(displayed[0],"Phone error")==0);
 thread_dictate(NULL,NULL);thread_dictate(NULL,NULL);assert(starts==1&&s_dictation_active);
 char *transcript=malloc(32);strcpy(transcript,"Test reply");
 dictation_callback(&session,0,transcript,NULL);free(transcript);
 assert(sends==0&&s_dictation_send_timer&&strcmp(s_reply_text,"Test reply")==0);
 dictation_callback(&session,0,"Duplicate",NULL);assert(strcmp(s_reply_text,"Test reply")==0);
 thread_dictate(NULL,NULL);assert(starts==1);
 dictation_send_ready(NULL);assert(sends==1&&!s_dictation_active);
 thread_dictate(NULL,NULL);dictation_callback(&session,0,"Wrong recipient",NULL);
 strcpy(s_active_chat_id,"different");dictation_send_ready(NULL);assert(sends==1);
 assert(!s_reply_text[0]&&!s_reply_request_id[0]);
 s_reply_request_id[0]=0;thread_dictate(NULL,NULL);
 dictation_callback(&session,1,NULL,NULL);assert(!s_dictation_active&&sends==1);
 start_result=5;thread_dictate(NULL,NULL);assert(!s_dictation_active);
 s_reply_state=VIEW_REPLY_SENDING;int before=starts;thread_dictate(NULL,NULL);assert(starts==before);
 return 0;
}
`);
    execFileSync('cc',['-fsanitize=address,undefined',join(dir,'test.c'),'-o',join(dir,'test')]);
    execFileSync(join(dir,'test'));
  } finally {rmSync(dir,{recursive:true,force:true});}
});
