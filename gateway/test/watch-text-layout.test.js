import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('watch messages measure whole lines and never draw wrapped emoji/text below the body', () => {
  const source = readFileSync(new URL('../../src/c/main.c', import.meta.url), 'utf8');
  // Execute the production C layout code with deterministic font metrics and a
  // recording graphics backend. A wrap on the last visible line used to paint
  // into the timestamp/next-row area before the next loop checked the height.
  const layout = source.slice(source.indexOf('static int inline_text_width('),
    source.indexOf('static void persist_current_theme('));
  const heightStart = source.indexOf('static int32_t message_content_height(');
  const heightCode = source.slice(heightStart, source.indexOf('static int16_t message_row_height(', heightStart));
  assert.doesNotMatch(source, /message_preview_height/);
  assert.match(source, /int sender_height = inline_line_height\(font_for_text\(message->sender\)\) \+ 9;/);
  const dir = mkdtempSync(join(tmpdir(), 'beepster-layout-'));
  try {
    writeFileSync(join(dir, 'test.c'), `
#include <assert.h>
#include <stdbool.h>
#include <stdint.h>
#include <string.h>
typedef int GFont;
typedef int GContext;
typedef struct { int16_t w, h; } GSize;
typedef struct { int16_t x, y; } GPoint;
typedef struct { GPoint origin; GSize size; } GRect;
#define GRect(x,y,w,h) ((GRect){{x,y},{w,h}})
#define GTextOverflowModeFill 0
#define GTextOverflowModeWordWrap 1
#define GTextAlignmentLeft 0
#define GCompOpSet 0
#define CHAT_EMOJI_SIZE 18
#define CHAT_EMOJI_COUNT 15
#define EMOJI_MARKER 0x1d
static struct { int muted; } s_theme;
static int s_chat_emoji_count = 1;
static void *s_chat_emoji_icons[15] = {(void *)1};
static int font_height = 23, draws, bottom_limit;
static int16_t s_inline_clip_height = INT16_MAX;
static GFont font_for_text(const char *text) { return font_height; }
static GFont theme_font(void) { return font_height; }
static GFont gothic_font(bool bold) { return font_height + 1; }
static bool has_non_ascii(const char *text) {
  for (; *text; text++) if ((unsigned char)*text >= 128) return true;
  return false;
}
static bool has_inline_emoji(const char *text) { return strchr(text, 0x1d) != 0; }
static GSize graphics_text_layout_get_content_size(const char *text, GFont font,
    GRect rect, int mode, int align) {
  int lines = 1, width = 0, max_width = 0;
  for (; *text; text++) {
    if (*text == '\\n') { lines++; width = 0; }
    else { width += 5; if (width > max_width) max_width = width; }
  }
  return (GSize){max_width, lines * font};
}
static void record(GRect rect) {
  assert(rect.origin.y + rect.size.h <= bottom_limit);
  draws++;
}
static void graphics_draw_text(GContext *ctx, const char *text, GFont font,
    GRect rect, int mode, int align, void *attrs) {
  assert(font == (has_non_ascii(text) ? gothic_font(false) : theme_font()));
  record(rect);
}
static void graphics_draw_bitmap_in_rect(GContext *ctx, void *bitmap, GRect rect) { record(rect); }
static void graphics_draw_round_rect(GContext *ctx, GRect rect, int radius) { record(rect); }
static void graphics_context_set_compositing_mode(GContext *ctx, int mode) {}
static void graphics_context_set_stroke_color(GContext *ctx, int color) {}
${layout}
typedef int MenuLayer;
typedef struct { char sender[8]; int16_t cached_text_height; int attachment_kind; } Message;
static int32_t s_expanded_text_height;
static int s_inline_media_state, s_media_height;
static void *s_media_bitmap;
#define INLINE_MEDIA_READY 1
static void *menu_layer_get_layer(MenuLayer *menu) { return menu; }
static GRect layer_get_bounds(void *layer) { return GRect(0,0,200,228); }
${heightCode}
static void check(const char *text, int width, int height, int origin, int expected) {
  GContext ctx = 0;
  draws = 0;
  bottom_limit = origin + height;
  layout_inline_emoji_text(&ctx, text, font_height, GRect(8, origin, width, height), true);
  assert(draws == expected);
  assert(layout_inline_emoji_text(0, text, font_height, GRect(0,0,width,30000), false) > height);
}
int main(void) {
  GContext ctx = 0;
  for (font_height = 14; font_height <= 38; font_height += 4) {
    int h = inline_line_height(font_height);
    Message message = {.sender="Sender"};
    const char *long_text="one\\ntwo\\nthree\\nfour\\nfive\\nsix\\nseven\\neight";
    int measured=layout_inline_emoji_text(0,long_text,theme_font(),GRect(0,0,184,30000),false);
    int inactive=message_content_height(0,&message,false,long_text);
    s_expanded_text_height=0;
    assert(inactive == message_content_height(0,&message,true,long_text));
    assert(inactive > 8*h); // no silent three-line truncation
    int body_end=inline_line_height(font_for_text(message.sender))+10+measured;
    assert(inactive-22 >= body_end); // timestamp clear cannot cover final line
    bottom_limit=body_end;
    layout_inline_emoji_text(&ctx,long_text,theme_font(),
      GRect(8,body_end-measured,184,measured),true);
    // Word, emoji, and overlong-word wraps all cross the last visible line.
    check("aaaa bbbb", 25, h, 0, 1);
    check("aaaa\\035A\\035", 25, h, 0, 1);
    check("abcdefgh", 15, h, 0, 3);
    // A bounded draw frame and negative origin used when scrolling a long body.
    check("aaaa\\ncccc\\neeee ffff", 25, 3*h, 0, 3);
    check("aaaa bbbb", 25, h, -h/2, 1);
    bottom_limit = h;
    draws = 0;
    draw_inline_token(&ctx, "don’t", theme_font(), GRect(0, 0, 100, h));
    assert(draws == 5);
    // A long offscreen body must not issue glyph draws outside its visible cell.
    s_inline_clip_height=h;
    bottom_limit=h;
    draws=0;
    layout_inline_emoji_text(&ctx,"one\\ntwo\\nthree\\nfour\\nfive",theme_font(),
      GRect(0,-2*h,184,5*h),true);
    assert(draws==1);
    s_inline_clip_height=INT16_MAX;
  }
  return 0;
}
`);
    execFileSync('cc', ['-std=c99', join(dir, 'test.c'), '-o', join(dir, 'test')]);
    assert.doesNotThrow(() => execFileSync(join(dir, 'test')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
